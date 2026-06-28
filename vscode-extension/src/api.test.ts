import { afterEach, describe, expect, it, vi } from 'vitest'
import { QLabApi } from './api'

/** Build a fake fetch that records calls and returns a canned Response. */
function mockFetch(impl: (url: string, init?: RequestInit) => { status?: number; body?: unknown }) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const { status = 200, body = {} } = impl(url, init)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response
  })
  vi.stubGlobal('fetch', fn)
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('QLabApi public GETs', () => {
  it('getProblems hits /problems on the base url', async () => {
    const calls = mockFetch(() => ({ body: [{ slug: 'p1' }] }))
    const api = new QLabApi('http://api.test')
    const out = await api.getProblems()
    expect(calls[0].url).toBe('http://api.test/problems')
    expect(out).toEqual([{ slug: 'p1' }])
  })

  it('getLeaderboard passes the limit query param', async () => {
    const calls = mockFetch(() => ({ body: [] }))
    await new QLabApi('http://api.test').getLeaderboard('same-same', 5)
    expect(calls[0].url).toBe('http://api.test/problems/same-same/leaderboard?limit=5')
  })

  it('throws on a non-ok public GET', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(new QLabApi('http://api.test').getProblem('x')).rejects.toThrow(/returned 500/)
  })
})

describe('QLabApi auth handling', () => {
  it('attaches a Bearer token when getToken yields one', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { status: 'correct' } }))
    const api = new QLabApi('http://api.test', async () => 'tok-123')
    await api.submitSolution(1, 'func:{x}')
    const headers = calls[0].init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer tok-123')
  })

  it('returns "expired" from authGet when no token is available', async () => {
    mockFetch(() => ({ body: [] }))
    const api = new QLabApi('http://api.test', async () => undefined)
    expect(await api.getMySubmissions()).toBe('expired')
  })

  it('maps 401 on authGet to "expired"', async () => {
    mockFetch(() => ({ status: 401 }))
    const api = new QLabApi('http://api.test', async () => 'tok')
    expect(await api.getMySubmissions(3)).toBe('expired')
  })
})

describe('QLabApi submit result mapping', () => {
  it('maps a 401 submission to an unauthorized result', async () => {
    mockFetch(() => ({ status: 401, body: {} }))
    const out = await new QLabApi('http://api.test', async () => 't').submitSolution(1, 'c')
    expect(out.status).toBe('unauthorized')
  })

  it('maps a 422 submission to an invalid result with the validation message', async () => {
    mockFetch(() => ({ status: 422, body: { detail: [{ msg: 'func needs one param' }] } }))
    const out = await new QLabApi('http://api.test', async () => 't').submitSolution(1, 'c')
    expect(out.status).toBe('invalid')
    expect(out.error).toBe('func needs one param')
  })
})
