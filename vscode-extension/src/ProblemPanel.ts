import * as vscode from 'vscode'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { QLabApi, ProblemDetail, LeaderboardEntry, SubmitResult, ExecuteResult, UserSubmission } from './api'

/** One panel per problem slug; re-reveals if already open. */
export class ProblemPanel {
  static readonly panels = new Map<string, ProblemPanel>()

  private readonly _panel: vscode.WebviewPanel
  private readonly _disposables: vscode.Disposable[] = []

  // ── Factory ──────────────────────────────────────────────────────────────

  static async open(
    slug: string,
    api: QLabApi,
    extensionUri: vscode.Uri
  ): Promise<void> {
    // Re-reveal existing panel
    const existing = ProblemPanel.panels.get(slug)
    if (existing) {
      existing._panel.reveal(vscode.ViewColumn.Two)
      return
    }

    // Fetch full problem details
    let problem: ProblemDetail
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Loading problem…' },
      async () => { problem = await api.getProblem(slug) }
    )

    const panel = vscode.window.createWebviewPanel(
      'qlab.problem',
      `qLab: ${problem!.title}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    )

    new ProblemPanel(panel, problem!, api, extensionUri)

    // Open / create a solution .q file in column 1
    await ProblemPanel.openSolutionFile(problem!)
  }

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor(
    panel: vscode.WebviewPanel,
    private readonly problem: ProblemDetail,
    private readonly api: QLabApi,
    _extensionUri: vscode.Uri
  ) {
    this._panel = panel
    ProblemPanel.panels.set(problem.slug, this)

    this._panel.webview.html = buildHtml(panel.webview, problem)

    // Messages from webview → extension
    this._panel.webview.onDidReceiveMessage(
      (msg) => this._handleMessage(msg),
      null,
      this._disposables
    )

    this._panel.onDidDispose(() => this._dispose(), null, this._disposables)

    // Push initial leaderboard
    this._sendLeaderboard()
  }

  // ── Message handling ──────────────────────────────────────────────────────

  private async _handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case 'getEditorCode':
        this._sendEditorCode(msg.target ?? 'test')
        break

      case 'submit':
        await this._handleSubmit(msg.code)
        break

      case 'runTest':
        await this._handleRunTest(msg.code ?? '')
        break

      case 'refreshLeaderboard':
        await this._sendLeaderboard()
        break

      case 'openInEditor':
        await ProblemPanel.openSolutionFile(this.problem)
        break

      case 'getMySubmissions':
        await this._sendMySubmissions()
        break
    }
  }

  private _sendEditorCode(target: string): void {
    const editor = vscode.window.visibleTextEditors.find(
      e => e.document.languageId === 'q' || e.document.fileName.endsWith('.q')
    ) ?? vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showWarningMessage(
        'No .q file is open. Open your solution file first (or click "Open in Editor" in the panel).'
      )
      this._post({ type: 'editorCode', target, code: null, error: 'No .q file open' })
      return
    }

    const code = editor.document.getText().trim()
    this._post({ type: 'editorCode', target, code })
  }

  private async _handleSubmit(code: string | undefined): Promise<void> {
    this._post({ type: 'submitStatus', status: 'judging' })
    try {
      const result: SubmitResult = await this.api.submitSolution(
        this.problem.id,
        code ?? ''
      )
      if (result.status === 'unauthorized') {
        const action = await vscode.window.showErrorMessage(
          'Please sign in to submit solutions.',
          'Sign In'
        )
        if (action === 'Sign In') {
          vscode.commands.executeCommand('qlab.signIn')
        }
        return
      }
      this._post({ type: 'submitResult', data: result })
      if (result.status === 'correct') {
        await this._sendLeaderboard()
      }
    } catch (e) {
      this._post({
        type: 'submitResult',
        data: { status: 'error', error: String(e) } as SubmitResult,
      })
    }
  }

  private async _handleRunTest(code: string): Promise<void> {
    this._post({ type: 'testStatus', status: 'running' })
    try {
      // Append the test call so the user sees actual output
      const testCode = `${code ?? ''}\n${this.problem.test_call}`
      const result: ExecuteResult = await this.api.executeCode(testCode)
      this._post({ type: 'testResult', data: result })
    } catch (e) {
      this._post({
        type: 'testResult',
        data: { ok: false, error: String(e) } as ExecuteResult,
      })
    }
  }

  private async _sendLeaderboard(): Promise<void> {
    try {
      const rows: LeaderboardEntry[] = await this.api.getLeaderboard(this.problem.slug)
      this._post({ type: 'leaderboard', data: rows })
    } catch {
      // Non-fatal — leaderboard just stays as-is
    }
  }

  private async _sendMySubmissions(): Promise<void> {
    const rows = await this.api.getMySubmissions(this.problem.id).catch(() => null)
    this._post({ type: 'mySubmissions', data: rows })
  }

  private _post(msg: ExtensionMessage): void {
    this._panel.webview.postMessage(msg)
  }

  private _dispose(): void {
    ProblemPanel.panels.delete(this.problem.slug)
    this._disposables.forEach(d => d.dispose())
  }

  // ── Solution file helper ──────────────────────────────────────────────────

  static async openSolutionFile(problem: ProblemDetail): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!folder) {
      vscode.window.showInformationMessage('Open a workspace folder to use qLab solution files.')
      return
    }

    const solDir = vscode.workspace
      .getConfiguration('qlab')
      .get<string>('solutionsDir') || path.join(folder, 'qlab-solutions')

    if (!fs.existsSync(solDir)) {
      fs.mkdirSync(solDir, { recursive: true })
    }

    const filePath = path.join(solDir, `${problem.slug}.q`)

    if (!fs.existsSync(filePath)) {
      const starter = [
        `/ Problem   : ${problem.title}`,
        `/ Difficulty: ${problem.difficulty}`,
        `/ Concepts  : ${problem.concepts.join(', ')}`,
        `/ Scoring   : ${problem.winning_criteria}`,
        `/`,
        `/ Test call : ${problem.test_call}`,
        `/`,
        `/ Hint — connect to the qLab notebook process (localhost:5001)`,
        `/ via the KX VS Code extension to run code interactively.`,
        ``,
        `func:{[x]`,
        `  `,
        `}`,
        ``,
      ].join('\n')
      fs.writeFileSync(filePath, starter, 'utf-8')
    }

    const doc = await vscode.workspace.openTextDocument(filePath)
    await vscode.window.showTextDocument(doc, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: true,   // keep focus on panel
    })
  }
}

// ── Message types ─────────────────────────────────────────────────────────

interface WebviewMessage {
  type: 'getEditorCode' | 'submit' | 'runTest' | 'refreshLeaderboard' | 'openInEditor' | 'getMySubmissions'
  target?: string
  code?: string
}

interface ExtensionMessage {
  type: string
  [key: string]: unknown
}

// ── HTML builder ──────────────────────────────────────────────────────────

function nonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(webview: vscode.Webview, p: ProblemDetail): string {
  const n = nonce()

  const diffColor =
    p.difficulty === 'easy'   ? 'var(--vscode-testing-iconPassed)' :
    p.difficulty === 'medium' ? 'var(--vscode-editorWarning-foreground)' :
                                'var(--vscode-testing-iconFailed)'

  const conceptTags = p.concepts
    .map(c => `<span class="tag">${esc(c)}</span>`)
    .join('')

  const examples = p.examples
    .map((ex, i) => `
      <div class="example">
        <div class="ex-label">Example ${i + 1}</div>
        <div class="ex-block">
          <div class="ex-row"><span class="ex-key">Input&nbsp;</span><code class="ex-val">q)${esc(ex.input)}</code></div>
          <div class="ex-row"><span class="ex-key">Output</span><code class="ex-val">${esc(ex.output)}</code></div>
          ${ex.note ? `<div class="ex-note">// ${esc(ex.note)}</div>` : ''}
        </div>
      </div>`)
    .join('')

  const hints = p.hints.length
    ? `<details class="hints-details">
        <summary>Hints (${p.hints.length})</summary>
        <ol>${p.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol>
      </details>`
    : ''

  // Embed problem data for JS (only trusted local data, safe to inline)
  const problemJson = JSON.stringify({
    id: p.id,
    slug: p.slug,
    title: p.title,
    test_call: p.test_call,
  })

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${n}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Problem header ── */
    .prob-header {
      padding: 12px 16px 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
    }
    .prob-title {
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .prob-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .badge {
      font-size: 0.78em;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 10px;
      border: 1px solid currentColor;
      color: ${diffColor};
    }
    .tag {
      font-size: 0.75em;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* ── Tabs ── */
    .tab-bar {
      display: flex;
      background: var(--vscode-editorGroupHeader-tabsBackground);
      border-bottom: 1px solid var(--vscode-tab-border);
      overflow-x: auto;
      flex-shrink: 0;
    }
    .tab-bar::-webkit-scrollbar { height: 0; }
    .tab {
      padding: 7px 16px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--vscode-tab-inactiveForeground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tab:hover   { color: var(--vscode-tab-activeForeground); background: var(--vscode-tab-hoverBackground); }
    .tab.active  { color: var(--vscode-tab-activeForeground); border-bottom-color: var(--vscode-focusBorder); }

    /* ── Tab content ── */
    .tab-body  { flex: 1; overflow: hidden; position: relative; }
    .tab-pane  { display: none; position: absolute; inset: 0; overflow-y: auto; padding: 16px; }
    .tab-pane.active { display: block; }

    /* ── Typography ── */
    h3 {
      font-size: 0.78em;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--vscode-descriptionForeground);
      margin: 18px 0 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    h3:first-child { margin-top: 0; }
    p { line-height: 1.65; margin-bottom: 10px; }

    /* ── Code ── */
    pre, code {
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
    }
    pre  { padding: 10px 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; margin: 6px 0; line-height: 1.5; }
    code { padding: 1px 5px; }

    /* ── Examples ── */
    .example       { margin-bottom: 12px; }
    .ex-label      { font-size: 0.75em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ex-block      { background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 8px 10px; }
    .ex-row        { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
    .ex-row:last-child { margin-bottom: 0; }
    .ex-key        { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.4px; color: var(--vscode-descriptionForeground); white-space: nowrap; }
    .ex-val        { font-family: var(--vscode-editor-font-family, monospace); font-size: var(--vscode-editor-font-size, 13px); background: none; padding: 0; }
    .ex-note       { font-size: 0.82em; color: var(--vscode-descriptionForeground); margin-top: 5px; font-style: italic; }

    /* ── Hints ── */
    .hints-details { margin-top: 10px; }
    .hints-details summary { cursor: pointer; color: var(--vscode-descriptionForeground); font-size: 0.88em; padding: 4px 0; }
    .hints-details ol { padding-left: 20px; margin-top: 8px; line-height: 1.7; }
    .hints-details li { margin-bottom: 4px; }

    /* ── Buttons ── */
    .btn-row  { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; align-items: center; }
    button {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      cursor: pointer;
      border: none;
      border-radius: 2px;
      padding: 5px 14px;
    }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover:not(:disabled) { background: var(--vscode-button-secondaryHoverBackground); }

    /* ── Forms ── */
    .field       { margin-bottom: 10px; }
    .field label { display: block; font-size: 0.82em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    input[type="text"] {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      padding: 5px 8px;
      border-radius: 2px;
      outline: none;
    }
    input[type="text"]:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }

    /* ── Code preview (readonly) ── */
    .code-preview {
      margin-top: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      overflow: hidden;
    }
    .code-preview-label {
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBarSectionHeader-background);
      padding: 3px 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .code-preview pre {
      background: var(--vscode-textCodeBlock-background);
      margin: 0;
      border-radius: 0;
      max-height: 220px;
      overflow-y: auto;
    }

    /* ── Result box ── */
    .result {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 3px;
      border-left: 3px solid var(--vscode-panel-border);
      background: var(--vscode-textCodeBlock-background);
      font-size: 0.9em;
    }
    .result-title { font-weight: 600; margin-bottom: 8px; font-size: 1em; }
    .result.correct { border-left-color: var(--vscode-testing-iconPassed); }
    .result.wrong   { border-left-color: var(--vscode-testing-iconFailed); }
    .result.error   { border-left-color: var(--vscode-editorWarning-foreground); }
    .result-stats { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 6px; }
    .stat-label { font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); }
    .stat-val { font-weight: 600; }
    .result-section { margin-top: 8px; }
    .result-section .label { font-size: 0.75em; text-transform: uppercase; color: var(--vscode-descriptionForeground); margin-bottom: 3px; }
    .result-section pre { max-height: 120px; overflow-y: auto; font-size: 0.88em; }

    /* ── Output box (test runner) ── */
    .output-box {
      margin-top: 10px;
      background: var(--vscode-terminal-background, var(--vscode-textCodeBlock-background));
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      padding: 8px 10px;
    }
    .output-box pre {
      background: transparent;
      padding: 0;
      color: var(--vscode-terminal-foreground, var(--vscode-foreground));
      margin: 0;
    }
    .output-box.error pre { color: var(--vscode-testing-iconFailed); }
    .output-label {
      font-size: 0.72em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 5px;
    }

    /* ── Leaderboard ── */
    table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
    th    { text-align: left; padding: 5px 8px; color: var(--vscode-descriptionForeground); border-bottom: 1px solid var(--vscode-panel-border); font-weight: 400; }
    td    { padding: 5px 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    tr:hover td { background: var(--vscode-list-hoverBackground); }
    .lb-handle { color: var(--vscode-textLink-foreground); }

    /* ── My Submissions ── */
    .best-row td { font-weight: 600; }
    .best-star { color: #f5a623; margin-right: 3px; }
    .sub-correct { color: var(--vscode-testing-iconPassed); }
    .sub-wrong, .sub-error, .sub-timeout { color: var(--vscode-testing-iconFailed); }

    /* ── Info / notice ── */
    .notice {
      padding: 10px 12px;
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 3px;
      font-size: 0.85em;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .notice code { background: none; padding: 0; }

    /* ── Spinner ── */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { display: inline-block; animation: spin 1s linear infinite; }
  </style>
</head>
<body>

  <!-- Fixed problem header -->
  <div class="prob-header">
    <div class="prob-title">${esc(p.title)}</div>
    <div class="prob-meta">
      <span class="badge">${esc(p.difficulty)}</span>
      ${conceptTags}
      <span style="margin-left:auto;font-size:0.78em;color:var(--vscode-descriptionForeground)">${esc(p.posted_date)}</span>
    </div>
  </div>

  <!-- Tab bar -->
  <div class="tab-bar">
    <button class="tab active" data-tab="description">Description</button>
    <button class="tab" data-tab="test">Test</button>
    <button class="tab" data-tab="submit">Submit</button>
    <button class="tab" data-tab="mysubmissions">My Submissions</button>
    <button class="tab" data-tab="community">Community</button>
  </div>

  <!-- Tab panes -->
  <div class="tab-body">

    <!-- ── DESCRIPTION ─────────────────────────────────────────── -->
    <div class="tab-pane active" id="description">
      <h3>Problem</h3>
      <p>${esc(p.narrative).replace(/\n/g, '<br>')}</p>

      <h3>Input</h3>
      <p>${esc(p.input_spec).replace(/\n/g, '<br>')}</p>

      <h3>Output</h3>
      <p>${esc(p.output_spec)}</p>

      <h3>Winning Criteria</h3>
      <p>${esc(p.winning_criteria)}</p>

      ${hints}

      <h3>Examples</h3>
      ${examples}
      <pre style="margin-top:8px">${esc(p.test_call)}</pre>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn-secondary" id="openInEditorBtn">📝 Open Solution File</button>
      </div>
    </div>

    <!-- ── TEST ────────────────────────────────────────────────── -->
    <div class="tab-pane" id="test">
      <div class="notice">
        Write your <code>func</code> in the <code>.q</code> solution file (or use a KX Notebook),
        then click <strong>Load from Editor</strong> to pull it in here and run against the test input.
      </div>

      <h3>Test call</h3>
      <pre>${esc(p.test_call)}</pre>

      <div class="btn-row">
        <button class="btn-secondary" id="loadForTestBtn">↓ Load from Editor</button>
        <button class="btn-primary" id="runTestBtn" disabled>▶ Run Test</button>
      </div>

      <div id="testCodeWrap" style="display:none" class="code-preview">
        <div class="code-preview-label">Code loaded from editor</div>
        <pre id="testCodePre"></pre>
      </div>

      <div id="testOutputWrap" style="display:none">
        <div class="output-label" style="margin-top:12px">Output</div>
        <div id="testOutputBox" class="output-box"><pre id="testOutputPre">…</pre></div>
      </div>
    </div>

    <!-- ── SUBMIT ───────────────────────────────────────────────── -->
    <div class="tab-pane" id="submit">
      <div class="notice">
        Solution must define <code>func:{[x]…}</code> — single-param function.
        Scored by timing (<code>\\t:1000</code>) then character count.
        <br>Shortcut: <code>Ctrl+Shift+S</code> while in the solution file.
      </div>

      <div class="btn-row">
        <button class="btn-secondary" id="loadForSubmitBtn">↓ Load from Editor</button>
        <button class="btn-primary" id="submitBtn" disabled>⚡ Submit</button>
        <span id="charCount" style="font-size:0.82em;color:var(--vscode-descriptionForeground)"></span>
      </div>

      <div id="submitCodeWrap" style="display:none" class="code-preview">
        <div class="code-preview-label">Code to be submitted</div>
        <pre id="submitCodePre"></pre>
      </div>

      <div id="submitResultWrap" style="display:none"></div>
    </div>

    <!-- ── MY SUBMISSIONS ─────────────────────────────────────── -->
    <div class="tab-pane" id="mysubmissions">
      <div id="mySubContent"><span class="spinner">⟳</span> Loading…</div>
    </div>

    <!-- ── COMMUNITY ───────────────────────────────────────────── -->
    <div class="tab-pane" id="community">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="margin:0;border:none">Leaderboard</h3>
        <button class="btn-secondary" id="refreshLbBtn" style="font-size:0.78em;padding:3px 10px">↻ Refresh</button>
      </div>
      <div id="leaderboard">
        <span class="spinner">⟳</span> Loading…
      </div>
    </div>

  </div><!-- /.tab-body -->

  <script nonce="${n}">
    const vscode = acquireVsCodeApi();
    const PROBLEM = ${problemJson};

    // ── Persist state across hidden/reveal ──────────────────────
    const state = vscode.getState() || {};

    // ── Tab switching ─────────────────────────────────────────
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    // Load My Submissions when that tab is selected
    document.querySelector('.tab[data-tab="mysubmissions"]').addEventListener('click', () => {
      vscode.postMessage({ type: 'getMySubmissions' });
    });

    // ── Open solution file ────────────────────────────────────
    document.getElementById('openInEditorBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openInEditor' });
    });

    // ── Test tab ──────────────────────────────────────────────
    let testCode = null;
    let submitCode = null;

    document.getElementById('loadForTestBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'getEditorCode', target: 'test' });
    });

    document.getElementById('runTestBtn').addEventListener('click', () => {
      if (!testCode) return;
      document.getElementById('testOutputWrap').style.display = 'block';
      document.getElementById('testOutputBox').className = 'output-box';
      document.getElementById('testOutputPre').textContent = '⟳ Running…';
      vscode.postMessage({ type: 'runTest', code: testCode });
    });

    // ── Submit tab ────────────────────────────────────────────
    document.getElementById('loadForSubmitBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'getEditorCode', target: 'submit' });
    });

    document.getElementById('submitBtn').addEventListener('click', () => {
      if (!submitCode) return;
      const resultWrap = document.getElementById('submitResultWrap');
      resultWrap.style.display = 'block';
      resultWrap.innerHTML = '<div class="result"><span class="spinner">⟳</span> Judging your solution…</div>';
      document.getElementById('submitBtn').disabled = true;
      vscode.postMessage({ type: 'submit', code: submitCode });
    });

    document.getElementById('refreshLbBtn').addEventListener('click', () => {
      document.getElementById('leaderboard').innerHTML = '<span class="spinner">⟳</span> Loading…';
      vscode.postMessage({ type: 'refreshLeaderboard' });
    });

    // ── Messages from extension ───────────────────────────────
    window.addEventListener('message', ({ data: msg }) => {
      switch (msg.type) {

        case 'editorCode': {
          if (msg.error) {
            showError(msg.target, msg.error);
            break;
          }
          const code = msg.code || '';
          if (msg.target === 'test') {
            testCode = code;
            document.getElementById('testCodeWrap').style.display = 'block';
            document.getElementById('testCodePre').textContent = code;
            document.getElementById('runTestBtn').disabled = false;
          } else if (msg.target === 'submit') {
            submitCode = code;
            document.getElementById('submitCodeWrap').style.display = 'block';
            document.getElementById('submitCodePre').textContent = code;
            document.getElementById('submitBtn').disabled = false;
            const cc = code.trim().startsWith('func:') ? Math.max(0, code.trim().length - 2) : null;
            document.getElementById('charCount').textContent = cc !== null ? '~' + cc + ' chars' : '';
          }
          break;
        }

        case 'testResult': {
          const box = document.getElementById('testOutputBox');
          const pre = document.getElementById('testOutputPre');
          if (msg.data.ok) {
            box.className = 'output-box';
            pre.textContent = msg.data.output || '(no output)';
          } else {
            box.className = 'output-box error';
            pre.textContent = 'Error: ' + msg.data.error;
          }
          break;
        }

        case 'submitResult': {
          renderSubmitResult(msg.data);
          document.getElementById('submitBtn').disabled = false;
          break;
        }

        case 'leaderboard': {
          renderLeaderboard(msg.data);
          break;
        }

        case 'mySubmissions': {
          renderMySubmissions(msg.data);
          break;
        }
      }
    });

    // ── Renderers ─────────────────────────────────────────────

    function showError(target, msg) {
      if (target === 'test') {
        document.getElementById('testOutputWrap').style.display = 'block';
        document.getElementById('testOutputBox').className = 'output-box error';
        document.getElementById('testOutputPre').textContent = msg;
      } else {
        const wrap = document.getElementById('submitResultWrap');
        wrap.style.display = 'block';
        wrap.innerHTML = '<div class="result error"><span class="result-title">Error</span><pre>' + e(msg) + '</pre></div>';
      }
    }

    function renderSubmitResult(data) {
      const wrap = document.getElementById('submitResultWrap');
      wrap.style.display = 'block';
      if (data.status === 'correct') {
        wrap.innerHTML =
          '<div class="result correct">' +
          '<div class="result-title" style="color:var(--vscode-testing-iconPassed)">✓ CORRECT</div>' +
          '<div class="result-stats">' +
          '  <div><div class="stat-label">Time</div><div class="stat-val">' + data.timing_ms + ' ms</div></div>' +
          '  <div><div class="stat-label">Length</div><div class="stat-val">' + data.char_count + ' chars</div></div>' +
          '  <div><div class="stat-label">Rank</div><div class="stat-val">#' + data.leaderboard_rank + '</div></div>' +
          '</div></div>';
      } else if (data.status === 'wrong') {
        wrap.innerHTML =
          '<div class="result wrong">' +
          '<div class="result-title" style="color:var(--vscode-testing-iconFailed)">✗ WRONG ANSWER</div>' +
          '<div class="result-section"><div class="label">Failing input</div><pre>' + e(data.failing_input) + '</pre></div>' +
          '<div class="result-section"><div class="label">Expected</div><pre>' + e(data.expected_output) + '</pre></div>' +
          '<div class="result-section"><div class="label">Got</div><pre>' + e(data.actual_output) + '</pre></div>' +
          '</div>';
      } else {
        const labels = {
          error_parse: 'PARSE ERROR', error_runtime: 'RUNTIME ERROR',
          timeout: 'TIME LIMIT EXCEEDED', invalid: 'INVALID SUBMISSION', error: 'ERROR'
        };
        const label = labels[data.status] || String(data.status).toUpperCase();
        wrap.innerHTML =
          '<div class="result error">' +
          '<div class="result-title" style="color:var(--vscode-editorWarning-foreground)">' + e(label) + '</div>' +
          (data.error ? '<pre>' + e(data.error) + '</pre>' : '') +
          '</div>';
      }
    }

    const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
    function renderLeaderboard(rows) {
      const el = document.getElementById('leaderboard');
      if (!rows?.length) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">No correct submissions yet — be the first!</p>';
        return;
      }
      let html = '<table><thead><tr><th>#</th><th>Handle</th><th>ms</th><th>chars</th><th>lang</th></tr></thead><tbody>';
      for (const r of rows) {
        html += '<tr><td>' + (MEDALS[r.rank] || r.rank) + '</td>' +
                '<td class="lb-handle">' + e(r.handle) + '</td>' +
                '<td>' + r.timing_ms + '</td>' +
                '<td>' + r.char_count + '</td>' +
                '<td>' + e(r.language) + '</td></tr>';
      }
      html += '</tbody></table>';
      el.innerHTML = html;
    }

    function renderMySubmissions(rows) {
      const el = document.getElementById('mySubContent');
      if (rows === null) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">Sign in to qLab to see your submissions.</p>';
        return;
      }
      if (!rows.length) {
        el.innerHTML = '<p style="color:var(--vscode-descriptionForeground)">No submissions yet for this problem.</p>';
        return;
      }
      let html = '<table><thead><tr><th>Date</th><th>Status</th><th>ms</th><th>chars</th><th>lang</th></tr></thead><tbody>';
      for (const r of rows) {
        const date = new Date(r.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const statusClass = 'sub-' + r.status;
        const star = r.is_best ? '<span class="best-star">★</span>' : '';
        const ms = r.timing_ms != null ? r.timing_ms : '—';
        const chars = r.char_count != null ? r.char_count : '—';
        html += '<tr class="' + (r.is_best ? 'best-row' : '') + '">' +
                '<td>' + e(date) + '</td>' +
                '<td class="' + statusClass + '">' + star + e(r.status) + '</td>' +
                '<td>' + ms + '</td>' +
                '<td>' + chars + '</td>' +
                '<td>' + e(r.language) + '</td></tr>';
      }
      html += '</tbody></table>';
      el.innerHTML = html;
    }

    function e(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
  </script>
</body>
</html>`
}
