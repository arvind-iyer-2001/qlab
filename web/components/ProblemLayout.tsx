'use client'
import { useEffect, useRef, useState } from 'react'
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

export function ProblemLayout({ problem }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('description')
  const [code, setCode] = useState(() => starterCode(problem.slug))
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const initialCode = starterCode(problem.slug)

  const submitRunRef = useRef<(() => void) | null>(null)
  const testRunRef = useRef<(() => void) | null>(null)

  function handleLoadCode(loaded: string) {
    const isDirty = code !== initialCode
    if (isDirty) {
      const ok = window.confirm('Replace current editor code with this submission?')
      if (!ok) return
    }
    setCode(loaded)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === 'Enter') {
        e.preventDefault()
        setActiveTab('submit')
        // Defer to allow the SubmitTab to register its run handler if newly mounted.
        setTimeout(() => submitRunRef.current?.(), 0)
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        setActiveTab('test')
        setTimeout(() => testRunRef.current?.(), 0)
      } else if (e.key === '\\') {
        e.preventDefault()
        setPanelCollapsed((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Left panel — tabs */}
      {!panelCollapsed && (
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #3a3a3a', background: '#1a1a1a' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #3a3a3a', background: '#282828', flexShrink: 0 }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'description' && <DescriptionTab problem={problem} />}
            {activeTab === 'test' && (
              <TestTab problem={problem} code={code} registerRun={(fn) => { testRunRef.current = fn }} />
            )}
            {activeTab === 'submit' && (
              <SubmitTab problem={problem} code={code} registerRun={(fn) => { submitRunRef.current = fn }} />
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
        {/* File header */}
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

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CodeEditor value={code} onChange={setCode} minHeight="100%" />
        </div>

        {/* Bottom bar */}
        <div style={{ padding: '6px 16px', background: '#282828', borderTop: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ color: '#5a5a5a', fontSize: '12px' }}>
            {code.length} chars · <span style={{ color: '#5a5a5a' }}>⌘↵ submit · ⌘R test · ⌘\ toggle</span>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('test')}
              style={{ padding: '5px 14px', background: '#282828', color: '#eff1f6', border: '1px solid #3a3a3a', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
            >
              Test
            </button>
            <button
              onClick={() => setActiveTab('submit')}
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
