import { useEffect, useRef, useState } from 'react'
import { Editor, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import html2canvas from 'html2canvas'

export function CanvasPage() {
  const editorRef = useRef<Editor | null>(null)
  const [autoStylus, setAutoStylus] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('canvas:autoStylus')
      return raw ? JSON.parse(raw) : true
    } catch {
      return true
    }
  })
  const [palmRejection, setPalmRejection] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('canvas:palmRejection')
      return raw ? JSON.parse(raw) : true
    } catch {
      return true
    }
  })
  const activePenIdRef = useRef<number | null>(null)
  const lastPenUpAtRef = useRef<number>(0)

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

  useEffect(() => {
    const container = document.querySelector('.tl-container') as HTMLElement | null
    if (!container) return

    const maybeSwitchTool = (e: PointerEvent) => {
      if (!autoStylus) return
      const editor = editorRef.current as unknown as { setCurrentTool?: (id: string) => void; setCurrentToolId?: (id: string) => void } | null
      if (!editor) return
      const setTool = editor.setCurrentTool ?? editor.setCurrentToolId
      if (!setTool) return
      if (e.pointerType === 'pen') setTool('draw')
      else if (e.pointerType === 'touch') setTool('hand')
    }

    const blockIfPalm = (e: PointerEvent) => {
      if (!palmRejection) return
      const isTouch = e.pointerType === 'touch'
      const penActive = activePenIdRef.current !== null
      const withinGrace = Date.now() - lastPenUpAtRef.current < 120
      if (isTouch && (penActive || withinGrace)) {
        e.preventDefault()
        e.stopImmediatePropagation?.()
        e.stopPropagation()
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'pen') {
        activePenIdRef.current = e.pointerId
      }
      blockIfPalm(e)
      maybeSwitchTool(e)
    }
    const onPointerMove = (e: PointerEvent) => {
      blockIfPalm(e)
    }
    const onPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId === activePenIdRef.current) {
        activePenIdRef.current = null
        lastPenUpAtRef.current = Date.now()
      }
    }

    // Capture early to intercept before TLDraw; passive must be false to call preventDefault
    container.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false })
    container.addEventListener('pointermove', onPointerMove, { capture: true, passive: false })
    window.addEventListener('pointerup', onPointerUpOrCancel, { capture: true })
    window.addEventListener('pointercancel', onPointerUpOrCancel, { capture: true })
    return () => {
      container.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions)
      container.removeEventListener('pointermove', onPointerMove, { capture: true } as EventListenerOptions)
      window.removeEventListener('pointerup', onPointerUpOrCancel, { capture: true } as EventListenerOptions)
      window.removeEventListener('pointercancel', onPointerUpOrCancel, { capture: true } as EventListenerOptions)
    }
  }, [autoStylus, palmRejection])

  function toggleStylusMode(next: boolean) {
    setAutoStylus(next)
    try {
      localStorage.setItem('canvas:autoStylus', JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  function togglePalmRejection(next: boolean) {
    setPalmRejection(next)
    try {
      localStorage.setItem('canvas:palmRejection', JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={exportPng}>Export PNG</button>
        <button onClick={ingestFromGraph} style={{ marginLeft: 8 }}>Ingest from Graph</button>
        <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={autoStylus}
            onChange={e => toggleStylusMode(e.target.checked)}
          />
          Stylus mode (auto pen/hand)
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={palmRejection}
            onChange={e => togglePalmRejection(e.target.checked)}
          />
          Strict palm rejection
        </label>
      </div>
      <div style={{ flex: 1 }}>
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  )
}
