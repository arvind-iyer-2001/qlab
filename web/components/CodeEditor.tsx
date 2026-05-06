'use client'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

interface Props {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  minHeight?: string
}

export function CodeEditor({ value, onChange, readOnly = false, minHeight = '300px' }: Props) {
  return (
    <CodeMirror
      value={value}
      extensions={[python()]}
      theme={oneDark}
      onChange={onChange}
      readOnly={readOnly}
      style={{
        fontSize: '13px',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minHeight,
        backgroundColor: '#1e1e1e',
      }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: true,
      }}
    />
  )
}
