import { useRef } from 'react'
import { Editor, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import html2canvas from 'html2canvas'

export function CanvasPage() {
  const editorRef = useRef<Editor | null>(null)

  function handleMount(editor: Editor) {
    editorRef.current = editor
  }

  async function exportPng() {
    const el = document.querySelector('.tl-container') as HTMLElement | null
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'canvas.png'
    a.click()
  }

  function ingestFromGraph() {
    try {
      const raw = localStorage.getItem('add_to_canvas')
      if (!raw) return
      localStorage.removeItem('add_to_canvas')
      const payload = JSON.parse(raw) as { title: string }[]
      const editor = editorRef.current
      if (!editor) return
      let x = 0
      for (const item of payload) {
        // TLDraw types are complex; narrow to minimal fields supported
        const id = (editor as unknown as { createShapeId: () => string }).createShapeId()
        editor.createShape({
          id: id as unknown as never,
          type: 'text',
          x,
          y: 0,
          props: { text: item.title },
        } as unknown as Parameters<typeof editor.createShape>[0])
        x += 160
      }
    } catch {
      // ignore ingest errors
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
        <button onClick={exportPng}>Export PNG</button>
        <button onClick={ingestFromGraph} style={{ marginLeft: 8 }}>Ingest from Graph</button>
      </div>
      <div style={{ flex: 1 }}>
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  )
}
