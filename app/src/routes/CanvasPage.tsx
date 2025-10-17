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
  const [marquee, setMarquee] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('canvas:marquee')
      return raw ? JSON.parse(raw) : false
    } catch {
      return false
    }
  })

  function handleMount(editor: Editor) {
    editorRef.current = editor
    try { (window as any).app = { ...(window as any).app, editor } } catch {}
    // Restore style preferences
    try {
      const storedColor = localStorage.getItem('canvas:color')
      const storedSize = localStorage.getItem('canvas:size')
      const e = editor as unknown as {
        setStyleForNextShapes?: (style: any, value: any, opts?: any) => void
      }
      // Access @tldraw/tlschema styles via window bundle (runtime, avoids direct type import)
      const schema = (window as any).tldraw?.tlschema
      if (e.setStyleForNextShapes && schema) {
        if (storedColor) e.setStyleForNextShapes(schema.DefaultColorStyle, storedColor)
        if (storedSize) e.setStyleForNextShapes(schema.DefaultSizeStyle, storedSize)
      }
    } catch {
      // ignore
    }
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
      // Don't override if user has explicitly selected a non-draw/hand tool recently
      const explicit = getStored('canvas:explicitTool', '')
      if (explicit && explicit !== 'draw' && explicit !== 'hand') return
      if (marquee) { setTool('select'); return }
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
  }, [autoStylus, palmRejection, marquee])

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

  function toggleMarquee(next: boolean) {
    setMarquee(next)
    try {
      localStorage.setItem('canvas:marquee', JSON.stringify(next))
      if (next) {
        localStorage.setItem('canvas:explicitTool', 'select')
        const editor = editorRef.current as unknown as { setCurrentTool?: (id: string) => void } | null
        editor?.setCurrentTool?.('select')
      }
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={exportPng}>Export PNG</button>
        <button onClick={ingestFromGraph} style={{ marginLeft: 8 }}>Ingest from Graph</button>
        {/* Tools */}
        <div style={{ display: 'inline-flex', gap: 4, marginLeft: 12 }}>
          <ToolBtn id="select" label="Select" />
          <ToolBtn id="hand" label="Hand" />
          <ToolBtn id="draw" label="Pencil" />
          <ToolBtn id="highlight" label="Highlighter" />
          <ToolBtn id="eraser" label="Eraser" />
        </div>
        {/* Styles */}
        <div style={{ display: 'inline-flex', gap: 6, marginLeft: 12, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Width
            <select onChange={e => setStrokeSize(e.target.value as any)} defaultValue={getStored('canvas:size', 'm')}>
              <option value="s">S</option>
              <option value="m">M</option>
              <option value="l">L</option>
              <option value="xl">XL</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Color
            <input type="color" defaultValue={getStored('canvas:color', '#1f2937')} onChange={e => setStrokeColor(e.target.value)} />
          </label>
        </div>
        {/* Presets */}
        <div style={{ display: 'inline-flex', gap: 6, marginLeft: 12, alignItems: 'center' }}>
          <span>Presets:</span>
          <button onClick={() => applyPreset('HB')}>HB</button>
          <button onClick={() => applyPreset('2B')}>2B</button>
          <button onClick={() => applyPreset('Highlighter')}>Highlighter</button>
        </div>
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
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={marquee}
            onChange={e => toggleMarquee(e.target.checked)}
          />
          Marquee select
        </label>
      </div>
      <div style={{ flex: 1 }}>
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  )
}

function getStored(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function ToolBtn(props: { id: string; label: string }) {
  const { id, label } = props
  function selectTool() {
    const editor = (window as any).app?.editor || (document.querySelector('.tl-container') as any)?.__editor
    const e = editor as { setCurrentTool?: (id: string) => void } | null
    e?.setCurrentTool?.(id)
    try { localStorage.setItem('canvas:explicitTool', id) } catch {}
  }
  return (
    <button onClick={selectTool}>{label}</button>
  )
}

function setStrokeSize(size: 's' | 'm' | 'l' | 'xl') {
  try { localStorage.setItem('canvas:size', size) } catch {}
  const editor = (window as any).app?.editor || (document.querySelector('.tl-container') as any)?.__editor
  const e = editor as { setStyleForNextShapes?: (style: any, value: any, opts?: any) => void } | null
  const schema = (window as any).tldraw?.tlschema
  if (e?.setStyleForNextShapes && schema) e.setStyleForNextShapes(schema.DefaultSizeStyle, size)
}

function setStrokeColor(color: string) {
  try { localStorage.setItem('canvas:color', color) } catch {}
  const editor = (window as any).app?.editor || (document.querySelector('.tl-container') as any)?.__editor
  const e = editor as { setStyleForNextShapes?: (style: any, value: any, opts?: any) => void } | null
  const schema = (window as any).tldraw?.tlschema
  if (e?.setStyleForNextShapes && schema) e.setStyleForNextShapes(schema.DefaultColorStyle, color)
}

function applyPreset(name: 'HB' | '2B' | 'Highlighter') {
  const schema = (window as any).tldraw?.tlschema
  const editor = (window as any).app?.editor || (document.querySelector('.tl-container') as any)?.__editor
  const e = editor as { setCurrentTool?: (id: string) => void; setStyleForNextShapes?: (style: any, value: any, opts?: any) => void } | null
  if (!schema || !e?.setStyleForNextShapes) return

  if (name === 'HB') {
    setStrokeSize('s')
    setStrokeColor('#111827')
    e.setCurrentTool?.('draw')
    try { localStorage.setItem('canvas:explicitTool', 'draw') } catch {}
  } else if (name === '2B') {
    setStrokeSize('l')
    setStrokeColor('#111827')
    e.setCurrentTool?.('draw')
    try { localStorage.setItem('canvas:explicitTool', 'draw') } catch {}
  } else if (name === 'Highlighter') {
    setStrokeSize('xl')
    setStrokeColor('#fde047')
    e.setCurrentTool?.('highlight')
    try { localStorage.setItem('canvas:explicitTool', 'highlight') } catch {}
  }
}
