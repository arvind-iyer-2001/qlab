# Web Theme Unification — Design Spec

**Date:** 2026-05-07
**Status:** Approved (pending writing-plans handoff)

## Problem

The home page (`/`) was rewritten with a polished theme — `bg-zinc-950`, emerald-500 accents, monospace flourishes, and Aceternity primitives (BackgroundBeams, BentoGrid, TypewriterEffect). The rest of the web app didn't follow:

- `/problems` and `components/ProblemsTable.tsx` use inline styles on a Leetcode-style orange palette (`#1a1a1a` bg, `#ffa116` accent), driven by tokens in `tailwind.config.js` (`bg`, `panel`, `accent`).
- `/profile` and `/profile/setup` use generic light styles — blue links, gray text, no project palette at all.
- Auth pages render Clerk components without any theme override, so they don't read as "qLab".
- No shared layout shell. Each page rebuilds its own header inline.

The result: two design systems coexist, and the app feels fragmented after the home page.

## Goals

1. Propagate the home theme's palette and primitives so the in-scope pages feel like the same product.
2. Retire the orange `#ffa116` accent and the legacy `bg`/`panel`/`accent` Tailwind tokens.
3. Introduce a small set of shared UI primitives so future pages don't reinvent them.

## Non-goals

- The problem-solving page (`/problems/[slug]` and `components/tabs/*`) — deferred to a separate spec. It is a tabbed IDE-like surface and warrants its own focused pass.
- A global `<AppHeader/>` / shared layout shell — explicitly deferred. Pages will share primitives, not a layout component.
- Adding new Aceternity components on app pages beyond the subtle radial-glow background on `/profile`. Animation budget on app pages is reserved for judging/feedback.

## Decisions

Resolved during brainstorming:

- **Direction:** Palette + Aceternity components both win. Orange retires entirely.
- **Scope:** `/problems`, `/profile` (+ `/profile/setup`), and auth pages (`/sign-in`, `/sign-up`, `/auth/callback`, `/sign-out`). Problem-solving page deferred.
- **Shell:** No shared layout component. Each page imports a shared `<Brand/>` and other primitives.

## Design

### 1. Token system

Update `web/tailwind.config.js` to replace the current `bg`/`panel`/`border`/`accent`/`easy`/`medium`/`hard`/`code-bg`/`text.*` tree with semantic tokens backed by Tailwind's zinc + emerald scales:

```
colors.background:   #09090b   // zinc-950
colors.surface:      #18181b   // zinc-900
colors.surface-2:    #27272a80 // zinc-800/50
colors.border:       #27272a   // zinc-800
colors.fg.primary:   #fafafa   // zinc-50
colors.fg.secondary: #d4d4d8   // zinc-300
colors.fg.muted:     #71717a   // zinc-500
colors.primary:      #10b981   // emerald-500
colors.primary-hover: #34d399  // emerald-400
colors.easy:         #34d399   // emerald-400 (was #00b8a3)
colors.medium:       #fbbf24   // amber-400  (was #ffc01e)
colors.hard:         #f87171   // rose-400   (was #ef4743)
```

`web/app/globals.css` `:root` variables get the equivalent swap so any inline-style holdouts during migration still resolve to the new palette instead of stale orange.

The `accent`, `code-bg`, `bg`, `panel`, and old `text.*` tokens are deleted at the end of migration (step 4).

### 2. Shared primitives — `web/components/ui/`

Five small additions. None depend on Aceternity; they're plain Tailwind components.

- **`Brand.tsx`** — the `qLab` wordmark in emerald monospace. Optional `as="link"` mode that routes to `/`.
- **`Crumbs.tsx`** — the `<Brand/> / <current page>` row used by every in-scope page (replaces the inline header in `/problems` and `/profile`).
- **`Pill.tsx`** — filter pill. `active` variant = emerald fill on dark text; `inactive` variant = bordered surface.
- **`Card.tsx`** — single surface style: `bg-surface border border-border rounded-lg p-4`. One card style across the app.
- **`Button.tsx`** — `primary` (emerald fill, dark text) and `secondary` (bordered, light text) variants matching the Hero CTAs on `/`.

Existing Aceternity components in `web/components/ui/` (background-beams, bento-grid, etc.) stay untouched — they're the home page's vocabulary and don't need to spread.

### 3. Per-page changes

**`/problems`** (`web/app/problems/page.tsx`, `web/components/ProblemsTable.tsx`)
- Strip all inline `style={{...}}` props.
- Replace handcoded header with `<Crumbs current="Problems" />`.
- Convert filter buttons to `<Pill active={...}>`.
- Table: `border-border` for separators, `text-fg-muted` for the `#` column, monospace for the best-time column, semantic difficulty colors.
- Add a small page heading (`<h1>All problems</h1>` + subtitle) above the filter pills for hierarchy.

**`/profile`** + **`/profile/setup`** (`web/app/profile/page.tsx`, `web/app/profile/setup/page.tsx`)
- Replace generic centered layout with a left-aligned page using `<Crumbs current="Profile" />`.
- Avatar block: image with rounded full + emerald gradient fallback when no Clerk image.
- Handle and email each in their own `<Card>` with uppercase tracking-wide label + monospace value.
- Subtle radial emerald glow at top-right as page background (CSS `radial-gradient`, no animation).
- Keep all existing Clerk auth checks and routing behavior.

**Auth pages** (`web/app/sign-in/[[...sign-in]]/page.tsx`, sign-up, `/auth/callback`, `/sign-out`)
- Wrap Clerk's `<SignIn />` / `<SignUp />` in a `bg-background` flex-centered container with `<Brand/>` above the form.
- Pass Clerk's `appearance` prop with `baseTheme: dark` and emerald primary so the embedded Clerk UI matches.
- `/auth/callback` and `/sign-out`: use the same background and a centered `<Brand/>` + status text.

### 4. Migration order

Each step is its own commit / PR:

1. **Tokens.** Update `tailwind.config.js` and `globals.css`. Visually a no-op on home (it uses literal `zinc-950`/`emerald-500` already), and shifts `/problems` slightly because its inline styles reference `#1a1a1a`/`#ffa116` literals — those still work but now look out of place, motivating the next step.
2. **Primitives.** Add the five files in `components/ui/`. No imports yet.
3. **`/problems` migration.** Wire primitives, remove inline styles.
4. **`/profile` + `/profile/setup` migration.**
5. **Auth pages migration.** Clerk `appearance` props + `<Brand/>` shell.
6. **Cleanup.** Delete `accent`, `bg`, `panel`, `code-bg`, old `text.*` tokens from `tailwind.config.js` and `globals.css`. Search for any remaining `#ffa116`/`#1a1a1a` literals and remove.

## Risks and mitigations

- **Clerk theming gaps.** Clerk's `appearance` API may not cover every embedded element. Mitigation: accept minor visual mismatch on Clerk-internal flourishes (form helper text, etc.); don't fork Clerk's CSS.
- **Token rename breakage.** Removing `accent`/`bg`/`panel` from Tailwind config will break any file that still references them. Mitigation: step 6 (cleanup) only runs after all in-scope pages are migrated; a final grep catches stragglers.
- **Inline-style legacy elsewhere.** The problem-solving page (out of scope) still uses inline styles and may continue to look stale relative to the rest of the app until its own spec lands. This is acknowledged and accepted.

## Out of scope (explicit reminders)

- `/problems/[slug]` and all `components/tabs/*` files
- A shared `<AppHeader/>` / global layout
- New Aceternity components on app pages
- VS Code extension theming (separate codebase)
