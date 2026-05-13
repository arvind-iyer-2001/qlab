# VS Code Problem Panel — React Webview Rewrite

**Date:** 2026-05-13
**Status:** approved (design)
**Scope:** rewrite `ProblemPanel.ts` (~1300 lines of host glue + inline HTML/CSS/JS)
as a typed React app embedded in the existing webview panel.

## Goal

`vscode-extension/src/ProblemPanel.ts` is the project's god-file: extension-host
logic, raw HTML strings, embedded CSS, and webview JavaScript all live in one
1300-line file. Backtick escaping has already caused real bugs (Solutions tab
incident). New features (parity catch-up, deep-link, diff toggle) keep widening
the surface.

This work replaces the god-file with a clean two-side architecture: a thin
extension-host adapter that owns the lifecycle, plus a React webview app that
owns the UI. Communication runs over a typed message bus shared between both
sides. The user-visible behavior is unchanged.

## Non-goals

- No new user-facing features. Parity-with-current-behavior is the bar.
- No backend changes.
- No full extension test harness (tracked separately in `FUTURE.md`). A starter
  vitest suite for the new React components is in scope; integration / E2E
  tests are not.
- ~~No theming overhaul. Keep `var(--vscode-*)` tokens.~~
  **Updated:** the panel adopts the web app's visual identity (qLab dark
  theme, orange/emerald accents, JetBrains Mono). VS Code theme tokens
  are dropped from the panel — they made the panel "look like a tool
  inside the editor" rather than "look like qLab inside VS Code." See
  §10 below.

## High-level architecture

```
┌────────────────────────────────────────────────────────────┐
│  Extension host (Node, tsc → out/)                         │
│                                                            │
│   extension.ts                                             │
│   ├── activate() → wires PanelHost.open(...)               │
│   └── URI handler                                          │
│                                                            │
│   panel/                                                   │
│   ├── PanelHost.ts      ── lifecycle, factory, dispose     │
│   ├── messageRouter.ts  ── typed switch on WebviewRequest  │
│   └── solutionFile.ts   ── existing .q file helper         │
│                                                            │
│   shared/messages.ts    ── HostEvent / WebviewRequest      │
│                            (imported by webview too)       │
└────────────────────────────────────────────────────────────┘
                          ▲
                          │ postMessage (typed)
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Webview (React + Vite → out/webview/)                     │
│                                                            │
│   webview/src/                                             │
│   ├── main.tsx           ── React entry                    │
│   ├── App.tsx            ── tab shell, header, panel ctx   │
│   ├── lib/                                                 │
│   │   ├── vscode.ts      ── postMessage RPC adapter         │
│   │   ├── messages.ts    ── re-export shared types          │
│   │   └── queryClient.ts ── React Query setup              │
│   ├── hooks/             ── useSubmit, useLeaderboard…     │
│   ├── tabs/              ── one file per tab               │
│   ├── components/        ── DiffBlock, LeaderboardTable…   │
│   └── styles/            ── one .css per component         │
└────────────────────────────────────────────────────────────┘
```

The two sides only ever talk through the `shared/messages.ts` types. No
business logic crosses the bus in untyped shape.

## Project layout

```
vscode-extension/
├── src/
│   ├── extension.ts
│   ├── ProblemsProvider.ts
│   ├── solvedCache.ts
│   ├── api.ts
│   ├── panel/
│   │   ├── PanelHost.ts
│   │   ├── messageRouter.ts
│   │   └── solutionFile.ts
│   └── shared/
│       └── messages.ts
├── webview/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── lib/
│       │   ├── vscode.ts
│       │   ├── messages.ts          (re-export from ../../src/shared)
│       │   └── queryClient.ts
│       ├── hooks/
│       │   ├── useEditorCode.ts
│       │   ├── useSubmit.ts
│       │   ├── useRunTest.ts
│       │   ├── useLeaderboard.ts
│       │   ├── useMySubmissions.ts
│       │   ├── useSolutions.ts
│       │   └── useTabPersistence.ts
│       ├── tabs/
│       │   ├── DescriptionTab.tsx
│       │   ├── TestTab.tsx
│       │   ├── SubmitTab.tsx
│       │   ├── MySubmissionsTab.tsx
│       │   ├── SolutionsTab.tsx
│       │   └── CommunityTab.tsx
│       ├── components/
│       │   ├── TabBar.tsx
│       │   ├── CopyLinkButton.tsx
│       │   ├── ProblemHeader.tsx
│       │   ├── DiffBlock.tsx
│       │   ├── SubmitResult.tsx
│       │   ├── LeaderboardTable.tsx
│       │   ├── Spinner.tsx
│       │   ├── Button.tsx
│       │   └── Pill.tsx
│       └── styles/
│           └── *.css
├── package.json
└── tsconfig.json
```

`out/webview/` is gitignored; produced by `vite build`.

`ProblemPanel.ts` is **deleted**. Its lifecycle responsibilities live in
`panel/PanelHost.ts`; its inline HTML/CSS/JS disappear entirely.

## Build pipeline

`package.json` scripts:

```
"compile":         "npm run compile:host && npm run build:webview",
"compile:host":    "tsc -p ./",
"build:webview":   "vite build --config webview/vite.config.ts",
"watch":           "concurrently \"tsc -p ./ --watch\" \"vite build --config webview/vite.config.ts --watch\"",
"install-ext":     "npm run compile && vsce package … && code --install-extension …"
```

`@tomjs/vite-plugin-vscode-webview` (or equivalent — first preference is the
plugin that bundles to a single JS + CSS file with nonce injection and CSP
helpers). Output layout:

```
out/webview/
├── assets/
│   ├── main.<hash>.js
│   └── main.<hash>.css
└── index.html
```

`PanelHost` reads `index.html` at panel-create time, rewrites asset paths via
`webview.asWebviewUri`, injects a fresh nonce, and writes the result to
`panel.webview.html`.

CSP:

```
default-src 'none';
script-src ${cspSource} 'nonce-…';
style-src ${cspSource} 'unsafe-inline';
img-src ${cspSource} https: data:;
```

No `'unsafe-inline'` for scripts. No string-templated JS in host code.

## Typed message bus

`vscode-extension/src/shared/messages.ts`:

```ts
import type { ProblemDetail, LeaderboardEntry, SubmitResult, ExecuteResult,
              UserSubmission, SolutionsResponse, HintRevealResult } from '../api'

export type TabId =
  | 'description' | 'test' | 'submit'
  | 'mysubmissions' | 'solutions' | 'community'

export type WebviewRequest =
  | { kind: 'getEditorCode'; target: 'test' | 'submit' }
  | { kind: 'submit'; code: string }
  | { kind: 'runTest'; code: string }
  | { kind: 'getLeaderboard' }
  | { kind: 'getMySubmissions' }
  | { kind: 'getSolutions' }
  | { kind: 'revealNextHint' }
  | { kind: 'openInEditor'; code?: string }
  | { kind: 'tabChanged'; tab: TabId }
  | { kind: 'copyDeepLink'; tab: TabId }

export type HostEvent =
  | { kind: 'init'; problem: ProblemDetail; initialTab: TabId }
  | { kind: 'editorCode'; target: 'test' | 'submit'; code: string | null; error?: string }
  | { kind: 'submitResult'; data: SubmitResult }
  | { kind: 'testResult'; data: ExecuteResult }
  | { kind: 'leaderboard'; data: LeaderboardEntry[] }
  | { kind: 'mySubmissions'; data: UserSubmission[] | null }
  | { kind: 'solutions'; data: SolutionsResponse | null }
  | { kind: 'hintRevealed'; data: HintRevealResult | null }
  | { kind: 'setTab'; tab: TabId }
  | { kind: 'error'; requestId?: string; message: string }

export interface Envelope<T> {
  requestId?: string
  payload: T
}
```

Both sides import this. `api.ts` exports the existing response types
unchanged.

### RPC correlation

`webview/src/lib/vscode.ts` wraps `acquireVsCodeApi()` and exposes:

```ts
export function rpc<R extends WebviewRequest['kind'], E extends HostEvent['kind']>(
  request: WebviewRequest,
  expectedKind: E
): Promise<Extract<HostEvent, { kind: E }>>
```

`rpc` generates a UUID `requestId`, posts the envelope, and resolves on the
first incoming envelope with a matching id and `payload.kind === expectedKind`.
Rejects on `error` envelope with the same id, or on a 30s timeout.

Fire-and-forget broadcasts (e.g. host pushing fresh leaderboard, `setTab`)
carry no `requestId`; webview subscribes to them via a `useHostEvent(kind, cb)`
hook that updates `queryClient` caches.

### Host router

`panel/messageRouter.ts`:

```ts
export async function handle(
  msg: Envelope<WebviewRequest>,
  ctx: RouterContext,           // { api, problem, post, openSolutionFile,
                                //   workspaceState, solvedCache,
                                //   refreshLeaderboard }
): Promise<void> {
  try {
    switch (msg.payload.kind) {
      case 'submit': /* ... */ break
      // …
    }
  } catch (e) {
    ctx.post({ requestId: msg.requestId, payload: { kind: 'error', message: String(e) } })
  }
}
```

Every reply uses the same `requestId` so the webview's `rpc()` resolves the
right promise.

## Host adapter (`panel/PanelHost.ts`)

Replaces `ProblemPanel`. Same public surface:

```ts
export class PanelHost {
  static readonly panels = new Map<string, PanelHost>()
  static async open(slug, api, extensionUri, opts: OpenOptions): Promise<void>
}
```

Inside:

- creates `WebviewPanel` (`ViewColumn.Two`, `enableScripts`,
  `retainContextWhenHidden`, `localResourceRoots: [extensionUri]`)
- writes `panel.webview.html` from `buildShell()`
- registers `onDidReceiveMessage` → `messageRouter.handle`
- on first webview connection, posts `init` event with the resolved problem
  detail and the initial tab (URI override → `workspaceState` → `description`)
- guards `_post` against post-dispose race (existing pattern stays)

`buildShell(webview, extensionUri, nonce)` is ~40 lines: reads
`out/webview/index.html`, rewrites `<script src="…">` and
`<link href="…">` URLs through `webview.asWebviewUri`, injects the nonce.

## React shape

### `App.tsx`

```tsx
<QueryClientProvider client={queryClient}>
  <PanelProvider problem={problem} initialTab={initialTab}>
    <ProblemHeader />
    <TabBar />
    <ActivePane />
  </PanelProvider>
</QueryClientProvider>
```

`PanelProvider` owns `activeTab`, `setActiveTab` (also fires `tabChanged`
request), `copyLink()`, and the typed `problem` snapshot from `init`.

### Tabs

Each tab is its own file:

- `DescriptionTab` — static render of problem text and examples
- `TestTab` — wraps `useEditorCode('test')` + `useRunTest()`
- `SubmitTab` — wraps `useEditorCode('submit')` + `useSubmit()`; renders
  `SubmitResult` which delegates to `DiffBlock` on `status === 'wrong'`
- `MySubmissionsTab` — `useLeaderboard()` + `useMySubmissions()`; click-to-open
  goes through `openInEditor` request
- `SolutionsTab` — `useSolutions()` + `revealNextHint`
- `CommunityTab` — static "coming soon"

`MySubmissionsTab` mounts auto-trigger via `useEffect` (replaces the
"only-fetches-on-click" footgun from the old code).

### Components

- `DiffBlock` — owns the stacked/side-by-side toggle local state. Resets when
  its `data` prop changes (effect on `submission id`).
- `SubmitResult` — switches on status, renders correct stats / DiffBlock /
  error block.
- `LeaderboardTable` — table with medals.
- `CopyLinkButton` — fires `copyDeepLink` request with current tab; shows
  "Copied" affordance for 1.5s.
- `TabBar` — six buttons + copy button. Maps clicks through `PanelProvider`.

### State persistence

- Tab memory (`workspaceState`) stays host-side. Webview posts `tabChanged`;
  host writes the map. URI `?tab=` still wins for the first open; host pushes
  `setTab` if a deep-link arrives while the panel is already open.
- Diff toggle is local to `DiffBlock`. Not persisted (matches current
  behavior).

## Hooks

Sketch:

```ts
// useSubmit.ts
export function useSubmit() {
  return useMutation({
    mutationFn: (code: string) =>
      rpc({ kind: 'submit', code }, 'submitResult').then(e => e.data),
  })
}

// useLeaderboard.ts
export function useLeaderboard() {
  const qc = useQueryClient()
  useHostEvent('leaderboard', e => qc.setQueryData(['leaderboard'], e.data))
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => rpc({ kind: 'getLeaderboard' }, 'leaderboard').then(e => e.data),
  })
}
```

Pattern: every host-pushable cache also gets a `useHostEvent` so unsolicited
events update React Query state without a query refetch.

## Error handling

- RPC adapter: 30s timeout → typed rejection; webview disposed mid-flight on
  the host side already silenced by the existing `_post` guard.
- Router: any thrown error becomes a typed `error` event tagged with the
  request id. React Query surfaces it through `error` state.
- Auth-expired (`'expired'` from `api.ts` helpers): router posts
  `{ kind: 'error', message: 'EXPIRED' }` AND shows the existing
  `vscode.window.showWarningMessage('… session has expired')` Sign In prompt.
  Webview side maps `EXPIRED` to a neutral "please sign in" inline notice.

## Testing

Add `vitest` to `vscode-extension/package.json` as a dev dep with a
webview-only project. Initial suite:

- `DiffBlock` — stacked vs side-by-side toggle.
- `SubmitResult` — status → label mapping (correct, wrong, error, timeout,
  invalid).
- `LeaderboardTable` — medal rendering.

This is a starter suite, not the full harness. The harness FUTURE.md item
stays open and inherits the vitest scaffold this work establishes.

## Cleanup

- Delete `vscode-extension/src/ProblemPanel.ts`.
- Update import in `extension.ts`: `ProblemPanel` → `PanelHost`.
- Update `vscode-extension/.gitignore`: add `out/webview/`.
- `FUTURE.md`: tick the Option C refactor item; remove Option A/B from
  the active list (kept in the spec history as superseded).

## 10. Visual style — match the web app

The webview adopts the web app's design tokens so the two clients look like
the same product. The reference for every token is the existing styling in
`web/components/ProblemLayout.tsx`, `web/app/problems/[slug]/page.tsx`,
`web/components/tabs/*`, and the difficulty colors used in
`web/components/ProblemsTable.tsx`.

### Palette

Defined once in `webview/src/styles/tokens.css`:

```css
:root {
  /* surfaces */
  --qlab-bg:        #1a1a1a;   /* page background */
  --qlab-surface:   #1e1e1e;   /* tab body, code blocks */
  --qlab-elev:      #282828;   /* tab bar, headers, cards */
  --qlab-border:    #3a3a3a;
  --qlab-border-2:  #4a4a4a;

  /* text */
  --qlab-fg:        #eff1f6;
  --qlab-fg-muted:  #aba9b0;
  --qlab-fg-dim:    #5a5a5a;

  /* accents (match web exactly) */
  --qlab-accent:    #ffa116;   /* orange — primary action, active tab */
  --qlab-emerald:   #00b8a3;   /* correct, easy */
  --qlab-amber:     #ffc01e;   /* medium, warning */
  --qlab-rose:      #ef4743;   /* wrong, hard */
  --qlab-violet:    #8b5cf6;   /* leaderboard accent */

  /* tinted backgrounds for diff blocks */
  --qlab-diff-expected-bg: #0f1e18;
  --qlab-diff-expected-bd: #1a3a2a;
  --qlab-diff-got-bg:      #2a1a1a;
  --qlab-diff-got-bd:      #4a2020;

  /* type */
  --qlab-font-sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  --qlab-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --qlab-fs-base:   13px;
  --qlab-fs-sm:     12px;
  --qlab-fs-xs:     11px;

  /* radius / spacing */
  --qlab-r-sm: 4px;
  --qlab-r-md: 6px;
  --qlab-r-lg: 8px;
}

body {
  background: var(--qlab-bg);
  color: var(--qlab-fg);
  font-family: var(--qlab-font-sans);
  font-size: var(--qlab-fs-base);
}

code, pre, .mono { font-family: var(--qlab-font-mono); }
```

This file is imported once at the top of `main.tsx`. Every component CSS file
references these custom properties.

### What changes vs the current panel

- The orange used for the active tab and primary "Submit" button is
  `#ffa116` (web brand), not the VS Code focusBorder color.
- Code blocks use JetBrains Mono with a slightly elevated background
  (`--qlab-surface`), matching the web problem detail.
- Difficulty badges/text use emerald / amber / rose to match the web
  `ProblemsTable`.
- Wrong-answer diff uses the same tinted blocks as `SubmitTab.tsx` on the
  web (`--qlab-diff-*`).
- The tab bar mirrors `ProblemLayout`'s tab bar: 13px text, 11px vertical
  padding, 2px bottom-border in `--qlab-accent` on active.

### Theme considerations

- The web app is dark-only; the webview matches. No `prefers-color-scheme`
  light variant.
- If a user has a light VS Code theme, the panel is still dark on purpose —
  consistent with the web client. This is a deliberate brand decision, not
  a bug. Documented in `CLAUDE.md` after merge.
- A `qlab.theme` setting can be added later if it becomes a complaint
  (out of scope for this PR).

### Sharing tokens with the web app

Not in scope for this PR — the palette is duplicated in
`webview/src/styles/tokens.css`. A follow-up can extract a small
`tokens.json` or `tokens.css` published from the repo root and consumed by
both `web/` and `vscode-extension/webview/`, but that adds build complexity
and we don't want to gate the rewrite on it.

## Out of scope (deferred)

- Full extension test harness (FUTURE.md).
- Shared design-token package between web and webview (duplicated for now;
  see §10).
- Light-mode variant of the panel (web is dark-only too).
- Storybook for components.
- Hot-reload inside the webview during dev (Vite watch produces the rebuilt
  bundle but VS Code still reloads on extension restart — acceptable for now).
- Moving sidebar or other extension UI to React (only the problem panel).

## Risk / rollback

Single PR, full cutover. No feature flag. Rollback strategy: revert the PR;
the old `ProblemPanel.ts` is in git history. Behavior parity is the bar; the
manual test list from
`docs/superpowers/specs/2026-05-13-vscode-parity-design.md` is reused as a
smoke-test checklist before merge.
