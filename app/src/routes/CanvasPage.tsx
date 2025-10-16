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

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
        <button onClick={exportPng}>Export PNG</button>
      </div>
      <div style={{ flex: 1 }}>
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  )
}
