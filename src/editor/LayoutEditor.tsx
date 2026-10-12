import { useEffect, useRef, useState } from 'react'
import { HERO_PHOTO, HERO_PHOTO_RATIO, heroPhotoStyle } from '../heroPhoto'

// Drag-and-drop layout editor. Off on the live site; turn it on with the
// #redaguoti address hash, or build with VITE_EDITOR=1.
// Elements marked data-edit="<name>" can be dragged; dragging the empty hero
// area moves the photo. The panel shows the offsets to send back as values.

type Offset = { x: number; y: number }
type Photo = typeof HERO_PHOTO
type Saved = { offsets: Record<string, Offset>; photo: Photo }

const STORAGE_KEY = 'megusta-layout-editor'
const PINK = '#FFB3C6'

function isEnabled() {
  return import.meta.env.VITE_EDITOR === '1' || window.location.hash === '#redaguoti'
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Saved>
      return { offsets: saved.offsets ?? {}, photo: { ...HERO_PHOTO, ...saved.photo } }
    }
  } catch {
    // storage blocked: start fresh
  }
  return { offsets: {}, photo: { ...HERO_PHOTO } }
}

function save(data: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage blocked: values still shown in the panel
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round1 = (v: number) => Math.round(v * 10) / 10

export default function LayoutEditor() {
  const [enabled, setEnabled] = useState(isEnabled)

  useEffect(() => {
    const onHash = () => setEnabled(isEnabled())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return enabled ? <Editor /> : null
}

function Editor() {
  const initial = useRef(load()).current
  const [offsets, setOffsets] = useState(initial.offsets)
  const [photo, setPhoto] = useState(initial.photo)
  const [selected, setSelected] = useState<string | null>(null)
  const [names, setNames] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState(window.innerWidth)
  const output = useRef<HTMLTextAreaElement>(null)

  // live refs for the pointer handlers
  const state = useRef({ offsets, photo })
  state.current = { offsets, photo }

  useEffect(() => {
    setNames([...document.querySelectorAll<HTMLElement>('[data-edit]')].map(el => el.dataset.edit!))
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // apply element offsets and the selection outline
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[data-edit]').forEach(el => {
      const o = offsets[el.dataset.edit!]
      el.style.translate = o ? `${o.x}px ${o.y}px` : ''
      el.style.outline = el.dataset.edit === selected ? `1px dashed ${PINK}` : '1px dashed rgba(255,179,198,0.35)'
      el.style.outlineOffset = '4px'
      el.style.cursor = 'move'
      el.style.userSelect = 'none'
    })
  }, [offsets, selected, names])

  // apply photo framing
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-edit-photo]')
    if (el) Object.assign(el.style, heroPhotoStyle(photo))
  }, [photo])

  useEffect(() => save({ offsets, photo }), [offsets, photo])

  // dragging
  useEffect(() => {
    let drag:
      | { kind: 'el'; name: string; sx: number; sy: number; start: Offset }
      | { kind: 'photo'; sx: number; sy: number; start: Photo; w: number; h: number }
      | null = null

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (e.button !== 0 || target.closest('[data-editor-panel]')) return
      const el = target.closest<HTMLElement>('[data-edit]')
      if (el) {
        const name = el.dataset.edit!
        drag = { kind: 'el', name, sx: e.clientX, sy: e.clientY, start: state.current.offsets[name] ?? { x: 0, y: 0 } }
        setSelected(name)
        e.preventDefault()
        return
      }
      const hero = target.closest<HTMLElement>('#hero')
      if (hero) {
        drag = { kind: 'photo', sx: e.clientX, sy: e.clientY, start: state.current.photo, w: hero.clientWidth, h: hero.clientHeight }
        setSelected(null)
        e.preventDefault()
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!drag) return
      const dx = e.clientX - drag.sx
      const dy = e.clientY - drag.sy
      if (drag.kind === 'el') {
        const { name, start } = drag
        setOffsets(prev => ({ ...prev, [name]: { x: Math.round(start.x + dx), y: Math.round(start.y + dy) } }))
      } else {
        // background-position %: moving by d pixels changes it by d / (box - image) * 100
        const imgH = (drag.h * drag.start.zoom) / 100
        const freeX = drag.w - imgH * HERO_PHOTO_RATIO
        const freeY = drag.h - imgH
        const start = drag.start
        setPhoto({
          ...start,
          x: Math.abs(freeX) > 1 ? round1(clamp(start.x + (dx / freeX) * 100, 0, 100)) : start.x,
          y: Math.abs(freeY) > 1 ? round1(clamp(start.y + (dy / freeY) * 100, 0, 100)) : start.y,
        })
      }
    }

    const onUp = () => { drag = null }

    // links must not navigate while editing
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-editor-panel]') && (target.closest('[data-edit]') || target.closest('#hero'))) e.preventDefault()
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  // arrow keys nudge the selected element: 1px, Shift = 10px
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || (e.target as HTMLElement).closest('input, textarea')) return
      const step = e.shiftKey ? 10 : 1
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      if (!d) return
      e.preventDefault()
      setOffsets(prev => {
        const o = prev[selected] ?? { x: 0, y: 0 }
        return { ...prev, [selected]: { x: o.x + d[0], y: o.y + d[1] } }
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const moved = Object.fromEntries(Object.entries(offsets).filter(([, o]) => o.x || o.y))
  const result = JSON.stringify({ ekranoPlotis: width, elementai: moved, nuotrauka: photo }, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      output.current?.select()
    }
  }

  const resetAll = () => {
    setOffsets({})
    setPhoto({ ...HERO_PHOTO })
    setSelected(null)
  }

  const resetOne = (name: string) => setOffsets(prev => {
    const next = { ...prev }
    delete next[name]
    return next
  })

  const btn = {
    background: 'none', border: '1px solid #333', color: '#ccc', cursor: 'pointer',
    padding: '6px 10px', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const,
    fontFamily: "'Outfit', sans-serif",
  }

  return (
    <div
      data-editor-panel
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 1000, width: 320, maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
        backgroundColor: 'rgba(17,17,17,0.97)', border: `1px solid ${PINK}`, color: '#ddd',
        fontFamily: "'Outfit', sans-serif", fontSize: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #222' }}>
        <strong style={{ color: PINK, letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 }}>Išdėstymo redaktorius</strong>
        <button type="button" style={{ ...btn, border: 'none', padding: 4 }} onClick={() => setCollapsed(c => !c)}>
          {collapsed ? 'Rodyti' : 'Slėpti'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, color: '#999', lineHeight: 1.5 }}>
            Tempkite pažymėtus elementus pele. Tuščią hero vietą tempiant juda nuotrauka.
            Pažymėtą elementą tiksliai stumdo rodyklės (Shift = 10 px). Ekrano plotis: <b style={{ color: '#ddd' }}>{width} px</b>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {names.map(name => {
              const o = offsets[name] ?? { x: 0, y: 0 }
              return (
                <div
                  key={name}
                  onClick={() => setSelected(name)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 64px 52px', alignItems: 'center', gap: 6,
                    padding: '4px 6px', cursor: 'pointer',
                    backgroundColor: selected === name ? '#1f1f1f' : 'transparent',
                    color: selected === name ? PINK : '#ccc',
                  }}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: o.x || o.y ? '#ddd' : '#555' }}>{o.x}, {o.y}</span>
                  <button type="button" style={{ ...btn, padding: '2px 6px', fontSize: 10 }} onClick={e => { e.stopPropagation(); resetOne(name) }}>Atst.</button>
                </div>
              )
            })}
          </div>

          <fieldset style={{ border: '1px solid #222', margin: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend style={{ color: '#999', padding: '0 4px' }}>Hero nuotrauka</legend>
            {([
              ['zoom', 'Dydis (aukščio %)', 70, 130],
              ['x', 'Horizontaliai %', 0, 100],
              ['y', 'Vertikaliai %', 0, 100],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} htmlFor={`photo-${key}`} style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 6, alignItems: 'center' }}>
                <span>{label}</span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{photo[key]}</span>
                <input
                  id={`photo-${key}`}
                  type="range" min={min} max={max} step={0.5} value={photo[key]}
                  onChange={e => setPhoto(p => ({ ...p, [key]: Number(e.target.value) }))}
                  style={{ gridColumn: '1 / -1', accentColor: PINK }}
                />
              </label>
            ))}
          </fieldset>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="editor-output" style={{ color: '#999' }}>Reikšmės (nukopijuokite ir atsiųskite):</label>
            <textarea
              id="editor-output" ref={output} readOnly value={result} rows={8}
              onFocus={e => e.currentTarget.select()}
              style={{ width: '100%', resize: 'vertical', backgroundColor: '#0a0a0a', color: '#ccc', border: '1px solid #222', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11, padding: 8 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={copy} style={{ ...btn, flex: 1, backgroundColor: PINK, borderColor: PINK, color: '#080808' }}>
              {copied ? 'Nukopijuota' : 'Kopijuoti reikšmes'}
            </button>
            <button type="button" onClick={resetAll} style={btn}>Atstatyti viską</button>
          </div>
        </div>
      )}
    </div>
  )
}
