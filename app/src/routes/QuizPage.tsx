import { useMemo, useState } from 'react'
import { useVault } from '../vault/VaultContext'
import { extractCardsFromVault } from '../quiz/extract'
import type { Card } from '../quiz/types'
import { Link } from 'react-router-dom'

function toCsv(cards: Card[]): string {
  const header = ['front', 'back', 'type', 'tags', 'sourcePath', 'noteId']
  const rows = cards.map(c => [
    c.front.replace(/"/g, '""'),
    c.back.replace(/"/g, '""'),
    c.type,
    (c.tags ?? []).join(';'),
    c.sources[0]?.path ?? '',
    c.sources[0]?.noteId ?? '',
  ])
  const csv = [header.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
  return csv
}

export function QuizPage() {
  const { state } = useVault()
  const cards = useMemo(() => extractCardsFromVault(state.notes), [state.notes])
  const [included, setIncluded] = useState<Set<string>>(new Set(cards.map(c => c.id)))
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'definition' | 'qa' | 'cloze'>('all')

  const filtered = cards.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
  })

  function toggle(id: string) {
    setIncluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setIncluded(new Set(filtered.map(c => c.id)))
  }
  function clearAll() {
    setIncluded(new Set())
  }

  function exportCsv() {
    const selected = filtered.filter(c => included.has(c.id))
    const csv = toCsv(selected)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deck.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link to="/">← Home</Link>
        <input
          placeholder="Search cards"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | 'definition' | 'qa' | 'cloze')}>
          <option value="all">All types</option>
          <option value="definition">Definition</option>
          <option value="qa">Q/A</option>
          <option value="cloze">Cloze</option>
        </select>
        <button onClick={selectAll}>Select all</button>
        <button onClick={clearAll}>Clear</button>
        <button onClick={exportCsv} disabled={[...included].length === 0}>Export CSV</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Include</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Front</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Back</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td style={{ padding: 8 }}>
                  <input type="checkbox" checked={included.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td style={{ padding: 8 }}>{c.type}</td>
                <td style={{ padding: 8, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.front}</td>
                <td style={{ padding: 8, maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.back}</td>
                <td style={{ padding: 8 }}>{c.sources[0]?.path ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
