import * as vscode from 'vscode'
import type { QLabApi, ProblemSummary } from './api'
import type { SolvedCache } from './solvedCache'

/** Groups problems by difficulty in the sidebar tree. */
export class ProblemsProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private problems: ProblemSummary[] = []
  private error: string | null = null

  constructor(
    private api: QLabApi,
    private readonly solved: SolvedCache,
  ) {
    solved.onDidChange(() => this._onDidChangeTreeData.fire())
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getProblems(): ProblemSummary[] {
    return this.problems
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return node
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (element instanceof DifficultyGroup) {
      return this.problems
        .filter(p => p.difficulty === element.difficulty)
        .map(p => new ProblemItem(p, this.solved.status(p.slug), this.solved.bestMs(p.slug)))
    }

    // Root — load problems and return difficulty groups
    try {
      this.problems = await this.api.getProblems()
      this.error = null
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
      return [new ErrorItem('Cannot reach qLab API', 'Is the server running? (./start.sh)')]
    }

    if (!this.problems.length) {
      return [new ErrorItem('No problems found', '')]
    }

    const groups: DifficultyGroup[] = []
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      const count = this.problems.filter(p => p.difficulty === diff).length
      if (count) {
        groups.push(new DifficultyGroup(diff, count))
      }
    }
    return groups
  }
}

// ── Tree node types ────────────────────────────────────────────────────────

type TreeNode = DifficultyGroup | ProblemItem | ErrorItem

class DifficultyGroup extends vscode.TreeItem {
  constructor(
    public readonly difficulty: 'easy' | 'medium' | 'hard',
    count: number
  ) {
    super(
      `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${count})`,
      vscode.TreeItemCollapsibleState.Expanded
    )
    this.contextValue = 'difficultyGroup'
    this.iconPath = new vscode.ThemeIcon(
      'circle-filled',
      new vscode.ThemeColor(DIFF_COLORS[difficulty])
    )
  }
}

class ProblemItem extends vscode.TreeItem {
  constructor(
    public readonly problem: ProblemSummary,
    solvedStatus?: 'solved' | 'attempted',
    bestMs?: number,
  ) {
    super(problem.title, vscode.TreeItemCollapsibleState.None)

    const descParts: string[] = [`${problem.solve_count} solves`]
    if (solvedStatus === 'solved' && bestMs != null) {
      descParts.unshift(`★ ${bestMs}ms`)
    }
    this.description = descParts.join(' · ')

    const tipLines = [
      `**${problem.title}**`,
      problem.concepts.join(' · '),
      `_${problem.posted_date}_`,
    ]
    if (solvedStatus === 'solved') {
      tipLines.push(bestMs != null ? `Solved · best **${bestMs}ms**` : 'Solved')
    } else if (solvedStatus === 'attempted') {
      tipLines.push('Attempted')
    }
    this.tooltip = new vscode.MarkdownString(tipLines.join('  \n'))

    this.contextValue = 'problem'

    if (solvedStatus === 'solved') {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'))
    } else if (solvedStatus === 'attempted') {
      this.iconPath = new vscode.ThemeIcon('circle-outline')
    } else {
      this.iconPath = new vscode.ThemeIcon(
        'circle-small-filled',
        new vscode.ThemeColor(DIFF_COLORS[problem.difficulty])
      )
    }

    this.command = {
      command: 'qlab.openProblem',
      title: 'Open Problem',
      arguments: [problem],
    }
  }
}

class ErrorItem extends vscode.TreeItem {
  constructor(message: string, detail: string) {
    super(message, vscode.TreeItemCollapsibleState.None)
    this.description = detail
    this.iconPath = new vscode.ThemeIcon('error')
    this.contextValue = 'error'
  }
}

const DIFF_COLORS: Record<string, string> = {
  easy:   'testing.iconPassed',
  medium: 'editorWarning.foreground',
  hard:   'testing.iconFailed',
}
