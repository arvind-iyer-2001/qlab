/**
 * Typed HTTP client for the qLab FastAPI backend.
 * Uses Node 18+ global fetch (available in VS Code 1.85+).
 */

export interface ProblemSummary {
  id: number
  slug: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  concepts: string[]
  posted_date: string
  solve_count: number
}

export interface Example {
  input: string
  output: string
  note?: string
}

export interface ProblemDetail extends ProblemSummary {
  narrative: string
  input_spec: string
  output_spec: string
  examples: Example[]
  hints: string[]
  winning_criteria: string
  test_call: string
}

export interface LeaderboardEntry {
  rank: number
  handle: string
  timing_ms: number
  char_count: number
  language: string
  submitted_at: string
}

export interface SubmitResult {
  submission_id?: number
  problem_id?: number
  status: string
  timing_ms?: number
  char_count?: number
  leaderboard_rank?: number
  error?: string
  failing_input?: string
  expected_output?: string
  actual_output?: string
}

export interface ExecuteResult {
  ok: boolean
  output?: string
  error?: string
}

export class QLabApi {
  constructor(
    private baseUrl: string,
    private getToken?: () => Promise<string | undefined>
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`)
    if (!res.ok) {
      throw new Error(`API ${path} returned ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  private async post<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (this.getToken) {
      const token = await this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as T
    return { status: res.status, data }
  }

  async getProblems(): Promise<ProblemSummary[]> {
    return this.get<ProblemSummary[]>('/problems')
  }

  async getProblem(slug: string): Promise<ProblemDetail> {
    return this.get<ProblemDetail>(`/problems/${slug}`)
  }

  async getLeaderboard(slug: string, limit = 10): Promise<LeaderboardEntry[]> {
    return this.get<LeaderboardEntry[]>(`/problems/${slug}/leaderboard?limit=${limit}`)
  }

  async submitSolution(
    problemId: number,
    code: string,
    handle: string,
    language = 'q'
  ): Promise<SubmitResult> {
    const { status, data } = await this.post<SubmitResult & { detail?: unknown[] }>(
      '/submissions',
      { problem_id: problemId, code, language, handle }
    )
    if (status === 401 || status === 403) {
      return { status: 'unauthorized', error: 'Please sign in to submit' }
    }
    if (status === 422) {
      const detail = (data as { detail?: Array<{ msg?: string }> }).detail
      const msg = detail?.[0]?.msg ?? JSON.stringify(detail)
      return { status: 'invalid', error: msg }
    }
    return data
  }

  async executeCode(code: string): Promise<ExecuteResult> {
    const { data } = await this.post<ExecuteResult>('/notebook/execute', { code })
    return data
  }

  async resetNotebook(): Promise<void> {
    await this.post('/notebook/reset', {})
  }
}
