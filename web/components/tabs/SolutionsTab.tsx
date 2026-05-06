'use client'
import { useState } from 'react'
import { useSolutions } from '@/hooks/useSolutions'
import { useRevealHint } from '@/hooks/useRevealHint'
import { CodeEditor } from '@/components/CodeEditor'

type SubTab = 'hints' | 'editorial' | 'reference' | 'community'
const SUB_TABS: SubTab[] = ['hints', 'editorial', 'reference', 'community']

interface Props {
  slug: string
}

export function SolutionsTab({ slug }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('hints')
  const { data: solutions, isLoading } = useSolutions(slug)
  const { mutate: revealHint, isPending: revealing } = useRevealHint(slug)

  if (isLoading) return <div style={{ padding: '20px', color: '#aba9b0' }}>Loading solutions…</div>
  if (!solutions) return <div style={{ padding: '20px', color: '#5a5a5a' }}>Sign in to view solutions.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #3a3a3a', padding: '0 20px', flexShrink: 0 }}>
        {SUB_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: subTab === t ? '2px solid #ffa116' : '2px solid transparent',
              color: subTab === t ? '#ffa116' : '#aba9b0',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize',
              marginBottom: '-1px',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {subTab === 'hints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, color: '#aba9b0', fontSize: '13px' }}>
              {solutions.hints_revealed}/{solutions.hints_total} hints revealed
            </p>
            {solutions.hints.map((hint, i) => (
              <div key={i} style={{ background: '#282828', borderRadius: '6px', padding: '12px', color: '#eff1f6', fontSize: '13px' }}>
                <span style={{ color: '#5a5a5a', marginRight: '8px' }}>#{i + 1}</span>
                {hint}
              </div>
            ))}
            {solutions.hints_revealed < solutions.hints_total && (
              <button
                onClick={() => revealHint()}
                disabled={revealing}
                style={{
                  alignSelf: 'flex-start',
                  padding: '7px 18px',
                  background: '#282828',
                  color: revealing ? '#5a5a5a' : '#eff1f6',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  cursor: revealing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                {revealing ? 'Revealing…' : 'Reveal next hint'}
              </button>
            )}
          </div>
        )}

        {subTab === 'editorial' && (
          <div>
            {solutions.editorial.locked ? (
              <div style={{ color: '#aba9b0', fontSize: '13px' }}>
                <span style={{ marginRight: '8px' }}>🔒</span>
                {solutions.editorial.reason ?? 'Solve the problem to unlock the editorial.'}
              </div>
            ) : (
              <p style={{ color: '#eff1f6', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {solutions.editorial.content}
              </p>
            )}
          </div>
        )}

        {subTab === 'reference' && (
          <div>
            {solutions.reference.locked ? (
              <div style={{ color: '#aba9b0', fontSize: '13px' }}>
                <span style={{ marginRight: '8px' }}>🔒</span>
                {solutions.reference.reason ?? 'Solve the problem to unlock the reference solution.'}
              </div>
            ) : solutions.reference.code ? (
              <CodeEditor value={solutions.reference.code} onChange={() => {}} readOnly />
            ) : (
              <p style={{ color: '#5a5a5a', fontSize: '13px' }}>No reference solution available.</p>
            )}
          </div>
        )}

        {subTab === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {solutions.community.length === 0 ? (
              <p style={{ color: '#5a5a5a', fontSize: '13px' }}>No community solutions yet.</p>
            ) : (
              solutions.community.map((s, i) => (
                <div key={i} style={{ background: '#282828', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                    <span style={{ color: '#ffa116', fontWeight: 600 }}>#{s.rank} {s.handle}</span>
                    <span style={{ color: '#aba9b0' }}>{s.timing_ms}ms · {s.char_count} chars · {s.language}</span>
                  </div>
                  <CodeEditor value={s.code} onChange={() => {}} readOnly minHeight="80px" />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
