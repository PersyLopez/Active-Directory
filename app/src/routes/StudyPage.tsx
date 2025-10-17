import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../vault/VaultContext'
import { extractCardsFromVault } from '../quiz/extract'
import { getDueCards, loadProgress, review, saveProgress } from '../srs/scheduler'

export function StudyPage() {
  const { state } = useVault()
  const cards = useMemo(() => extractCardsFromVault(state.notes), [state.notes])
  const [store, setStore] = useState(loadProgress())
  const dueIds = getDueCards(cards.map(c => c.id), store)
  const [index, setIndex] = useState(0)
  const queue = dueIds.map(id => cards.find(c => c.id === id)!).filter(Boolean)
  const current = queue[index] ?? null
  const [revealed, setRevealed] = useState(false)

  function grade(g: 1 | 2 | 3 | 4) {
    if (!current) return
    const next = review(current.id, g, store)
    setStore(next)
    saveProgress(next)
    setIndex(i => i + 1)
    setRevealed(false)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link to="/">← Home</Link>
        <div>Due: {queue.length}</div>
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        {!current ? (
          <div>No cards due. 🎉</div>
        ) : (
          <div style={{ maxWidth: 720, width: '100%', padding: 24, border: '1px solid #eee', borderRadius: 8, background: 'white' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{current.type.toUpperCase()}</div>
            <div style={{ fontSize: 20, minHeight: 60 }}>{revealed ? current.back : current.front}</div>
            <div style={{ marginTop: 16 }}>
              {!revealed ? (
                <button onClick={() => setRevealed(true)}>Show Answer</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => grade(1)}>Again</button>
                  <button onClick={() => grade(2)}>Hard</button>
                  <button onClick={() => grade(3)}>Good</button>
                  <button onClick={() => grade(4)}>Easy</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
