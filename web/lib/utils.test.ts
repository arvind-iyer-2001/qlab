import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('lets later tailwind classes win on conflict', () => {
    // twMerge dedupes conflicting utilities, keeping the last.
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('supports conditional object syntax', () => {
    expect(cn({ a: true, b: false })).toBe('a')
  })
})
