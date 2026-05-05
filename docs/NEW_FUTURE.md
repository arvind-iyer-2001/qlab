# VS Code Extension — Structural Improvements

> Options for cleaning up the extension repo and moving it toward industry best practices.

---

## Current problems

**1. `ProblemPanel.ts` is a 1131-line god file** doing three completely different jobs:
- Extension-host logic (class, message handlers, API calls) — Node.js context
- HTML template builder (`buildHtml`) — string generation
- All webview CSS and JS — browser context, embedded as raw strings in a TypeScript template literal

This causes real pain: no syntax highlighting for the embedded HTML/CSS/JS, no linting, no type
safety in the webview code, and fragile backtick escaping (the template literal bug that broke
tab navigation during the Solutions tab feature).

**2. No bundler** — the build is just `tsc`, compiling each `.ts` file 1-to-1 to `.js`. No
tree-shaking, no separate webview bundle, no distinct compilation targets for host vs. browser.

**3. No linting or formatting config** — no `eslint` or `prettier` setup.

---

## Recommended target structure

```
vscode-extension/
├── src/
│   ├── extension.ts          # activate(), command registration
│   ├── ProblemsProvider.ts   # sidebar tree
│   ├── ProblemPanel.ts       # webview panel (extension-host side only, ~200 lines)
│   ├── api.ts                # HTTP client
│   └── webview/
│       ├── panel.html        # HTML template (static, loaded from disk)
│       ├── panel.css         # CSS (loaded from disk)
│       └── panel.ts          # Webview JS — real TypeScript, bundled separately
├── out/
│   ├── extension.js          # compiled extension host
│   └── webview/
│       └── panel.js          # bundled webview (esbuild output)
├── media/
├── esbuild.js                # build script
├── package.json
└── tsconfig.json
```

---

## Option A — Quick win: split the files

**Effort:** 1–2 hours. Mechanical refactor, zero behaviour change.

Extract the three concerns out of `ProblemPanel.ts` into separate files:

- `src/webview/panel.html` — HTML skeleton (static markup, loaded from disk at runtime)
- `src/webview/panel.css` — all CSS (loaded from disk, injected via `<style>` or `<link>`)
- `src/webview/panel.js` — webview JS (loaded from disk, injected via `<script src>`)
- `ProblemPanel.ts` shrinks to ~200 lines of pure extension-host logic

**How to load at runtime:**
```typescript
// In buildHtml(), read files relative to extensionUri
const htmlPath = vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'panel.html')
const cssUri   = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'panel.css'))
const jsUri    = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'panel.js'))
```

**What this fixes:**
- Real syntax highlighting and IntelliSense for HTML, CSS, and JS in their own files
- No more template literal escaping fragility (no backtick bugs)
- `ProblemPanel.ts` becomes readable and focused
- CSS and JS are lintable and formattable independently

**What it doesn't fix:**
- Webview JS is still plain JS (no TypeScript, no type safety)
- No bundling or tree-shaking
- `unsafe-inline` still needed for styles (or inline the CSS via `<style>`)

---

## Option B — Industry standard: esbuild + TypeScript webview

**Effort:** Half a day. Builds on Option A.

Two separate compilation targets, matching how GitLens and most production extensions work:

| Target | Tool | Input | Output |
|--------|------|-------|--------|
| Extension host | `tsc` | `src/*.ts` | `out/*.js` |
| Webview bundle | `esbuild` | `src/webview/panel.ts` | `out/webview/panel.js` |

**`esbuild.js` build script:**
```javascript
const esbuild = require('esbuild')

// Extension host
esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
})

// Webview bundle
esbuild.build({
  entryPoints: ['src/webview/panel.ts'],
  bundle: true,
  outfile: 'out/webview/panel.js',
  platform: 'browser',
  format: 'iife',
  sourcemap: true,
})
```

**`package.json` scripts:**
```json
"scripts": {
  "build": "node esbuild.js",
  "watch": "node esbuild.js --watch",
  "package": "npm run build && vsce package",
  "install-ext": "npm run package && code --install-extension qlab-0.1.0.vsix"
}
```

**CSP upgrade** — with a bundled file loaded via URI, drop `unsafe-inline` for scripts:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           script-src ${webview.cspSource};
           style-src  ${webview.cspSource} 'unsafe-inline';">
```

**What this adds over Option A:**
- Webview code is real TypeScript — typed, linted, with full IntelliSense
- esbuild bundles and tree-shakes — faster loads, smaller output
- Shared types between extension host and webview (e.g. message interfaces)
- `script-src` no longer needs `'nonce-...'` hack — use `webview.cspSource` cleanly
- `--watch` mode for fast iteration without reinstalling
- Foundation for adding React or other libraries later with no build changes

---

## Option C — Full GitLens-style: React webview

**Effort:** Days.

Bundle React into the webview panel. Get component-based UI, hot module replacement, full dev
tooling. Appropriate when the webview UI grows to the point where managing state and DOM
mutations by hand becomes painful.

Not recommended at qLab's current scale — the vanilla JS approach is fast and sufficient. Revisit
if the panel grows significantly in complexity.

---

## Recommended path

1. **Do Option A now** — purely mechanical, eliminates the fragility that caused the Solutions tab
   bug, and makes the codebase readable immediately.
2. **Upgrade to Option B** as a follow-up — the jump is small once files are separated, and it
   unlocks TypeScript for the webview and a clean build pipeline.
3. **Revisit Option C** only if the webview UI grows substantially in interactivity.
