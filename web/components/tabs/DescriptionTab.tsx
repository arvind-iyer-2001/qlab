import { ProblemDetail } from '@/lib/api'

const DIFF_COLORS = { easy: '#00b8a3', medium: '#ffc01e', hard: '#ef4743' } as const

interface Props {
  problem: ProblemDetail
}

export function DescriptionTab({ problem }: Props) {
  return (
    <div style={{ padding: '20px', color: '#eff1f6', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          {problem.id}. {problem.title}
        </h2>
        <span
          style={{
            color: DIFF_COLORS[problem.difficulty],
            fontSize: '13px',
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {problem.difficulty}
        </span>
      </div>

      <p style={{ color: '#aba9b0', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
        {problem.narrative}
      </p>

      <section style={{ marginBottom: '16px' }}>
        <h4 style={{ color: '#ffa116', margin: '0 0 6px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Input
        </h4>
        <p style={{ margin: 0, color: '#eff1f6', fontSize: '13px', lineHeight: 1.5 }}>{problem.input_spec}</p>
      </section>

      <section style={{ marginBottom: '16px' }}>
        <h4 style={{ color: '#ffa116', margin: '0 0 6px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Output
        </h4>
        <p style={{ margin: 0, color: '#eff1f6', fontSize: '13px', lineHeight: 1.5 }}>{problem.output_spec}</p>
      </section>

      {problem.examples.map((ex, i) => (
        <section key={i} style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#aba9b0', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Example {i + 1}
          </h4>
          <div style={{ background: '#282828', borderRadius: '6px', padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#aba9b0' }}>Input: </span>
              <span style={{ color: '#eff1f6' }}>{ex.input}</span>
            </div>
            <div>
              <span style={{ color: '#aba9b0' }}>Output: </span>
              <span style={{ color: '#00b8a3' }}>{ex.output}</span>
            </div>
            {ex.note && (
              <div style={{ marginTop: '6px', color: '#5a5a5a', fontSize: '12px' }}>{ex.note}</div>
            )}
          </div>
        </section>
      ))}

      {problem.concepts.length > 0 && (
        <section style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#aba9b0', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Concepts
          </h4>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {problem.concepts.map((c) => (
              <span
                key={c}
                style={{ background: '#282828', color: '#aba9b0', padding: '3px 10px', borderRadius: '9999px', fontSize: '12px' }}
              >
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 style={{ color: '#aba9b0', margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Scoring
        </h4>
        <p style={{ margin: 0, color: '#5a5a5a', fontSize: '12px' }}>{problem.winning_criteria}</p>
      </section>
    </div>
  )
}
