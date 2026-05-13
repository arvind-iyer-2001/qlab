# VS Code Extension Parity Catch-up — Design Spec

**Date:** 2026-05-13
**Status:** approved (design)
**Scope:** four web-only features brought to parity in the VS Code extension

## Goal

The web client has sprinted ahead of the VS Code extension across the recent
burst of work. The parity table in `FUTURE.md` lists four features the web
ships but the extension does not:

- Wrong-answer diff in the Submit tab
- Solved/attempted markers in the sidebar
- Tab-state memory per slug
- Deep-link copy button

This spec brings the extension to parity on all four without refactoring the
1100-line `ProblemPanel.ts` (that god-file refactor is tracked separately as
Options A/B/C in `FUTURE.md`).

## Non-goals

- No restructure of `ProblemPanel.ts` (kept inline; god-file work is its own
  spec).
- No new backend endpoints. Everything reuses existing routes
  (`/submissions/me`, `/submissions`, plus the existing `vscode://qlab.qlab`
  URI handler).
- No VS Code-side rank column or stats panel beyond solved-or-not. Ranking is
  web-only for now.

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│  Extension host (Node)                                       │
│                                                              │
│   extension.ts                                               │
│   ├── activate()  ─── kicks off SolvedCache.refresh()        │
│   ├── uriHandler ─── parses ?slug= & ?tab=, opens ProblemPanel│
│   └── command 'qlab.openProblem' ─── opens by slug           │
│                                                              │
│   ProblemsProvider (TreeDataProvider)                        │
│   └── reads SolvedCache for ✓ icons; refresh fires on cache  │
│       change                                                 │
│                                                              │
│   SolvedCache (new module)                                   │
│   ├── globalState['qlab.solvedBySlug'] = Record<slug, status>│
│   ├── render-from-cache (sync)                               │
│   └── refresh() ─ fetches /submissions/me in background      │
│                                                              │
│   ProblemPanel  ──── messages ──── Webview JS               │
│                  (extension ↔ webview, both directions)      │
└──────────────────────────────────────────────────────────────┘
```

All four features live in this slice — no API changes, no new commands.

## Feature 1 — Solved markers in the sidebar

### Files

- New: `vscode-extension/src/solvedCache.ts`
- Modified: `vscode-extension/src/ProblemsProvider.ts`
- Modified: `vscode-extension/src/extension.ts`
- Modified: `vscode-extension/src/ProblemPanel.ts` (post-submit notify)

### Data shape

`globalState['qlab.solvedBySlug']` → `Record<string, SolvedStatus>` where
`SolvedStatus = 'solved' | 'attempted'`. Slugs not present in the map are
treated as untouched.

### Refresh strategy (both: cache + background)

1. On extension activation, `ProblemsProvider` renders from the cache
   immediately (no HTTP wait, no flicker).
2. `SolvedCache.refresh()` runs in the background: calls
   `api.getMySubmissions(token)` (no `problem_id`), reduces to
   `{slug: 'solved' | 'attempted'}`, writes to `globalState`, fires
   `ProblemsProvider._onDidChangeTreeData`.
3. After every correct submission inside the panel, the panel posts a
   `submitResult` event to the host. The host calls
   `SolvedCache.markSolved(slug)` locally (no network round-trip needed) and
   re-fires the tree change event.
4. The cache also exposes `bestMsBySlug` for tooltips.

### Rendering

- `ProblemItem` (already exists in `ProblemsProvider`) gets a new `iconPath`
  derived from cache status:
  - `solved` → emerald check (`new vscode.ThemeIcon('check', ...)`)
  - `attempted` → outline circle (`new vscode.ThemeIcon('circle-outline')`)
  - missing → no icon
- Tooltip extended: `Solved · best 12ms` when timing is known.

### Map computation

`submissions: MySubmissionEntry[]` → reduce by `problem_id`. Need a
`problem_id → slug` map; the provider already has problem summaries in
memory, so just join. If a submission has `status === 'correct'` for any
problem, the slug is `'solved'`. Otherwise `'attempted'`. `is_best` is not
strictly needed but the best timing is used for the tooltip.

## Feature 2 — Wrong-answer diff in the Submit tab

### Files

- Modified: `vscode-extension/src/ProblemPanel.ts` (Submit pane template + JS)

### Data path

`SubmissionResponse` from `/submissions` already carries
`failing_input`, `expected_output`, and `actual_output` on `status === 'wrong'`.
Backend already populates these on correct submissions too as of the recent
judge change, but the diff UI only renders when status is `wrong`.

### UI

In the existing `submitResult` JS handler under the Submit tab:

1. When `status === 'wrong'`:
   - Render the failing input in a `<pre>`.
   - Render two blocks: Expected (green tint) and Got (red tint).
   - **Stacked by default** — vertical column. Panel is in
     `ViewColumn.Two` and usually narrow.
   - Header has a small "Show side-by-side" / "Show stacked" toggle.
2. Toggle state is local to the Submit tab JS closure. Reset every time a
   new submission is rendered (no need to persist).

### Styling

Uses `var(--vscode-*)` variables for colors, matching the rest of the panel.
Expected block tinted with emerald, Got with rose, both via
`background-color: color-mix(in srgb, var(--vscode-editor-background) 80%, ...)`
or hard-coded rgba — pick whichever works in the current CSS.

## Feature 3 — Tab-state memory per slug

### Files

- Modified: `vscode-extension/src/ProblemPanel.ts`
- Modified: `vscode-extension/src/extension.ts` (passes `initialTab`)

### Storage

`workspaceState['qlab.tabBySlug']` → `Record<string, TabId>` where
`TabId = 'description' | 'test' | 'submit' | 'mysubmissions' | 'solutions' | 'community'`.

Workspace-scoped per the user's preference: memory lives with the workspace,
resets when the user opens qLab from a different folder.

### Open flow (precedence)

When the panel opens for a slug:

1. If the caller passes `initialTab` (deep-link URI carries `?tab=`), use it
   for this open only — do **not** write it back to `workspaceState` until
   the user actually clicks a tab. This avoids deep-links permanently
   rewriting saved state.
2. Else if `workspaceState['qlab.tabBySlug'][slug]` exists, use it.
3. Else default to `'description'`.

### Write flow

The webview JS fires `tabChanged` to the host on every user click. Host
updates `workspaceState`. No write on programmatic switches.

### Initial render

Pass `initialTab` into `buildHtml()`. The HTML adds `active` class to that
tab + pane on first render. Removes the current hardcoded
`description`-is-active assumption.

## Feature 4 — Deep-link copy button

### Files

- Modified: `vscode-extension/src/ProblemPanel.ts` (header button + handler)
- Modified: `vscode-extension/src/extension.ts` (URI handler reads `tab`)

### URI format

`vscode://qlab.qlab/open?slug=<slug>&tab=<tabId>`

The `tab` parameter is optional. The existing URI handler already parses
this scheme; we extend it to read `tab` and pass it as `initialTab` to
`ProblemPanel.show(...)`.

### UI

A small "🔗 Copy link" button in the panel header (next to the title, or
in the tab bar — whichever fits without crowding). On click, the webview
posts `copyDeepLink` with `{slug, tab}` derived from the active tab. The
host:

1. Builds the URI string.
2. Calls `vscode.env.clipboard.writeText(uri)`.
3. Shows `vscode.window.showInformationMessage('Link copied', { modal: false })`
   — non-blocking, dismisses on its own.

### Edge cases

- `ProblemPanel.show()` already deduplicates by slug. If a deep-link opens
  the same slug that's currently open, it should reveal it (existing
  behavior) AND switch to the requested tab. Implementation: when revealing
  an existing panel, send a `setTab` message to its webview if `initialTab`
  is provided.

## Error handling

- `SolvedCache.refresh()` swallows fetch errors silently (no auth, network
  down, etc.). Sidebar continues to render from stale cache. Errors logged
  via `console.warn` so they surface in the extension host log channel.
- Tab/state writes wrap in try/catch; VS Code state APIs rarely throw but
  if they do, we don't want a broken click handler.
- Clipboard write: `vscode.env.clipboard.writeText` returns a thenable. On
  reject, show an error notification (very unlikely).

## Testing

The extension currently has no test harness. This work does not add one —
that's its own FUTURE.md item. Manual verification list:

- [ ] Solved markers appear after first refresh post-activation.
- [ ] Submitting a correct solution updates the sidebar without a refresh.
- [ ] Restarting VS Code preserves markers (globalState).
- [ ] Wrong-answer diff renders on a mismatched submission. Toggle flips
      layout. Side-by-side and stacked both readable.
- [ ] Re-opening a problem returns to the last tab in the same workspace.
- [ ] Deep-link URI `vscode://qlab.qlab/open?slug=same-same&tab=submit`
      opens the panel on the Submit tab.
- [ ] Copy button writes a URI containing the active tab; pasting and
      opening it returns to the same tab.

## Out of scope (deferred)

- Rank column / stats in sidebar — web only for now.
- Wrong-answer diff in the extension matching exactly the web's tinted
  blocks pixel-for-pixel — close-enough is fine.
- Hover preview for solved problems showing best time — tooltip is enough.

## Estimated size

Small. Roughly:

- `solvedCache.ts` — ~60 lines new
- `ProblemsProvider.ts` — ~20 lines changed
- `extension.ts` — ~20 lines changed
- `ProblemPanel.ts` — ~150 lines changed across the four features

No new dependencies.
