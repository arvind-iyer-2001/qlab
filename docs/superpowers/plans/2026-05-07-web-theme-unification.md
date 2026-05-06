# Web Theme Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Propagate the home page's zinc-950 + emerald + Aceternity-flavoured theme to `/problems`, `/profile` (+ `/profile/setup`), and the auth pages (`/sign-in`, `/sign-up`, `/auth/callback`, `/sign-out`), retiring the orange Leetcode-style palette.

**Architecture:** Token-first migration. Step 1 swaps the design tokens in `tailwind.config.js` and `globals.css` to semantic names (`background`, `surface`, `border`, `primary`, `fg.*`) backed by zinc + emerald scales. Step 2 introduces five small shared primitives in `web/components/ui/` (`Brand`, `Crumbs`, `Pill`, `Card`, `Button`). Steps 3-6 migrate pages one at a time. Step 7 deletes the legacy `accent`/`bg`/`panel` tokens once nothing references them.

**Tech Stack:** Next.js 14, React 18, Tailwind 3.4, `@clerk/nextjs` 5.0, TypeScript. No test framework is configured for the web app — verification at each step is `npm run build` (TypeScript + Next.js compile) plus a manual browser check on `npm run dev` (`http://localhost:9091`).

**Source spec:** `docs/superpowers/specs/2026-05-07-web-theme-unification-design.md`

---

## File Structure

**Created:**
- `web/components/ui/Brand.tsx` — `qLab` wordmark, optional link mode
- `web/components/ui/Crumbs.tsx` — `<Brand/> / <current page>` row
- `web/components/ui/Pill.tsx` — filter pill with `active` / `inactive` variants
- `web/components/ui/Card.tsx` — single bordered surface
- `web/components/ui/Button.tsx` — `primary` / `secondary` variants

**Modified:**
- `web/tailwind.config.js` — replace color tokens
- `web/app/globals.css` — replace `:root` CSS vars
- `web/app/problems/page.tsx` — drop inline styles, use primitives
- `web/components/ProblemsTable.tsx` — drop inline styles, use Tailwind + primitives
- `web/app/profile/page.tsx` — re-skin
- `web/app/profile/setup/page.tsx` — re-skin
- `web/app/sign-in/[[...sign-in]]/page.tsx` — Clerk `appearance` + `<Brand/>` shell
- `web/app/sign-up/[[...sign-up]]/page.tsx` — same
- `web/app/sign-out/page.tsx` — re-skin
- `web/app/auth/callback/page.tsx` — re-skin

---

## Task 1: Swap design tokens

Replace the orange-leaning palette with zinc + emerald semantic tokens. Visually a near no-op (the home page uses literal `zinc-950` / `emerald-*` classes already), but it changes what `bg-easy`, `text-fg-*`, etc. resolve to.

**Files:**
- Modify: `web/tailwind.config.js`
- Modify: `web/app/globals.css`

- [ ] **Step 1: Replace the `theme.extend.colors` block in `tailwind.config.js`**

Open `web/tailwind.config.js` and replace the current `colors` object so the file reads exactly:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#18181b',
        'surface-2': 'rgba(39, 39, 42, 0.5)',
        border: '#27272a',
        fg: {
          primary: '#fafafa',
          secondary: '#d4d4d8',
          muted: '#71717a',
        },
        primary: {
          DEFAULT: '#10b981',
          hover: '#34d399',
        },
        easy: '#34d399',
        medium: '#fbbf24',
        hard: '#f87171',
      },
    },
  },
  plugins: [],
}
```

Note: the legacy `bg`, `panel`, `accent`, `code-bg`, and old `text.*` tokens are removed. Inline styles in unmigrated pages reference hex literals (`#1a1a1a`, `#ffa116`) directly, not these tokens, so removing the names doesn't break them — those pages get migrated in tasks 3-6.

- [ ] **Step 2: Update `globals.css` `:root` vars to match**

Open `web/app/globals.css` and replace it entirely with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #09090b;
  --surface: #18181b;
  --border: #27272a;
  --fg-primary: #fafafa;
  --fg-secondary: #d4d4d8;
  --fg-muted: #71717a;
  --primary: #10b981;
  --primary-hover: #34d399;
  --easy: #34d399;
  --medium: #fbbf24;
  --hard: #f87171;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background-color: var(--background);
  color: var(--fg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] **Step 3: Verify build still passes**

Run from `web/`:

```bash
npm run build
```

Expected: build succeeds. Tailwind may warn about unused classes; that's fine. If a TypeScript error references a removed token (e.g., `bg-accent`), note the file and fix it in the task that owns it (don't fix here — tasks 3-6 cover them; if it's an unexpected file outside scope, fix inline).

- [ ] **Step 4: Visual smoke test of the home page**

Run `npm run dev`, open `http://localhost:9091`. Expected: home page looks identical to before (it uses literal `zinc-950` / `emerald-*` Tailwind classes, not the renamed tokens).

- [ ] **Step 5: Commit**

```bash
git add web/tailwind.config.js web/app/globals.css
git commit -m "refactor(web): swap design tokens to zinc+emerald semantic names"
```

---

## Task 2: Add `<Brand/>` primitive

The wordmark, used everywhere we currently inline `qLab` text.

**Files:**
- Create: `web/components/ui/Brand.tsx`

- [ ] **Step 1: Create `web/components/ui/Brand.tsx`**

```tsx
import Link from 'next/link'

interface BrandProps {
  as?: 'span' | 'link'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<NonNullable<BrandProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
}

export function Brand({ as = 'span', size = 'md' }: BrandProps) {
  const className = `font-mono font-bold text-emerald-400 ${SIZE[size]}`
  if (as === 'link') {
    return (
      <Link href="/" className={`${className} hover:text-emerald-300 transition`}>
        qLab
      </Link>
    )
  }
  return <span className={className}>qLab</span>
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/components/ui/Brand.tsx
git commit -m "feat(web): add Brand primitive"
```

---

## Task 3: Add `<Crumbs/>` primitive

Replaces the inline `qLab / Page` header on `/problems` and similar.

**Files:**
- Create: `web/components/ui/Crumbs.tsx`

- [ ] **Step 1: Create `web/components/ui/Crumbs.tsx`**

```tsx
import { Brand } from './Brand'

interface CrumbsProps {
  current: string
  rightSlot?: React.ReactNode
}

export function Crumbs({ current, rightSlot }: CrumbsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Brand as="link" size="md" />
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300 text-sm">{current}</span>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/components/ui/Crumbs.tsx
git commit -m "feat(web): add Crumbs primitive"
```

---

## Task 4: Add `<Pill/>` primitive

The filter pill used in the problems table and reusable for any segmented selector.

**Files:**
- Create: `web/components/ui/Pill.tsx`

- [ ] **Step 1: Create `web/components/ui/Pill.tsx`**

```tsx
'use client'

interface PillProps {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}

export function Pill({ active = false, onClick, children }: PillProps) {
  const base = 'px-3.5 py-1 rounded-full text-xs transition cursor-pointer select-none'
  const styles = active
    ? 'bg-emerald-500 text-zinc-950 font-semibold'
    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/components/ui/Pill.tsx
git commit -m "feat(web): add Pill primitive"
```

---

## Task 5: Add `<Card/>` primitive

The single surface style used on `/profile`.

**Files:**
- Create: `web/components/ui/Card.tsx`

- [ ] **Step 1: Create `web/components/ui/Card.tsx`**

```tsx
interface CardProps {
  label?: string
  children: React.ReactNode
  className?: string
}

export function Card({ label, children, className = '' }: CardProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      {label && (
        <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-1.5">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/components/ui/Card.tsx
git commit -m "feat(web): add Card primitive"
```

---

## Task 6: Add `<Button/>` primitive

`primary` and `secondary` variants matching the home Hero CTAs.

**Files:**
- Create: `web/components/ui/Button.tsx`

- [ ] **Step 1: Create `web/components/ui/Button.tsx`**

```tsx
import Link from 'next/link'

type Variant = 'primary' | 'secondary'

interface CommonProps {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

interface ButtonAsButton extends CommonProps {
  as?: 'button'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}

interface ButtonAsLink extends CommonProps {
  as: 'link'
  href: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const BASE = 'inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-medium transition'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
  secondary: 'border border-zinc-700 text-zinc-200 hover:border-zinc-500',
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? 'primary'
  const cls = `${BASE} ${VARIANT[variant]} ${props.className ?? ''}`

  if (props.as === 'link') {
    return <Link href={props.href} className={cls}>{props.children}</Link>
  }

  return (
    <button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`${cls} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {props.children}
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add web/components/ui/Button.tsx
git commit -m "feat(web): add Button primitive"
```

---

## Task 7: Migrate `/problems` page and table

Strip inline styles, use primitives + Tailwind on the new tokens.

**Files:**
- Modify: `web/app/problems/page.tsx`
- Modify: `web/components/ProblemsTable.tsx`

- [ ] **Step 1: Rewrite `web/app/problems/page.tsx`**

Replace the file's contents entirely with:

```tsx
'use client'
import { useProblems } from '@/hooks/useProblems'
import { useMySubmissions } from '@/hooks/useMySubmissions'
import { ProblemsTable } from '@/components/ProblemsTable'
import { Crumbs } from '@/components/ui/Crumbs'

export default function ProblemsPage() {
  const { data: problems, isLoading, error } = useProblems()
  const { data: mySubmissions = [] } = useMySubmissions()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-8 py-8">
      <Crumbs
        current="Problems"
        rightSlot={
          <a href="/profile" className="text-zinc-400 text-sm hover:text-zinc-200 transition">
            Profile
          </a>
        }
      />

      <h1 className="text-2xl font-bold tracking-tight mb-1">All problems</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Single-function · judged on speed and length.
      </p>

      {isLoading && <p className="text-zinc-400">Loading problems…</p>}
      {error && <p className="text-rose-400">Failed to load problems.</p>}
      {problems && (
        <ProblemsTable problems={problems} mySubmissions={mySubmissions} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `web/components/ProblemsTable.tsx`**

Replace the file's contents entirely with:

```tsx
'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Difficulty, MySubmissionEntry, ProblemSummary } from '@/lib/api'
import { Pill } from '@/components/ui/Pill'

interface Props {
  problems: ProblemSummary[]
  mySubmissions: MySubmissionEntry[]
}

const DIFF_TEXT: Record<Difficulty, string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-rose-400',
}

const FILTERS = ['All', 'Easy', 'Medium', 'Hard'] as const
type Filter = typeof FILTERS[number]

export function ProblemsTable({ problems, mySubmissions }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('All')

  const bestByProblemId = useMemo(() => {
    const map = new Map<number, number>()
    for (const s of mySubmissions) {
      if (s.is_best && s.timing_ms != null) {
        map.set(s.problem_id, s.timing_ms)
      }
    }
    return map
  }, [mySubmissions])

  const filtered = useMemo(
    () =>
      filter === 'All'
        ? problems
        : problems.filter((p) => p.difficulty === filter.toLowerCase()),
    [problems, filter],
  )

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Pill>
        ))}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
            <th className="text-left px-3 py-2 w-12">#</th>
            <th className="text-left px-3 py-2">Title</th>
            <th className="text-left px-3 py-2 w-24">Difficulty</th>
            <th className="text-left px-3 py-2">Concepts</th>
            <th className="text-right px-3 py-2 w-24">Best</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const bestMs = bestByProblemId.get(p.id)
            return (
              <tr
                key={p.id}
                onClick={() => router.push(`/problems/${p.slug}`)}
                className="border-b border-zinc-900 cursor-pointer hover:bg-zinc-900/50 transition"
              >
                <td className="px-3 py-3 text-zinc-600">{p.id}</td>
                <td className="px-3 py-3 text-zinc-50 font-medium">{p.title}</td>
                <td className="px-3 py-3">
                  <span className={`${DIFF_TEXT[p.difficulty]} font-medium capitalize`}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-400 text-xs">
                  {p.concepts.join(', ')}
                </td>
                <td className="px-3 py-3 text-right">
                  {bestMs != null ? (
                    <span className="text-emerald-400 font-mono">✓ {bestMs}ms</span>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd web && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Visual smoke test**

`npm run dev`, navigate to `http://localhost:9091/problems`. Expected: zinc-950 background, emerald `qLab` brand in the crumb, emerald active-pill on "All", borders on rows are `zinc-900`-tier (very subtle), monospace timings in the Best column.

- [ ] **Step 5: Commit**

```bash
git add web/app/problems/page.tsx web/components/ProblemsTable.tsx
git commit -m "refactor(web): re-skin /problems with new theme"
```

---

## Task 8: Migrate `/profile` page

**Files:**
- Modify: `web/app/profile/page.tsx`

- [ ] **Step 1: Rewrite `web/app/profile/page.tsx`**

Replace the file's contents entirely with:

```tsx
'use client'
import { useUser, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Crumbs } from '@/components/ui/Crumbs'
import { Card } from '@/components/ui/Card'

interface QLabUser {
  nickname: string | null
  display_name: string
  email: string
  avatar_url: string | null
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()
  const [qlabUser, setQlabUser] = useState<QLabUser | null>(null)
  const [loadingQlab, setLoadingQlab] = useState(true)

  useEffect(() => {
    if (isLoaded && !user) {
      router.replace('/sign-in')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (!isLoaded || !user) return
    async function fetchQlabUser() {
      try {
        const token = await getToken()
        if (!token) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setQlabUser(await res.json())
      } catch {
        // API unreachable
      } finally {
        setLoadingQlab(false)
      }
    }
    fetchQlabUser()
  }, [isLoaded, user, getToken])

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        <p>Loading…</p>
      </div>
    )
  }

  const avatarUrl = qlabUser?.avatar_url || user.imageUrl
  const displayName = qlabUser?.display_name || user.fullName || user.username || 'qLab User'
  const email = qlabUser?.email || user.primaryEmailAddress?.emailAddress || ''

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(16,185,129,0.08), transparent 60%)',
        }}
      />
      <div className="relative z-10 max-w-2xl mx-auto px-8 py-8">
        <Crumbs current="Profile" />

        <div className="flex items-center gap-5 mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-16 h-16 rounded-full object-cover border border-zinc-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-zinc-400 text-sm font-mono mt-1">
              {qlabUser?.nickname ? `@${qlabUser.nickname}` : 'no handle'}
            </p>
          </div>
        </div>

        {!loadingQlab && (
          <div className="space-y-3">
            <Card label="Handle">
              {qlabUser?.nickname ? (
                <>
                  <p className="text-zinc-50 font-mono">{qlabUser.nickname}</p>
                  <a
                    href="/profile/setup"
                    className="text-emerald-400 text-xs hover:text-emerald-300 transition"
                  >
                    → change nickname
                  </a>
                </>
              ) : (
                <p className="text-rose-400 text-sm">
                  No nickname set.{' '}
                  <a href="/profile/setup" className="text-emerald-400 hover:text-emerald-300">
                    Set one now
                  </a>
                </p>
              )}
            </Card>

            {email && (
              <Card label="Email">
                <p className="text-zinc-50">{email}</p>
              </Card>
            )}
          </div>
        )}

        <p className="text-zinc-500 text-xs mt-6">Signed in to qLab</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Visual smoke test**

`npm run dev`, sign in, navigate to `http://localhost:9091/profile`. Expected: zinc-950 background with subtle emerald top-right glow, `qLab / Profile` crumb, avatar with zinc border, two cards (Handle, Email) with uppercase labels.

- [ ] **Step 4: Commit**

```bash
git add web/app/profile/page.tsx
git commit -m "refactor(web): re-skin /profile with new theme"
```

---

## Task 9: Migrate `/profile/setup` page

**Files:**
- Modify: `web/app/profile/setup/page.tsx`

- [ ] **Step 1: Rewrite `web/app/profile/setup/page.tsx`**

Replace the file's contents entirely with:

```tsx
'use client'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Brand } from '@/components/ui/Brand'
import { Button } from '@/components/ui/Button'

function ProfileSetupInner() {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromVscode = searchParams.get('from') === 'vscode'

  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) { setError('Nickname cannot be empty'); return }
    if (trimmed.length > 30) { setError('Nickname must be 30 characters or fewer'); return }
    setError('')
    setSaving(true)

    try {
      const token = await getToken()
      if (!token) {
        setError('Session expired. Please refresh the page.')
        setSaving(false)
        return
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/users/me/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.detail
        const msg = Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to save nickname')
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
        setSaving(false)
        return
      }

      if (fromVscode) {
        const freshToken = await getToken()
        window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(freshToken ?? '')}`
      } else {
        router.push('/profile')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-6 py-8 gap-6">
      <Brand as="link" size="lg" />
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-1">Choose your qLab nickname</h1>
        <p className="text-zinc-400 text-sm mb-5">
          This is how you'll appear on the leaderboard.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="e.g. qwizard"
            maxLength={30}
            autoFocus
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition font-mono"
          />
          {error && <p className="text-rose-400 text-xs m-0">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save and continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ProfileSetup() {
  return (
    <Suspense>
      <ProfileSetupInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 3: Visual smoke test**

`npm run dev`, navigate to `http://localhost:9091/profile/setup`. Expected: dark page, centered emerald `qLab` link, dark card with monospace input that gets an emerald border on focus, emerald `Save and continue` button.

- [ ] **Step 4: Commit**

```bash
git add web/app/profile/setup/page.tsx
git commit -m "refactor(web): re-skin /profile/setup with new theme"
```

---

## Task 10: Migrate auth pages — sign-in / sign-up

**Files:**
- Modify: `web/app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `web/app/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Create a shared Clerk appearance helper**

Create `web/lib/clerkAppearance.ts`:

```ts
import type { Appearance } from '@clerk/types'

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#09090b',
    colorInputBackground: '#18181b',
    colorInputText: '#fafafa',
    colorText: '#fafafa',
    colorTextSecondary: '#a1a1aa',
    colorNeutral: '#27272a',
    borderRadius: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  elements: {
    card: 'bg-zinc-900 border border-zinc-800 shadow-none',
    headerTitle: 'text-zinc-50',
    headerSubtitle: 'text-zinc-400',
    formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950',
    footerActionLink: 'text-emerald-400 hover:text-emerald-300',
  },
}
```

- [ ] **Step 2: Rewrite `web/app/sign-in/[[...sign-in]]/page.tsx`**

```tsx
import { SignIn } from '@clerk/nextjs'
import { Brand } from '@/components/ui/Brand'
import { clerkAppearance } from '@/lib/clerkAppearance'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-6 py-8">
      <Brand as="link" size="lg" />
      <SignIn appearance={clerkAppearance} />
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `web/app/sign-up/[[...sign-up]]/page.tsx`**

```tsx
import { SignUp } from '@clerk/nextjs'
import { Brand } from '@/components/ui/Brand'
import { clerkAppearance } from '@/lib/clerkAppearance'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-6 py-8">
      <Brand as="link" size="lg" />
      <SignUp appearance={clerkAppearance} />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
cd web && npm run build
```

If the build fails on `import type { Appearance } from '@clerk/types'`, change line 1 of `clerkAppearance.ts` to:

```ts
import type { Appearance } from '@clerk/nextjs/dist/types/server'
```

If both fail, drop the import and type the export as `any`:

```ts
export const clerkAppearance: any = { ... }
```

— Clerk re-exports `Appearance` inconsistently across 5.x minor versions; the runtime shape is identical.

- [ ] **Step 5: Visual smoke test**

`npm run dev`, navigate to `/sign-in` and `/sign-up`. Expected: dark zinc-950 page, emerald `qLab` link above the Clerk card, Clerk card on zinc-900 surface, emerald primary button inside Clerk's form, emerald links.

- [ ] **Step 6: Commit**

```bash
git add web/lib/clerkAppearance.ts web/app/sign-in web/app/sign-up
git commit -m "refactor(web): theme Clerk sign-in/up with qLab appearance"
```

---

## Task 11: Migrate `/sign-out` and `/auth/callback`

**Files:**
- Modify: `web/app/sign-out/page.tsx`
- Modify: `web/app/auth/callback/page.tsx`

- [ ] **Step 1: Rewrite `web/app/sign-out/page.tsx`**

```tsx
'use client'
import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'
import { Brand } from '@/components/ui/Brand'

export default function SignOut() {
  const { signOut } = useClerk()

  useEffect(() => {
    signOut({ redirectUrl: '/sign-in' })
  }, [signOut])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4">
      <Brand size="lg" />
      <p className="text-zinc-400 text-base">Signing out…</p>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `web/app/auth/callback/page.tsx`**

```tsx
'use client'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/ui/Brand'

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth()
  const [message, setMessage] = useState('Signing you in to qLab…')

  useEffect(() => {
    if (!isLoaded) return

    async function handleCallback() {
      const token = await getToken()
      if (!token) {
        setMessage('Could not get token. Please try signing in again.')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
      try {
        const res = await fetch(`${apiUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 404) {
          window.location.href = '/profile/setup?from=vscode'
          return
        }
        if (res.ok) {
          const user = await res.json()
          if (!user.nickname) {
            window.location.href = '/profile/setup?from=vscode'
            return
          }
        }
      } catch {
        // API unreachable — proceed to VS Code anyway
      }

      setMessage('Returning to VS Code…')
      window.location.href = `vscode://qlab.qlab/auth?token=${encodeURIComponent(token)}`
    }

    handleCallback()
  }, [isLoaded, getToken])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-3 px-6">
      <Brand size="lg" />
      <p className="text-base">{message}</p>
      <p className="text-zinc-500 text-sm">You can close this tab once VS Code opens.</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd web && npm run build
```

- [ ] **Step 4: Visual smoke test**

`npm run dev`, navigate to `/sign-out` (will redirect to sign-in — observe the brief "Signing out…" page) and visually confirm `/auth/callback` styling by visiting it directly without a VS Code redirect.

- [ ] **Step 5: Commit**

```bash
git add web/app/sign-out/page.tsx web/app/auth/callback/page.tsx
git commit -m "refactor(web): re-skin sign-out and auth callback"
```

---

## Task 12: Cleanup — verify no legacy literals or tokens remain

**Files:**
- (read-only grep, then targeted fixes if any found)

- [ ] **Step 1: Grep for legacy hex literals**

Run from `web/`:

```bash
grep -rn --include='*.ts' --include='*.tsx' --include='*.css' '#ffa116\|#1a1a1a\|#282828\|#3a3a3a\|#aba9b0\|#5a5a5a\|#eff1f6\|#ffc01e\|#ef4743\|#00b8a3\|#1e1e1e' app components lib
```

Expected: no matches. If any match in an in-scope page (problems, profile, auth), open the file and replace the literal with the corresponding Tailwind class or new token. If a match is in `components/tabs/*` or `components/ProblemLayout.tsx` or `components/CodeEditor.tsx`, leave it alone — those are out of scope (problem-solving page).

- [ ] **Step 2: Grep for legacy Tailwind token names**

```bash
grep -rn --include='*.ts' --include='*.tsx' 'bg-bg\|bg-panel\|bg-accent\|text-accent\|border-border\b' app components lib | grep -v node_modules
```

`border-border` is now a valid token (it was already, value just changed); ignore those. Look for `bg-bg`, `bg-panel`, `bg-accent`, `text-accent` — these reference removed tokens. If any are found in in-scope files, replace with the appropriate new class. Out-of-scope files (`tabs/*`, `ProblemLayout.tsx`, `CodeEditor.tsx`) stay as-is for now.

- [ ] **Step 3: Final full build**

```bash
cd web && npm run build
```

Expected: clean build.

- [ ] **Step 4: End-to-end visual walkthrough**

`npm run dev`. Visit each in-scope route and confirm consistent palette:
- `/` (home — unchanged)
- `/problems`
- `/problems/[some-slug]` (out of scope; expect old orange — note for follow-up spec)
- `/profile`
- `/profile/setup`
- `/sign-in`
- `/sign-up`
- `/sign-out` (briefly visible during redirect)

- [ ] **Step 5: Commit any cleanup**

If steps 1-2 produced any edits:

```bash
git add -A web/
git commit -m "chore(web): remove stragglers referencing legacy theme tokens"
```

If nothing changed, skip this commit.

---

## Out of scope reminder

The problem-solving page (`web/components/ProblemLayout.tsx`, `web/components/CodeEditor.tsx`, all of `web/components/tabs/*`) is intentionally untouched by this plan. After this plan ships, that page will visually clash with the rest of the app — that is expected, and a separate spec will address it.
