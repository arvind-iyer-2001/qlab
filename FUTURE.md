# Future Improvements

| # | Priority | Item | Description | Effort |
|---|----------|------|-------------|--------|
| 1 | P0 | Persistent handle | Store handle in `qlab.handle` setting or `globalState` so the Submit tab pre-fills it across sessions | XS |
| 2 | P0 | Solved/attempted markers in sidebar | After a correct submission, mark the `ProblemItem` with a checkmark icon using `context.globalState` keyed by `slug → status` | S |
| 3 | P0 | Copy deep-link button | One-click button in the panel header that writes `vscode://qlab.qlab/open?slug=...` to the clipboard | XS |
| 4 | P1 | Keybinding for Run Test | Add a second keybinding (e.g. `Ctrl+Shift+T`) for "Run Test" to complete the inner loop without the mouse | XS |
| 5 | P1 | Wrong-answer diff | Side-by-side or inline diff of `expected_output` vs `actual_output` when a submission fails | S |
| 6 | P1 | Tab state memory per panel | Remember the last active tab per slug in `globalState` so returning to a problem drops you where you left off | XS |
| 7 | P1 | Auto-refresh leaderboard feedback | Show a subtle "Leaderboard updated" notice on the Community tab after a correct submission refreshes it | XS |
| 8 | P2 | My Submissions history tab | Sixth panel tab showing the user's past submissions (status, timing, char count, timestamp); needs new API endpoint `GET /submissions?problem_id=&handle=` | M |
| 9 | P2 | Problem filter in sidebar | Filter input at the top of the tree view to narrow problems by title or concept as the problem count grows | M |
| 10 | P2 | Global stats / profile view | Second tree view section or webview showing handle, # problems solved, overall rank — derivable from existing leaderboard endpoints | M |
| 11 | P3 | Extract HTML/CSS/JS from ProblemPanel.ts | Move the ~400-line `buildHtml()` to a `.html` file loaded via `webview.asWebviewUri`; decouples UI from TypeScript logic | M |
| 12 | P3 | API health indicator | Status bar item showing green/red based on a periodic `GET /health` ping instead of only surfacing errors on tree load failure | S |
| 13 | P3 | Panel restore on restart | Save open slugs to `workspaceState` on dispose and re-open them on activation so panels survive VS Code restarts | S |
