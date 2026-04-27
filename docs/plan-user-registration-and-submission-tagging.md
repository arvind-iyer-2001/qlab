# Plan: User Registration and Submission Tagging

**Goal:** Create a MongoDB user record the moment someone signs up or signs in via Clerk, and tag all submissions to that user's stored profile rather than a client-supplied handle.

---

## Problem with the current state

- `POST /submissions` accepts a `handle` field in the request body. Any client can pass any string — there is no guarantee the handle corresponds to the authenticated user.
- The `users` collection is only populated lazily when `GET /users/me` is called, and only with empty `display_name` and `email` fields (we never fetch real user data from Clerk).
- `user_id` is correctly set from the JWT `sub` claim, but `handle` on the leaderboard is still whatever the client sent.

---

## Approach

### Part 1 — Populate the users collection via Clerk webhooks

Clerk fires webhook events (`user.created`, `user.updated`) to a URL we register in the Clerk dashboard. Our FastAPI endpoint receives these events, verifies the Svix signature, and upserts the user into MongoDB with their real name and email.

This is the production-correct approach — it means user data is always fresh (e.g. if someone updates their name in Clerk, the webhook fires and MongoDB is updated). It also decouples user creation from the first API call.

**New endpoint:** `POST /webhooks/clerk`

- Verifies the `svix-signature` header using `CLERK_WEBHOOK_SECRET` (separate from `CLERK_SECRET_KEY` — generated in the Clerk dashboard under Webhooks)
- Handles `user.created` and `user.updated` events
- Upserts into the `users` collection: `clerk_user_id`, `email` (primary email address), `display_name` (first + last name from Clerk), `username` (Clerk username if set, else `None`), `avatar_url`, `created_at`
- Returns `{"status": "ok"}` — Clerk expects a 2xx within 5 seconds

**New dependency:** `svix` Python package (Clerk's official webhook verification library)

**New env var:** `CLERK_WEBHOOK_SECRET=whsec_...` (from Clerk dashboard → Webhooks → signing secret)

#### Local development

The webhook endpoint must be publicly reachable for Clerk to call it. Use `ngrok` during local development:

```bash
ngrok http 8000
# Copy the https URL, e.g. https://abc123.ngrok.io
# Register https://abc123.ngrok.io/webhooks/clerk in Clerk dashboard
```

Subscribe to events: `user.created`, `user.updated`.

---

### Part 2 — Tag submissions to the stored user profile

Once the `users` collection has real data, submissions should use it.

**Changes to `POST /submissions`:**

1. Remove `handle` from `SubmitRequest` — or keep it as an optional field but ignore it server-side
2. After verifying the JWT, look up the user in MongoDB by `user_id = claims["sub"]`
3. Use the stored `display_name` (or `username` if set) as the handle on the submission
4. If the user is not found in MongoDB (webhook hasn't fired yet — edge case on first ever login before webhook delivery), fall back to `user_id` as the handle

**Leaderboard impact:** Existing submissions in MongoDB have whatever handle was passed by the client. New submissions will have the real display name. No migration needed — the leaderboard is a live query so it will show the real name going forward for new submissions.

---

### Part 3 — Handle the first login before webhook fires

There is a race condition on the very first login: the user signs in, the VS Code extension immediately submits a solution, but the `user.created` webhook hasn't been delivered yet (Clerk webhooks have a small delivery delay). The submission handler will not find the user in MongoDB.

**Mitigation:** In the submission handler's user lookup, if the user is not found:
- Do not block the submission — let it proceed
- Use `user_id` (the Clerk `sub` claim) as the fallback handle
- Log a warning

This is acceptable for now. A proper fix would be to eagerly create the user record on `GET /users/me` by calling the Clerk REST API (`GET https://api.clerk.com/v1/users/{user_id}` with `CLERK_SECRET_KEY`) — but that adds latency and a Clerk API dependency to the hot path.

---

## File changes

| File | Change |
|---|---|
| `api/routers/webhooks.py` | New — `POST /webhooks/clerk` endpoint |
| `api/main.py` | Register webhooks router |
| `api/services/users.py` | Update `upsert()` to accept all Clerk fields |
| `api/routers/submissions.py` | Look up user from DB, use stored handle |
| `api/models.py` | Make `handle` optional in `SubmitRequest` |
| `api/requirements.txt` | Add `svix` |
| `.env` / `.env.example` | Add `CLERK_WEBHOOK_SECRET` |

---

## What this does NOT include

- A UI for users to change their display name or set a custom handle — that belongs in the web frontend (future phase)
- Migrating existing submissions to real handles — not worth the complexity; old submissions keep whatever handle they have
- Deleting users when a `user.deleted` webhook fires — deferred; soft-delete or just leave the record

---

## Testing

**Webhook endpoint:**
- Use the Clerk dashboard's "Send test webhook" feature to fire `user.created` against the ngrok URL
- Verify the user document appears in MongoDB Atlas with real name and email

**Submission tagging:**
- Submit a solution via the VS Code extension after signing in
- Check MongoDB Atlas `submissions` collection — `handle` should match the user's Clerk display name, `user_id` should match the Clerk `sub`

**Race condition fallback:**
- Manually delete the user document from MongoDB, then submit — confirm submission still succeeds with `user_id` as fallback handle
