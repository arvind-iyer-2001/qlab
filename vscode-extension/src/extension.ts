import * as vscode from 'vscode'
import { QLabApi } from './api'
import { ProblemsProvider } from './ProblemsProvider'
import { ProblemPanel } from './ProblemPanel'
import type { ProblemSummary } from './api'

export function activate(context: vscode.ExtensionContext): void {
  const cfg = () => vscode.workspace.getConfiguration('qlab')
  const api = () => new QLabApi(cfg().get<string>('apiUrl') ?? 'http://localhost:8000')

  // ── Sidebar tree ─────────────────────────────────────────────────────────
  const provider = new ProblemsProvider(api())
  const tree = vscode.window.createTreeView('qlab.problems', {
    treeDataProvider: provider,
    showCollapseAll: false,
  })

  // ── Commands ──────────────────────────────────────────────────────────────

  const refresh = vscode.commands.registerCommand('qlab.refresh', () => {
    // Re-create provider with fresh API URL in case it changed
    provider['api'] = api()
    provider.refresh()
  })

  const openProblem = vscode.commands.registerCommand(
    'qlab.openProblem',
    async (problem?: ProblemSummary) => {
      if (!problem) {
        // Called from command palette — let user pick
        const problems = await api().getProblems().catch(() => null)

        if (!problems?.length) {
          vscode.window.showErrorMessage('Could not load problems. Is qLab running? (./start.sh)')
          return
        }

        type PickItem = vscode.QuickPickItem & { problem: ProblemSummary }
        const items: PickItem[] = problems.map(p => ({
          label: p.title,
          description: `[${p.difficulty}]  ${p.solve_count} solves`,
          detail: p.concepts.join(', '),
          problem: p,
        }))

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a problem',
          matchOnDescription: true,
          matchOnDetail: true,
        })

        if (!picked) return
        problem = picked.problem
      }

      await ProblemPanel.open(problem.slug, api(), context.extensionUri).catch(err => {
        vscode.window.showErrorMessage(`Failed to open problem: ${err}`)
      })
    }
  )

  const submitActive = vscode.commands.registerCommand('qlab.submitActive', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || !editor.document.fileName.endsWith('.q')) {
      vscode.window.showWarningMessage('Open a .q solution file first.')
      return
    }

    // Try to find which problem this file belongs to from the filename
    const fileName = editor.document.fileName
    const slugMatch = fileName.match(/([^/\\]+)\.q$/)
    if (!slugMatch) {
      vscode.window.showWarningMessage('Could not determine problem from filename.')
      return
    }
    const slug = slugMatch[1]

    // Open the panel (it will handle the submit after load)
    await ProblemPanel.open(slug, api(), context.extensionUri).catch(err => {
      vscode.window.showErrorMessage(`Failed to open problem panel: ${err}`)
    })
  })

  const setApiUrl = vscode.commands.registerCommand('qlab.setApiUrl', async () => {
    const current = cfg().get<string>('apiUrl') ?? 'http://localhost:8000'
    const url = await vscode.window.showInputBox({
      prompt: 'qLab API URL',
      value: current,
      placeHolder: 'http://localhost:8000',
    })
    if (url !== undefined) {
      await cfg().update('apiUrl', url, vscode.ConfigurationTarget.Workspace)
      provider['api'] = api()
      provider.refresh()
      vscode.window.showInformationMessage(`qLab API URL set to ${url}`)
    }
  })

  // ── URI handler — vscode://qlab.qlab/open?slug=<slug> ────────────────────
  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path !== '/open') return
      const params = new URLSearchParams(uri.query)
      const slug = params.get('slug')
      if (!slug) {
        vscode.window.showErrorMessage('qLab URI missing ?slug= parameter.')
        return
      }
      await ProblemPanel.open(slug, api(), context.extensionUri).catch(err => {
        vscode.window.showErrorMessage(`Failed to open problem: ${err}`)
      })
    },
  })

  // ── Refresh on config change ──────────────────────────────────────────────
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('qlab.apiUrl')) {
      provider['api'] = api()
      provider.refresh()
    }
  })

  context.subscriptions.push(
    tree,
    refresh,
    openProblem,
    submitActive,
    setApiUrl,
    uriHandler,
    configWatcher
  )
}

export function deactivate(): void {}
