/* eslint-disable react-refresh/only-export-components */
import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type Note = {
  id: string
  title: string
  path: string
  content: string
  updatedAt: number
}

export type VaultState = {
  notes: Note[]
  isOpen: boolean
  kind: 'fs' | 'idb' | 'memory'
}

export type VaultAPI = {
  state: VaultState
  openWithFsAccess: () => Promise<void>
  openInMemory: (seed?: Note[]) => void
  saveNote: (note: Omit<Note, 'updatedAt'>) => Promise<Note>
  createNote: (title?: string) => Promise<Note>
  getNoteById: (id: string) => Note | undefined
}

const VaultContext = createContext<VaultAPI | null>(null)

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, '')
    .replace(/[\s_]+/g, '-')
}

async function readFileHandleText(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile()
  return await file.text()
}

async function listMarkdownNotes(
  dir: FileSystemDirectoryHandle,
  prefix: string = '',
): Promise<Note[]> {
  const notes: Note[] = []
  const anyDir = dir as unknown as {
    entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>
  }
  if (!anyDir.entries) return notes
  for await (const [name, handle] of anyDir.entries()) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle
      if (name.toLowerCase().endsWith('.md')) {
        const content = await readFileHandleText(fileHandle)
        const relPath = `${prefix}${name}`
        const title = name.replace(/\.md$/i, '')
        notes.push({
          id: slugify(relPath.replace(/\.md$/i, '')),
          title,
          path: relPath,
          content,
          updatedAt: Date.now(),
        })
      }
    } else if (handle.kind === 'directory') {
      const subdir = handle as FileSystemDirectoryHandle
      const sub = await listMarkdownNotes(subdir, `${prefix}${name}/`)
      notes.push(...sub)
    }
  }
  return notes
}

async function getOrCreateFileHandleByPath(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemFileHandle> {
  const segments = path.split('/').filter(Boolean)
  const fileName = segments.pop() as string
  let dir = root
  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(seg, { create: true })
  }
  return await dir.getFileHandle(fileName, { create: true })
}

export function VaultProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<VaultState>({ notes: [], isOpen: false, kind: 'memory' })
  const [fsRoot, setFsRoot] = useState<FileSystemDirectoryHandle | null>(null)

  const getNoteById = useCallback(
    (id: string) => {
      return state.notes.find(n => n.id === id)
    },
    [state.notes],
  )

  const saveNoteInternal = useCallback(async (note: Note): Promise<Note> => {
    const next: Note = { ...note, updatedAt: Date.now() }
    if (state.kind === 'fs' && fsRoot) {
      // Ensure directory path exists then write
      const fileHandle = await getOrCreateFileHandleByPath(fsRoot, note.path)
      const writable = await fileHandle.createWritable()
      await writable.write(next.content)
      await writable.close()
    } else {
      // memory-only in Stage 1
    }
    return next
  }, [state.kind, fsRoot])

  const openWithFsAccess = useCallback(async () => {
    const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker
    if (!picker) throw new Error('File System Access API not supported in this browser')

    const root = await picker()
    setFsRoot(root)

    // Recursively collect markdown notes
    const notes = await listMarkdownNotes(root)
    setState({ notes, isOpen: true, kind: 'fs' })
  }, [])

  const openInMemory = useCallback((seed?: Note[]) => {
    setState({ notes: seed ?? [], isOpen: true, kind: 'memory' })
  }, [])

  const createNote = useCallback(async (title?: string): Promise<Note> => {
    const actualTitle = title && title.trim().length > 0 ? title.trim() : 'Untitled'
    const id = slugify(actualTitle)
    const newNote: Note = {
      id,
      title: actualTitle,
      path: `${id}.md`,
      content: `# ${actualTitle}\n\n`,
      updatedAt: Date.now(),
    }
    // Append to state and persist
    const saved = await saveNoteInternal(newNote)
    setState(prev => ({ ...prev, notes: [...prev.notes, saved] }))
    return saved
  }, [saveNoteInternal])

  const saveNote = useCallback(
    async (note: Omit<Note, 'updatedAt'>): Promise<Note> => {
      const withTime: Note = { ...note, updatedAt: Date.now() }
      const saved = await saveNoteInternal(withTime)
      setState(prev => ({
        ...prev,
        notes: prev.notes.map(n => (n.id === saved.id ? saved : n)),
      }))
      return saved
    },
    [saveNoteInternal],
  )

  const value = useMemo<VaultAPI>(
    () => ({ state, openWithFsAccess, openInMemory, saveNote, createNote, getNoteById }),
    [state, openWithFsAccess, openInMemory, saveNote, createNote, getNoteById],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault(): VaultAPI {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
