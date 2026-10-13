import { useEffect, useRef, useState } from 'react'
import type { Img } from '../content/types'
import { checkUpload, type MediaItem } from './api'
import { useApi, useToast } from './context'
import { Counter, FieldMessages, Label, type PathArr, type Setter } from './fields'
import { MediaPicker } from './MediaLibrary'
import type { Errors, ImageField } from './schema'

// An image with its alt text. Drop a file on the preview, pick one from the library, or keep the
// current one. Fields with "focus" (the hero) also store which point of the photo must stay visible.

export default function ImageInput({ field, value, path, errors, set }: { field: ImageField; value: Img | undefined; path: PathArr; errors: Errors; set: Setter }) {
  const api = useApi()
  const toast = useToast()
  const img: Img = value ?? { src: '', alt: '' }
  const p = path.join('.')
  const id = 'f-' + p.replace(/[^a-zA-Z0-9]+/g, '-')
  const altMode = field.alt ?? 'required'
  const srcError = errors[`${p}.src`]
  const altError = errors[`${p}.alt`]
  const fileInput = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const choose = (item: Pick<MediaItem, 'src' | 'alt'>) => {
    const next: Img = { src: item.src, alt: altMode === 'none' ? '' : item.alt }
    if (field.focus) Object.assign(next, { x: 50, y: 50 })
    set(path, next)
    setNatural(null)
  }

  const upload = async (file: File) => {
    const problem = checkUpload(file)
    if (problem) {
      toast.error(problem)
      return
    }
    setProgress(0)
    try {
      const item = await api.upload(file, '', setProgress)
      choose(item)
      toast.success(altMode === 'required' ? 'Nuotrauka įkelta. Neužmirškite alt teksto.' : 'Nuotrauka įkelta.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setProgress(null)
    }
  }

  // Focus fields: the preview box takes the photo's proportions, so the focus point is simply
  // x% / y% of the box, both for the dot and for the click.
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const el = imgRef.current
    if (el?.complete && el.naturalWidth) setNatural({ w: el.naturalWidth, h: el.naturalHeight })
  }, [img.src])
  const focusReady = !!(field.focus && img.src && natural)

  return (
    <div className="adm-field">
      <Label field={field} htmlFor={img.src && altMode !== 'none' ? `${id}-alt` : undefined} />
      <div className="adm-image">
        <div
          className="adm-drop" role="button" tabIndex={0} data-over={over} data-filled={!!img.src}
          style={focusReady ? { aspectRatio: `${natural!.w} / ${natural!.h}`, cursor: 'crosshair' } : undefined}
          aria-label={field.focus && img.src ? 'Paspauskite svarbiausią nuotraukos vietą' : img.src ? 'Pakeisti nuotrauką' : 'Įkelti nuotrauką'}
          aria-invalid={!!srcError}
          onClick={e => {
            if (field.focus && img.src) {
              if (!focusReady) return
              const box = e.currentTarget.getBoundingClientRect()
              const pct = (v: number) => Math.round(Math.max(0, Math.min(100, v * 100)) * 10) / 10
              set(path, { ...img, x: pct((e.clientX - box.left) / box.width), y: pct((e.clientY - box.top) / box.height) })
            } else {
              fileInput.current?.click()
            }
          }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !(field.focus && img.src)) { e.preventDefault(); fileInput.current?.click() } }}
          onDragOver={e => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const file = e.dataTransfer.files[0]
            if (file) upload(file)
          }}
        >
          {img.src ? (
            <img ref={imgRef} src={img.src} alt="" onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
          ) : (
            <>
              <span className="adm-drop__icon" aria-hidden="true">＋</span>
              <span><strong style={{ color: 'var(--text)' }}>Įtempkite nuotrauką čia</strong><br />arba spauskite ir pasirinkite</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>JPG, PNG, WebP iki 2 MB</span>
            </>
          )}
          {focusReady && <span className="adm-focus-dot" style={{ left: `${img.x ?? 50}%`, top: `${img.y ?? 50}%` }} aria-hidden="true" />}
          {progress !== null && (
            <div className="adm-drop__overlay">
              <span className="adm-spinner" />
              <span>Įkeliama… {Math.round(progress * 100)}%</span>
              <div className="adm-drop__progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            </div>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f) }} />

        <div className="adm-image__side">
          {img.src && altMode !== 'none' && (
            <div className="adm-field">
              <label htmlFor={`${id}-alt`} className="adm-label">
                <span>Alt tekstas{altMode === 'required' && <span className="adm-req"> *</span>}</span>
                <Counter length={(img.alt ?? '').trim().length} max={160} />
              </label>
              <input
                id={`${id}-alt`} className="adm-input" value={img.alt ?? ''} aria-invalid={!!altError}
                placeholder="Pvz.: Vaikai šoka gatvės šokius Me Gusta salėje"
                aria-describedby={altError ? `${id}-alt-error` : `${id}-alt-help`}
                onChange={e => set([...path, 'alt'], e.target.value)}
              />
              {altError
                ? <p id={`${id}-alt-error`} className="adm-error">{altError}</p>
                : <p id={`${id}-alt-help`} className="adm-help">Trumpai aprašykite, kas nuotraukoje. Tai svarbu Google paieškai ir neregiams.</p>}
            </div>
          )}
          <div className="adm-image__buttons">
            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => fileInput.current?.click()} disabled={progress !== null}>
              {img.src ? 'Keisti nuotrauką' : 'Įkelti nuotrauką'}
            </button>
            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setPickerOpen(true)} disabled={progress !== null}>Iš bibliotekos</button>
            {img.src && !field.required && (
              <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => set(path, { src: '', alt: '' })}>Pašalinti</button>
            )}
          </div>
          {field.focus && img.src && <p className="adm-help">Paspauskite ant nuotraukos ten, kur svarbiausia vieta (pvz. šokėjų veidai): ji liks matoma ir telefonuose.</p>}
          <FieldMessages id={id} help={field.help} error={srcError} />
        </div>
      </div>
      {pickerOpen && <MediaPicker onClose={() => setPickerOpen(false)} onSelect={item => { choose(item); setPickerOpen(false) }} />}
    </div>
  )
}
