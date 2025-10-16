import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useVault } from '../vault/VaultContext'

const PAGE_SIZES = {
  A4: { width: 794, height: 1123 }, // ~ 96dpi px
  Letter: { width: 816, height: 1056 },
}

export function PageMode() {
  const { state } = useVault()
  const [size, setSize] = useState<keyof typeof PAGE_SIZES>('A4')
  const [margins] = useState({ top: 64, right: 64, bottom: 64, left: 64 })
  const note = state.notes[0]

  const style = useMemo(() => {
    const s = PAGE_SIZES[size]
    return {
      page: {
        width: s.width,
        minHeight: s.height,
        margin: '16px auto',
        background: 'white',
        boxShadow: '0 0 2px rgba(0,0,0,0.2)',
        padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
      } as React.CSSProperties,
    }
  }, [size, margins])

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <label>
          Size
          <select value={size} onChange={e => setSize(e.target.value as keyof typeof PAGE_SIZES)}>
            {Object.keys(PAGE_SIZES).map(k => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>
      {note ? (
        <div style={style.page}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
      ) : (
        <div>No note selected</div>
      )}
    </div>
  )
}
