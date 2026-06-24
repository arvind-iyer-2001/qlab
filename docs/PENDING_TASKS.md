# qLab — Pending Tasks

_Compiled 2026-06-19 from the `staging` branch, the session handoff docs, `FUTURE.md`, and direct code verification. Status legend: ❌ confirmed unfixed in code · ⚙️ config/external · 🔬 needs live verification · 📦 ops/release · 🧹 hygiene · 🗺️ roadmap (not a blocker)._

Branch state at compile time: `main` is **16 commits behind `staging`**; no open promotion PR.

---

## 1. Code fixes — critical backend blockers

All five verified present and unfixed on `staging`.

| # | Task | Location | Status |
|---|------|----------|--------|
| 1.1 | **MongoDB user-registration index bug** — unique sparse index on `nickname` + new users inserted with `"nickname": None` means only one null-nickname user can register. Switch to a partial index (filter for string type) or stop inserting `nickname` in `get_or_create`/`upsert`. | `api/main.py:60`, `api/services/users.py` | ✅ partial index on `{nickname:{$type:string}}` (`main.py`, drops old `nickname_1` first) |
| 1.2 | **Sandbox bypass — namespace isolation** — user code runs in the global namespace, so it can read `expected` outputs or `exit` early with fake JSON. Run user code in an isolated namespace (`.user`) and hide internal assertion variables. | `api/services/judge.py:133` | ✅ grading wrapped in a lambda (expected/actual are locals, unreadable + unenumerable by value'd user code); submission runs in `.user`; reference `func` deleted pre-eval. Residual: fake-exit JSON / read0 of script needs separate-process grading (noted in code). |
| 1.3 | **Sandbox bypass — container limits** — add `--network none`, `--memory`, `--cpus` to the docker invocation. | `api/services/judge.py:73` (`_docker_q_cmd`) | ✅ `--network none` + `QLAB_DOCKER_MEMORY`/`QLAB_DOCKER_CPUS` caps |
| 1.4 | **Docker container leak on timeout** — `proc.kill()` kills the local `docker` CLI but leaves the container running on the daemon. Assign a unique `--name` and issue `docker kill <name>` in the `TimeoutError` block. | `api/services/judge.py:209`, `api/services/runner.py:146` | ✅ unique `--name` + `_docker_kill` on timeout (judge + runner) |
| 1.5 | **Nickname not propagated to submissions** — changing a nickname leaves stale handles on the leaderboard. Atomically update the `submissions` collection on nickname change. | `api/services/users.py` | ✅ `set_nickname` rewrites submission handles |
| 1.6 | **Pydantic regex typo** — single-param validation uses `s*` instead of `\s*`. | `api/models.py:52` | ✅ |

---

## 2. Config & operations — external dependencies

| # | Task | Detail | Status |
|---|------|--------|--------|
| 2.1 | **Enable `user.deleted` / `user.updated` in Clerk webhooks** | Clerk dashboard endpoint isn't subscribed to `user.deleted`, so the delete-cascade never fires in prod. Config, not code — the anonymize code is proven correct. Enable both events on the Svix endpoint. | ⚙️ |
| 2.2 | **`.env.example` parity** | Verify new vars (`QLAB_DOCKER_IMAGE`, `QLAB_LICENSE_B64`, and any `QLAB_JWT` used by smoke scripts) are documented in the template. | ✅ added `QLAB_DOCKER_MEMORY`, `QLAB_DOCKER_CPUS`, `QLAB_ALLOW_LOCAL_Q` |

---

## 3. Verification & testing targets — not yet exercised live

| # | Task | Detail | Status |
|---|------|--------|--------|
| 3.1 | **License expiration remapping** | Confirm an expired/invalid license from the runner or judge triggers the friendly `friendly_license_error` (needs an actually-expired license in q/docker). | ✅ verified live 2026-06-25 — junk-license docker run emits `license error: kc.lic`; `run_code` (/execute path) and `run_judge` both surface `LICENSE_ERROR_MESSAGE`; genuine `'type`/`'length` errors are NOT remapped |
| 3.2 | **`/execute` multi-statement eval** | Via the frontend Test tab: multiple top-level q statements run sequentially and the final expression evaluates. Verified earlier against a bare q binary, not the running stack. | ✅ verified live 2026-06-25 through `run_code` against the docker sandbox — 4 sequential statements → final expr 60; def+call across statements → 49; multi-line `{}` block (brace at col 0) stays one statement → 42; q error in final expr surfaces with ok=False |
| 3.3 | **Onboarding flow** | Fresh local signup routes to `/profile/setup` before `/problems`; direct nav to `/problems` with no nickname bounces to setup. | ✅ verified 2026-06-25 — backend contract live (fresh `GET /users/me` → `nickname:null`; after PATCH → set); both gates branch on `!user.nickname`: `/auth/callback` one-shot redirect + app-wide `OnboardingGate` (mounted in `Providers`, covers `/problems`). Not exercised: live browser signup through Clerk |
| 3.4 | **`DELETE /users/me/license` cycle** | Full add → use → delete license round-trip through the running stack. | ✅ verified live 2026-06-25 — full HTTP cycle (real Mongo Atlas + docker /execute, only JWT signature stubbed): PATCH adds → GET has_license=true → /execute runs in docker w/ per-user license (→42) → bad per-user license yields friendly error → DELETE unsets → /execute falls back to host license. Test user cleaned up |

---

## 4. Release / ops — additional (not in original list)

| # | Task | Detail | Status |
|---|------|--------|--------|
| 4.1 | **Raise staging→main promotion PR** | PR #8 already merged; #9 (onboarding) and #10 (skills) have since landed on `staging`. `main` is 16 commits behind with no open PR — everything since #8 is unreleased. The PR body must list onboarding + skills, not only the 5 resilience fixes. | ✅ PR #12 merged 2026-06-23 (promoted #10 skills + #11 backend blockers) |
| 4.2 | **Update `PRODUCTION.md`** | Predates the kdb-x docker judge and the license-in-env model; deployment story no longer matches the architecture. | 📦 |
| 4.3 | **Production Clerk instance + deploy** | Only `sk_test_`/`pk_test_` keys exist; no prod instance, no deployment configured. | 📦 |

---

## 5. Security — additional (adjacent to §1, separate work)

| # | Task | Detail | Status |
|---|------|--------|--------|
| 5.1 | **Harden `/execute` like the judge** | `runner.py` shares `_docker_q_cmd`, so the container leak (1.4) **and** missing `--network none`/`--memory`/`--cpus` (1.3) apply to `/execute` too. Fix both paths, not just `/submissions`. | ✅ shared `_docker_q_cmd` hardened (covers both); `runner.py` gets the timeout kill + fail-closed guard too |
| 5.2 | **Rate limiting** | No limits on `POST /submissions` or `POST /execute` — runaway/abuse vector on the same surface as the sandbox bypass. | ❌ |
| 5.3 | **Fail-closed sandbox** | Judge/runner silently fell back to the **unsandboxed** local q binary whenever `QLAB_DOCKER_IMAGE` was unset — one missing env var = untrusted code on the host. Now requires the container; local q only runs behind explicit `QLAB_ALLOW_LOCAL_Q=1` (dev). | ✅ |

---

## 6. Correctness — additional

| # | Task | Detail | Status |
|---|------|--------|--------|
| 6.1 | **Home-screen stub data** | The target endpoints now exist (`api/routers/stats.py`: `/submissions/recent`, `/leaderboard/global`, `/stats/weekly`). Verify `web/app/page.tsx` consumes them instead of the `home-stubs` fake data. | 🔬 |

---

## 7. Quality / ops debt — additional

| # | Task | Detail | Status |
|---|------|--------|--------|
| 7.1 | **Frontend + VS Code extension tests** | Only backend pytest exists; no test harness for Next.js or the extension. | 🧹 |
| 7.2 | **Structured logging + request IDs** | Currently bare `print` / default uvicorn logs. | 🧹 |
| 7.3 | **Long-lived Clerk JWT template** | ~60s token expiry forces constant re-auth (the churn that drove `qlab-smoke`'s token resolution). Add a Clerk dashboard JWT template. | 🧹 |

---

## 8. Doc / tree hygiene — additional

| # | Task | Detail | Status |
|---|------|--------|--------|
| 8.1 | **Stale handoff** | `docs/superpowers/specs/2026-06-18-resilience-fixes-handoff.md:4` still says "not yet implemented" — all five are merged. | 🧹 |
| 8.2 | **Uncommitted artifacts** | `docs/qlab-chat-history.md`, `.coverage`, and `.agents/` are untracked. Decide commit vs gitignore vs delete. | 🧹 |

---

## 9. Roadmap — backlog, not blockers

From `FUTURE.md` — deliberate future scope, listed so it isn't mistaken for forgotten work:

- Capstone tracks (partitioned DBs, joins under load, tickerplant, optimization gauntlets, schema design)
- More problems + a problem-authoring CLI (`qlab new-problem <slug>`)
- Problem tags/topics, difficulty calibration from solve rate
- Global stats / leaderboard page; auto-refresh leaderboard feedback
- Mobile / narrow-viewport layout
- Observability dashboard (throughput, judge latency, Mongo query times)
- VS Code: Run Test keybinding, sidebar filter, API health indicator, panel restore, `qlab.signOut`
- Editorial/reference solutions populated for every problem
