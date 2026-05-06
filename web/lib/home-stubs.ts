// Static seed data for the home screen. Replace each section with a real API
// call before any external launch — every TODO comment names the endpoint.

export interface TickerEntry {
  handle: string
  problem_title: string
  problem_slug: string
  difficulty: 'easy' | 'medium' | 'hard'
  timing_ms: number
  char_count: number
}

// TODO(home-stubs): replace with GET /submissions/recent?limit=20
export const RECENT_SUBMISSIONS: TickerEntry[] = [
  { handle: 'kx_arvind', problem_title: 'Same Same', problem_slug: 'same-same', difficulty: 'easy', timing_ms: 2, char_count: 14 },
  { handle: 'qmaster',   problem_title: 'Trade Bucket', problem_slug: 'trade-bucket', difficulty: 'medium', timing_ms: 47, char_count: 38 },
  { handle: 'tickwiz',   problem_title: 'Window Sum', problem_slug: 'window-sum', difficulty: 'easy', timing_ms: 5, char_count: 22 },
  { handle: 'vectorize', problem_title: 'Asof Join Lite', problem_slug: 'asof-join-lite', difficulty: 'hard', timing_ms: 112, char_count: 61 },
  { handle: 'kdb_owl',   problem_title: 'Same Same', problem_slug: 'same-same', difficulty: 'easy', timing_ms: 3, char_count: 16 },
  { handle: 'qmaster',   problem_title: 'Window Sum', problem_slug: 'window-sum', difficulty: 'easy', timing_ms: 4, char_count: 19 },
  { handle: 'tickwiz',   problem_title: 'Asof Join Lite', problem_slug: 'asof-join-lite', difficulty: 'hard', timing_ms: 138, char_count: 72 },
  { handle: 'kx_arvind', problem_title: 'Trade Bucket', problem_slug: 'trade-bucket', difficulty: 'medium', timing_ms: 51, char_count: 41 },
]

export interface PillarStat {
  label: string
  value: string
}

// TODO(home-stubs): replace problems_count with GET /problems (length)
//                   replace top_handle/top_time with GET /leaderboard/global?limit=1
export const PILLAR_STATS: { problems: PillarStat; capstones: PillarStat; leaderboard: PillarStat } = {
  problems:    { label: 'problems',     value: '12' },
  capstones:   { label: 'coming soon',  value: '5 tracks' },
  leaderboard: { label: 'top time',     value: '@kx_arvind · 2ms' },
}

export interface LeaderRow {
  rank: number
  handle: string
  best_time_ms: number
  solved: number
}

// TODO(home-stubs): replace with GET /leaderboard/global?limit=5
export const TOP_FIVE: LeaderRow[] = [
  { rank: 1, handle: 'kx_arvind', best_time_ms: 2,  solved: 12 },
  { rank: 2, handle: 'qmaster',   best_time_ms: 3,  solved: 11 },
  { rank: 3, handle: 'tickwiz',   best_time_ms: 4,  solved: 10 },
  { rank: 4, handle: 'vectorize', best_time_ms: 5,  solved: 9 },
  { rank: 5, handle: 'kdb_owl',   best_time_ms: 5,  solved: 8 },
]

// TODO(home-stubs): replace with GET /stats/weekly (count of correct submissions, last 7 days)
export const WEEKLY_SOLVES: number = 187

export interface CapstoneTrack {
  title: string
  teaser: string
}

export const CAPSTONE_TRACKS: CapstoneTrack[] = [
  { title: 'Partitioned Databases',  teaser: 'A year of trade ticks. .Q.dpft. Time-window queries under a memory budget.' },
  { title: 'Joins Under Load',       teaser: 'aj, wj, lj over realistic order/quote books. Correctness and throughput judged.' },
  { title: 'Tickerplant Scenarios',  teaser: 'Feed handlers, RDB → HDB end-of-day, recovery semantics.' },
  { title: 'Optimization Gauntlet',  teaser: 'Beat a slow reference query by 5× without changing the schema.' },
  { title: 'Schema Design',          teaser: 'Open-ended. Judged against a battery of analytical queries.' },
]
