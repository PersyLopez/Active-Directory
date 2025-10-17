import { useEffect, useMemo, useRef, useState } from 'react'
import { useVault } from '../vault/VaultContext'
import { extractWikilinks, slugify } from '../vault/Wikilink'
import { Link } from 'react-router-dom'

type Node = { id: string; title: string; x: number; y: number }
type Edge = { from: string; to: string }

function buildGraph(notes: { id: string; title: string; content: string }[]) {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const idBySlug = new Map<string, string>()
  for (const [i, n] of notes.entries()) {
    const angle = (i / Math.max(1, notes.length)) * Math.PI * 2
    nodes.push({ id: n.id, title: n.title, x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 })
    idBySlug.set(slugify(n.title), n.id)
  }
  for (const n of notes) {
    const links = extractWikilinks(n.content)
    for (const l of links) {
      const targetId = idBySlug.get(slugify(l.target))
      if (targetId && targetId !== n.id) edges.push({ from: n.id, to: targetId })
    }
  }
  return { nodes, edges }
}

export function GraphPage() {
  const { state } = useVault()
  const { nodes, edges } = useMemo(() => buildGraph(state.notes), [state.notes])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const viewRef = useRef<HTMLDivElement | null>(null)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    let dragging = false
    let lastX = 0
    let lastY = 0
    const onDown = (e: MouseEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      setTx(t => t + dx)
      setTy(t => t + dy)
    }
    const onUp = () => {
      dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        const next = Math.min(3, Math.max(0.2, scale * (e.deltaY > 0 ? 0.9 : 1.1)))
        setScale(next)
      }
    }
    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [scale])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addToCanvas() {
    const payload = Array.from(selected).map(id => {
      const n = nodes.find(nn => nn.id === id)!
      return { title: n.title }
    })
    localStorage.setItem('add_to_canvas', JSON.stringify(payload))
  }

  const filtered = query.trim()
    ? nodes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
    : nodes

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8 }}>
        <Link to="/">← Home</Link>
        <input
          placeholder="Search nodes"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={addToCanvas} disabled={selected.size === 0}>
          Add to Canvas
        </button>
      </div>
      <div ref={viewRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafafa' }}>
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
        >
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {edges.map((e, i) => {
              const a = nodes.find(n => n.id === e.from)
              const b = nodes.find(n => n.id === e.to)
              if (!a || !b) return null
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ddd" />
            })}
            {filtered.map(n => (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <circle
                  r={18}
                  fill={selected.has(n.id) ? '#3b82f6' : '#fff'}
                  stroke={selected.has(n.id) ? '#1d4ed8' : '#999'}
                  strokeWidth={2}
                  onClick={() => toggle(n.id)}
                />
                <text x={24} y={6} fontSize={12} fill="#333">
                  {n.title}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  )
}
