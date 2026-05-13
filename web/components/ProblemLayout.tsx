'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ProblemDetail } from '@/lib/api'
import { CodeEditor } from '@/components/CodeEditor'
import { DescriptionTab } from '@/components/tabs/DescriptionTab'
import { TestTab } from '@/components/tabs/TestTab'
import { SubmitTab } from '@/components/tabs/SubmitTab'
import { MySubmissionsTab } from '@/components/tabs/MySubmissionsTab'
import { SolutionsTab } from '@/components/tabs/SolutionsTab'
import { LeaderboardTab } from '@/components/tabs/LeaderboardTab'

type Tab = 'description' | 'test' | 'submit' | 'mysubmissions' | 'solutions' | 'leaderboard'
const TABS: Tab[] = ['description', 'test', 'submit', 'mysubmissions', 'solutions', 'leaderboard']

interface Props {
  problem: ProblemDetail
}

function starterCode(slug: string) {
  return `/ ${slug}.q\nfunc:{\n  \n}`
}

function isTab(s: string | null | undefined): s is Tab {
  return !!s && (TABS as readonly string[]).includes(s)
}

function tabStorageKey(slug: string) {
  return `qlab:tab:${slug}`
}

export function ProblemLayout({ problem }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialTab: Tab = (() => {
    const fromUrl = searchParams.get('tab')
    if (isTab(fromUrl)) return fromUrl
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(tabStorageKey(problem.slug))
      if (isTab(stored)) return stored
    }
    return 'description'
  })()

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [code, setCode] = useState(() => starterCode(problem.slug))
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const initialCode = starterCode(problem.slug)

  const submitRunRef = useRef<(() => void) | null>(null)
  const testRunRef = useRef<(() => void) | null>(null)

  function changeTab(tab: Tab) {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(tabStorageKey(problem.slug), tab)
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function handleLoadCode(loaded: string) {
    const isDirty = code !== initialCode
    if (isDirty) {
      const ok = window.confirm('Replace current editor code with this submission?')
      if (!ok) return
    }
    setCode(loaded)
  }

  function showLeaderboardToast() {
    setToast('Leaderboard updated ✓')
    setTimeout(() => setToast(null), 2500)
  }

  function copyDeepLink() {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        changeTab('submit')
        setTimeout(() => submitRunRef.current?.(), 0)
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        changeTab('test')
        setTimeout(() => testRunRef.current?.(), 0)
      } else if (e.key === '\\') {
        e.preventDefault()
        setPanelCollapsed((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const TAB_LABELS: Record<Tab, string> = {
    description: 'Description',
    test: 'Test',
    submit: 'Submit',
    mysubmissions: 'My Submissions',
    solutions: 'Solutions',
    leaderboard: 'Leaderboard',
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a3a2a',
            color: '#00b8a3',
            border: '1px solid #00b8a3',
            borderRadius: '6px',
            padding: '6px 14px',
            fontSize: '12px',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Left panel — tabs */}
      {!panelCollapsed && (
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #3a3a3a', background: '#1a1a1a' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #3a3a3a', background: '#282828', flexShrink: 0, alignItems: 'center' }}>
            <div style={{ display: 'flex', flex: 1 }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => changeTab(tab)}
                  style={{
                    padding: '11px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #ffa116' : '2px solid transparent',
                    color: activeTab === tab ? '#ffa116' : '#aba9b0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    marginBottom: '-1px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <button
              onClick={copyDeepLink}
              title="Copy link to this tab"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: copied ? '#00b8a3' : '#aba9b0',
                padding: '8px 12px', fontSize: '12px',
              }}
            >
              {copied ? '✓ Copied' : '🔗 Copy'}
            </button>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'description' && <DescriptionTab problem={problem} />}
            {activeTab === 'test' && (
              <TestTab problem={problem} code={code} registerRun={(fn) => { testRunRef.current = fn }} />
            )}
            {activeTab === 'submit' && (
              <SubmitTab
                problem={problem}
                code={code}
                registerRun={(fn) => { submitRunRef.current = fn }}
                onCorrect={showLeaderboardToast}
              />
            )}
            {activeTab === 'mysubmissions' && (
              <MySubmissionsTab problemId={problem.id} onLoadCode={handleLoadCode} />
            )}
            {activeTab === 'solutions' && <SolutionsTab slug={problem.slug} />}
            {activeTab === 'leaderboard' && <LeaderboardTab slug={problem.slug} />}
          </div>
        </div>
      )}

      {/* Right panel — editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
        <div style={{ padding: '8px 16px', background: '#282828', borderBottom: '1px solid #3a3a3a', fontSize: '12px', color: '#aba9b0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{problem.slug}.q</span>
          <button
            onClick={() => setPanelCollapsed((v) => !v)}
            title="Toggle panel (Cmd/Ctrl+\\)"
            style={{ background: 'none', border: '1px solid #3a3a3a', color: '#aba9b0', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px' }}
          >
            {panelCollapsed ? '⇤ Show panel' : '⇥ Hide panel'}
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          <CodeEditor value={code} onChange={setCode} minHeight="100%" />
        </div>

        <div style={{ padding: '6px 16px', background: '#282828', borderTop: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#5a5a5a', fontSize: '12px' }}>
            {code.length} chars · <span style={{ color: '#5a5a5a' }}>⌘↵ submit · ⌘R test · ⌘\ toggle</span>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => changeTab('test')}
              style={{ padding: '5px 14px', background: '#282828', color: '#eff1f6', border: '1px solid #3a3a3a', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
            >
              Test
            </button>
            <button
              onClick={() => changeTab('submit')}
              style={{ padding: '5px 14px', background: '#ffa116', color: '#1a1a1a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
