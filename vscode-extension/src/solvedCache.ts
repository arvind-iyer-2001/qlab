import * as vscode from 'vscode'
import type { QLabApi, ProblemSummary, UserSubmission } from './api'

export type SolvedStatus = 'solved' | 'attempted'

interface CacheShape {
  statusBySlug: Record<string, SolvedStatus>
  bestMsBySlug: Record<string, number>
}

const KEY = 'qlab.solvedBySlug'
const EMPTY: CacheShape = { statusBySlug: {}, bestMsBySlug: {} }

export class SolvedCache {
  private readonly _onDidChange = new vscode.EventEmitter<void>()
  readonly onDidChange = this._onDidChange.event

  constructor(private readonly memento: vscode.Memento) {}

  private read(): CacheShape {
    return this.memento.get<CacheShape>(KEY, EMPTY)
  }

  private write(next: CacheShape): Thenable<void> {
    return this.memento.update(KEY, next)
  }

  status(slug: string): SolvedStatus | undefined {
    return this.read().statusBySlug[slug]
  }

  bestMs(slug: string): number | undefined {
    return this.read().bestMsBySlug[slug]
  }

  /** Mark a single slug solved locally after a successful submit. */
  async markSolved(slug: string, timingMs?: number): Promise<void> {
    const cur = this.read()
    const next: CacheShape = {
      statusBySlug: { ...cur.statusBySlug, [slug]: 'solved' },
      bestMsBySlug: { ...cur.bestMsBySlug },
    }
    if (timingMs != null) {
      const prev = cur.bestMsBySlug[slug]
      if (prev == null || timingMs < prev) {
        next.bestMsBySlug[slug] = timingMs
      }
    }
    await this.write(next)
    this._onDidChange.fire()
  }

  /** Mark attempted but not solved (used on wrong/runtime/error submissions). */
  async markAttempted(slug: string): Promise<void> {
    const cur = this.read()
    if (cur.statusBySlug[slug]) return  // never downgrade
    const next: CacheShape = {
      statusBySlug: { ...cur.statusBySlug, [slug]: 'attempted' },
      bestMsBySlug: cur.bestMsBySlug,
    }
    await this.write(next)
    this._onDidChange.fire()
  }

  /** Reconcile against the server. Pass the current problem list for the id→slug map. */
  async refresh(api: QLabApi, problems: ProblemSummary[]): Promise<void> {
    const result = await api.getMySubmissions().catch(() => null)
    if (!result || result === 'expired') return  // silent on auth/network errors
    const subs: UserSubmission[] = result

    const idToSlug = new Map<number, string>(problems.map(p => [p.id, p.slug]))

    const statusBySlug: Record<string, SolvedStatus> = {}
    const bestMsBySlug: Record<string, number> = {}
    for (const s of subs) {
      const slug = idToSlug.get(s.problem_id)
      if (!slug) continue
      if (s.status === 'correct') {
        statusBySlug[slug] = 'solved'
        if (s.timing_ms != null) {
          const prev = bestMsBySlug[slug]
          if (prev == null || s.timing_ms < prev) {
            bestMsBySlug[slug] = s.timing_ms
          }
        }
      } else if (!statusBySlug[slug]) {
        statusBySlug[slug] = 'attempted'
      }
    }
    await this.write({ statusBySlug, bestMsBySlug })
    this._onDidChange.fire()
  }
}
