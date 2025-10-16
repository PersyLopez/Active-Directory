import { useVault } from '../vault/VaultContext'

export function Home() {
  const { state, openWithFsAccess, openInMemory, createNote, saveNote } = useVault()

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
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100dvh' }}>
      <aside style={{ borderRight: '1px solid #eee', padding: 12 }}>
        <h3>Notes</h3>
        <button onClick={() => createNote('Untitled')}>New Note</button>
        <ul>
          {state.notes.map(n => (
            <li key={n.id}>{n.title}</li>
          ))}
        </ul>
      </aside>
      <main style={{ padding: 16 }}>
        <h3>Editor (placeholder)</h3>
        {state.notes[0] && (
          <textarea
            style={{ width: '100%', height: '80vh' }}
            value={state.notes[0].content}
            onChange={e =>
              saveNote({ ...state.notes[0], content: e.target.value }).catch(err => alert(err.message))
            }
          />
        )}
      </main>
    </div>
  )
}
