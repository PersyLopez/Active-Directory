import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../vault/VaultContext'
import { extractWikilinks, buildBacklinks, slugify } from '../vault/Wikilink'
import { insertWikilinkBySearch } from '../editor/DoubleClickConcept'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'

export function Home() {
  const { state, openWithFsAccess, openInMemory, createNote, saveNote } = useVault()
  const [selectedId, setSelectedId] = useState<string | null>(state.notes[0]?.id ?? null)
  const selected = state.notes.find(n => n.id === selectedId) ?? state.notes[0]
  const backlinks = useMemo(() => buildBacklinks(state.notes), [state.notes])
  const incoming = selected ? backlinks[slugify(selected.title)] ?? [] : []

  if (!state.isOpen) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Open Vault</h2>
        <button onClick={() => openWithFsAccess().catch(err => alert(err.message))}>Open Folder</button>
        <button onClick={() => openInMemory()}>Start in memory</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', height: '100dvh' }}>
      <aside style={{ borderRight: '1px solid #eee', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Notes</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/pages">Pages</Link>
            <Link to="/canvas">Canvas</Link>
          </div>
        </div>
        <button onClick={() => createNote('Untitled')}>New Note</button>
        <ul>
          {state.notes.map(n => (
            <li key={n.id}>
              <button onClick={() => setSelectedId(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                {n.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ padding: 16 }}>
        <h3>Editor</h3>
        {selected && (
          <CodeMirror
            value={selected.content}
            height="80vh"
            extensions={[markdown()]}
            onChange={val => saveNote({ ...selected, content: val }).catch(err => alert(err.message))}
            onDoubleClick={async () => {
              const sel = window.getSelection()
              if (!sel || sel.rangeCount === 0) return
              const selectedText = sel.toString()
              if (!selectedText) return
              const updated = insertWikilinkBySearch(selected.content, selectedText)
              if (!updated) return
              await saveNote({ ...selected, content: updated })
            }}
          />
        )}
      </main>
      <aside style={{ borderLeft: '1px solid #eee', padding: 12 }}>
        <h3>Backlinks</h3>
        {selected && incoming.length === 0 && <div>No backlinks</div>}
        <ul>
          {incoming.map(id => {
            const note = state.notes.find(n => n.id === id)
            if (!note) return null
            const links = extractWikilinks(note.content).filter(l => slugify(l.target) === slugify(selected.title))
            return (
              <li key={id}>
                <button onClick={() => setSelectedId(id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {note.title}
                </button>
                <div style={{ color: '#666', fontSize: 12 }}>{links[0]?.text}</div>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
