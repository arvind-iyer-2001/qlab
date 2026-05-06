const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// --- Types ---

export type Difficulty = 'easy' | 'medium' | 'hard'
export type Language = 'q' | 'k'
export type SubmissionStatus =
  | 'pending' | 'running' | 'correct' | 'wrong'
  | 'error' | 'error_runtime' | 'error_parse' | 'timeout' | 'invalid'

export interface ProblemSummary {
  id: number
  slug: string
  title: string
  difficulty: Difficulty
  concepts: string[]
  posted_date: string
  solve_count: number
}

export interface Example {
  input: string
  output: string
  note?: string
}

export interface ProblemDetail {
  id: number
  slug: string
  title: string
  difficulty: Difficulty
  concepts: string[]
  narrative: string
  input_spec: string
  output_spec: string
  examples: Example[]
  hints: string[]
  posted_date: string
  winning_criteria: string
  test_call: string
}

export interface LeaderboardEntry {
  rank: number
  handle: string
  timing_ms: number
  char_count: number
  language: Language
  submitted_at: string
}

export interface MySubmissionEntry {
  problem_id: number
  handle: string
  status: SubmissionStatus
  timing_ms?: number
  char_count?: number
  language: Language
  submitted_at: string
  is_best: boolean
  code: string
}

export interface EditorialTier {
  locked: boolean
  reason?: string
  content?: string
}

export interface ReferenceTier {
  locked: boolean
  reason?: string
  code?: string
}

export interface CommunitySolution {
  rank: number
  handle: string
  timing_ms: number
  char_count: number
  language: Language
  code: string
}

export interface SolutionsResponse {
  attempt_count: number
  hints_revealed: number
  hints_total: number
  hints: string[]
  editorial: EditorialTier
  reference: ReferenceTier
  community: CommunitySolution[]
}

export interface HintRevealResponse {
  hint: string
  revealed: number
  total: number
}

export interface SubmissionResponse {
  submission_id?: number
  problem_id: number
  status: SubmissionStatus
  timing_ms?: number
  char_count?: number
  leaderboard_rank?: number
  error?: string
  failing_input?: string
  expected_output?: string
  actual_output?: string
}

export interface ExecuteResponse {
  output: string
  error: string | null
  ok: boolean
}

// --- Fetch helper ---

async function apiFetch<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// --- API calls ---

export const api = {
  getProblems: (token: string | null) =>
    apiFetch<ProblemSummary[]>('/problems', token),

  getProblem: (slug: string, token: string | null) =>
    apiFetch<ProblemDetail>(`/problems/${slug}`, token),

  getLeaderboard: (slug: string, token: string | null) =>
    apiFetch<LeaderboardEntry[]>(`/problems/${slug}/leaderboard`, token),

  getSolutions: (slug: string, token: string | null) =>
    apiFetch<SolutionsResponse>(`/problems/${slug}/solutions`, token),

  getMySubmissions: (token: string | null, problemId?: number) =>
    apiFetch<MySubmissionEntry[]>(
      problemId ? `/submissions/me?problem_id=${problemId}` : '/submissions/me',
      token,
    ),

  submit: (
    body: { problem_id: number; code: string; language?: Language },
    token: string | null,
  ) =>
    apiFetch<SubmissionResponse>('/submissions', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  execute: (code: string, token: string | null) =>
    apiFetch<ExecuteResponse>('/notebook/execute', token, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  revealHint: (slug: string, token: string | null) =>
    apiFetch<HintRevealResponse>(
      `/problems/${slug}/solutions/hints/reveal`,
      token,
      { method: 'POST' },
    ),
}
