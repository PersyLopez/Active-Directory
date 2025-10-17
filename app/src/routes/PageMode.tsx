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

  function handlePrint() {
    const paper = size === 'A4' ? 'A4' : 'letter'
    const printCss = `
@page { size: ${paper}; margin: 0; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
  .pm-toolbar { display: none !important; }
  .pm-page { box-shadow: none !important; margin: 0 auto !important; width: auto !important; min-height: auto !important; }
}
`
    const el = document.createElement('style')
    el.setAttribute('data-print', 'page-mode')
    el.textContent = printCss
    document.head.appendChild(el)
    const cleanup = () => {
      el.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="pm-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
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
        <button onClick={handlePrint}>Export PDF (Print)</button>
      </div>
      {note ? (
        <div className="pm-page" style={style.page}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
      ) : (
        <div>No note selected</div>
      )}
    </div>
  )
}
