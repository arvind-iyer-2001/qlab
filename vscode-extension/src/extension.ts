import * as vscode from 'vscode'
import { QLabApi } from './api'
import { ProblemsProvider } from './ProblemsProvider'
import { ProblemPanel } from './ProblemPanel'
import type { ProblemSummary } from './api'

const TOKEN_KEY = 'qlab.token'

async function setSignedInContext(token: string | undefined): Promise<void> {
  await vscode.commands.executeCommand('setContext', 'qlab.signedIn', !!token)
}

export function activate(context: vscode.ExtensionContext): void {
  const cfg = () => vscode.workspace.getConfiguration('qlab')

  const getToken = () => Promise.resolve(context.secrets.get(TOKEN_KEY))

  // Sync sign-in context on activation
  getToken().then(setSignedInContext)

  // Update context whenever the secret changes (e.g. sign-in via URI handler)
  context.secrets.onDidChange(async e => {
    if (e.key === TOKEN_KEY) {
      setSignedInContext(await getToken())
    }
  })

  // Show welcome prompt once on first install (not on every activation)
  const welcomed = context.globalState.get<boolean>('qlab.welcomed')
  if (!welcomed) {
    context.globalState.update('qlab.welcomed', true)
    getToken().then(token => {
      if (!token) {
        vscode.window.showInformationMessage(
          'Welcome to qLab! Sign in to submit solutions.',
          'Sign In'
        ).then(action => {
          if (action === 'Sign In') vscode.commands.executeCommand('qlab.signIn')
        })
      }
    })
  }

  const api = () => new QLabApi(
    cfg().get<string>('apiUrl') ?? 'http://localhost:8000',
    getToken
  )

  // ── Sidebar tree ─────────────────────────────────────────────────────────
  const provider = new ProblemsProvider(api())
  const tree = vscode.window.createTreeView('qlab.problems', {
    treeDataProvider: provider,
    showCollapseAll: false,
  })

  // ── Commands ──────────────────────────────────────────────────────────────

  const refresh = vscode.commands.registerCommand('qlab.refresh', () => {
    provider['api'] = api()
    provider.refresh()
  })

  const openProblem = vscode.commands.registerCommand(
    'qlab.openProblem',
    async (problem?: ProblemSummary) => {
      if (!problem) {
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

    const fileName = editor.document.fileName
    const slugMatch = fileName.match(/([^/\\]+)\.q$/)
    if (!slugMatch) {
      vscode.window.showWarningMessage('Could not determine problem from filename.')
      return
    }
    const slug = slugMatch[1]

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

  const signIn = vscode.commands.registerCommand('qlab.signIn', async () => {
    const webUrl = cfg().get<string>('webUrl') ?? 'http://localhost:9091'
    await vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/sign-in`))
  })

  const signInToolbar = vscode.commands.registerCommand('qlab.signInToolbar', async () => {
    vscode.commands.executeCommand('qlab.signIn')
  })

  const openProfile = vscode.commands.registerCommand('qlab.openProfile', async () => {
    const webUrl = cfg().get<string>('webUrl') ?? 'http://localhost:9091'
    await vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/profile`))
  })

  const signOut = vscode.commands.registerCommand('qlab.signOut', async () => {
    const token = await getToken()
    if (!token) {
      vscode.window.showInformationMessage('You are not signed in to qLab.')
      return
    }
    const confirm = await vscode.window.showWarningMessage(
      'Sign out of qLab?',
      { modal: true },
      'Sign Out'
    )
    if (confirm !== 'Sign Out') return

    await context.secrets.delete(TOKEN_KEY)
    await setSignedInContext(undefined)
    provider['api'] = api()
    provider.refresh()

    const webUrl = cfg().get<string>('webUrl') ?? 'http://localhost:9091'
    await vscode.env.openExternal(vscode.Uri.parse(`${webUrl}/sign-out`))
    vscode.window.showInformationMessage('Signed out of qLab.')
  })

  // ── URI handler — handles /open and /auth paths ───────────────────────────
  const uriHandler = vscode.window.registerUriHandler({
    async handleUri(uri: vscode.Uri) {
      if (uri.path === '/open') {
        const params = new URLSearchParams(uri.query)
        const slug = params.get('slug')
        if (!slug) {
          vscode.window.showErrorMessage('qLab URI missing ?slug= parameter.')
          return
        }
        await ProblemPanel.open(slug, api(), context.extensionUri).catch(err => {
          vscode.window.showErrorMessage(`Failed to open problem: ${err}`)
        })
        return
      }

      if (uri.path === '/auth') {
        const params = new URLSearchParams(uri.query)
        const token = params.get('token')
        if (!token) {
          vscode.window.showErrorMessage('qLab: sign-in failed — no token received.')
          return
        }
        await context.secrets.store(TOKEN_KEY, token)
        vscode.window.showInformationMessage('Signed in to qLab.')
        return
      }
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
    tree, refresh, openProblem, submitActive, setApiUrl, signIn, signInToolbar, openProfile, signOut, uriHandler, configWatcher
  )
}

export function deactivate(): void {}
