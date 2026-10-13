import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { ApiError, checkUpload, formatMb, type MediaItem } from './api'
import { Modal, useApi, useConfirm, useToast } from './context'
import { ErrorState, PageHeader, Skeleton } from './ui'

// Image library: upload by dragging files in, edit the default alt text, delete unused images.
// MediaPicker is the same grid in a dialog, used by image fields and the post editor.

function useMedia() {
  const api = useApi()
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    setError(null)
    api.media().then(r => setItems(r.items)).catch(e => setError(e.message))
  }, [api])
  useEffect(load, [load])
  return { items, setItems, error, reload: load }
}

type Upload = { id: number; name: string; progress: number; error?: string }
let uploadSeq = 0

/** Uploads files one after another and reports progress and errors per file. */
export function useUploads(onDone: (item: MediaItem) => void) {
  const api = useApi()
  const [uploads, setUploads] = useState<Upload[]>([])
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const start = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = ++uploadSeq
      const problem = checkUpload(file)
      setUploads(u => [...u, { id, name: file.name, progress: 0, error: problem ?? undefined }])
      if (problem) continue
      try {
        const item = await api.upload(file, '', p => setUploads(u => u.map(x => (x.id === id ? { ...x, progress: p } : x))))
        doneRef.current(item)
        setUploads(u => u.filter(x => x.id !== id))
      } catch (e) {
        setUploads(u => u.map(x => (x.id === id ? { ...x, error: (e as Error).message } : x)))
      }
    }
  }, [api])
  const dismiss = (id: number) => setUploads(u => u.filter(x => x.id !== id))
  return { uploads, start, dismiss }
}

export function UploadList({ uploads, dismiss }: { uploads: Upload[]; dismiss: (id: number) => void }) {
  if (!uploads.length) return null
  return (
    <div className="adm-uploads" aria-live="polite">
      {uploads.map(u => (
        <div key={u.id} className="adm-upload">
          {u.error ? (
            <>
              <span className="adm-error" style={{ flex: 1 }}>{u.error}</span>
              <button type="button" className="adm-icon-btn" aria-label="Uždaryti" onClick={() => dismiss(u.id)}>×</button>
            </>
          ) : (
            <>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{u.name}</span>
              <span className="adm-upload__bar"><span style={{ width: `${Math.round(u.progress * 100)}%` }} /></span>
              <span>{Math.round(u.progress * 100)}%</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export function DropZone({ multiple, onFiles, children }: { multiple?: boolean; onFiles: (files: File[]) => void; children?: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className="adm-dropzone" role="button" tabIndex={0} data-over={over}
      onClick={() => input.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length) onFiles(multiple ? files : files.slice(0, 1))
      }}
    >
      {children ?? <><strong>Įtempkite nuotraukas čia</strong> arba spauskite ir pasirinkite.<br />JPG, PNG arba WebP, iki 2 MB. Didelės nuotraukos automatiškai sumažinamos.</>}
      <input
        ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} hidden
        onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) onFiles(files) }}
      />
    </div>
  )
}

export function MediaPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (item: MediaItem) => void }) {
  const { items, setItems, error, reload } = useMedia()
  const { uploads, start, dismiss } = useUploads(item => {
    setItems(list => [item, ...(list ?? []).filter(x => x.id !== item.id)])
    onSelect(item)
  })
  return (
    <Modal title="Pasirinkite nuotrauką" onClose={onClose} size="wide">
      <DropZone onFiles={start}>
        <strong>Įtempkite naują nuotrauką čia</strong> arba spauskite ir pasirinkite.<br />JPG, PNG arba WebP, iki 2 MB.
      </DropZone>
      <UploadList uploads={uploads} dismiss={dismiss} />
      {error ? <ErrorState message={error} onRetry={reload} />
        : !items ? <GridSkeleton />
        : items.length === 0 ? <p className="adm-help">Bibliotekoje dar nėra nuotraukų. Įkelkite pirmąją.</p>
        : (
          <div className="adm-media-grid">
            {items.map(item => (
              <div key={item.id} className="adm-media">
                <button type="button" className="adm-media__img" onClick={() => onSelect(item)} aria-label={`Pasirinkti: ${item.alt || item.originalName}`}>
                  <img src={item.src} alt="" loading="lazy" />
                </button>
                <div className="adm-media__body">
                  <span className="adm-media__meta" title={item.originalName}>{item.alt || item.originalName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </Modal>
  )
}

/** Pick several images in order (for a gallery); new uploads join the selection. */
export function MediaMultiPicker({ title, confirmLabel, onClose, onDone }: { title: string; confirmLabel: string; onClose: () => void; onDone: (items: MediaItem[]) => void }) {
  const { items, setItems, error, reload } = useMedia()
  const [picked, setPicked] = useState<MediaItem[]>([])
  const { uploads, start, dismiss } = useUploads(item => {
    setItems(list => [item, ...(list ?? []).filter(x => x.id !== item.id)])
    setPicked(p => (p.some(x => x.id === item.id) ? p : [...p, item]))
  })
  const toggle = (item: MediaItem) => setPicked(p => (p.some(x => x.id === item.id) ? p.filter(x => x.id !== item.id) : [...p, item]))
  return (
    <Modal
      title={title} onClose={onClose} size="wide"
      footer={
        <>
          <span className="adm-help" style={{ marginRight: 'auto', alignSelf: 'center' }}>Pasirinkta: {picked.length}. Nuotraukos bus tokia eilės tvarka, kokia jas pažymėjote.</span>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Atšaukti</button>
          <button type="button" className="adm-btn" disabled={picked.length === 0} onClick={() => onDone(picked)}>{confirmLabel}</button>
        </>
      }
    >
      <DropZone onFiles={start}>
        <strong>Įtempkite kelias naujas nuotraukas čia</strong> arba spauskite ir pasirinkite.<br />JPG, PNG arba WebP, iki 2 MB.
      </DropZone>
      <UploadList uploads={uploads} dismiss={dismiss} />
      {error ? <ErrorState message={error} onRetry={reload} />
        : !items ? <GridSkeleton />
        : items.length === 0 ? <p className="adm-help">Bibliotekoje dar nėra nuotraukų. Įkelkite pirmąsias.</p>
        : (
          <div className="adm-media-grid">
            {items.map(item => {
              const n = picked.findIndex(x => x.id === item.id) + 1
              return (
                <div key={item.id} className={`adm-media${n ? ' adm-media--picked' : ''}`}>
                  <button type="button" className="adm-media__img" aria-pressed={n > 0} onClick={() => toggle(item)} aria-label={`${n ? 'Atžymėti' : 'Pažymėti'}: ${item.alt || item.originalName}`}>
                    <img src={item.src} alt="" loading="lazy" />
                    {n > 0 && <span className="adm-media__num" aria-hidden="true">{n}</span>}
                  </button>
                  <div className="adm-media__body">
                    <span className="adm-media__meta" title={item.originalName}>{item.alt || item.originalName}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </Modal>
  )
}

function GridSkeleton() {
  return (
    <div className="adm-media-grid" aria-busy="true" aria-label="Kraunama">
      {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} style={{ aspectRatio: '4 / 3' }} />)}
    </div>
  )
}

export default function MediaLibraryPage() {
  const { items, setItems, error, reload } = useMedia()
  const toast = useToast()
  const { uploads, start, dismiss } = useUploads(item => {
    setItems(list => [item, ...(list ?? []).filter(x => x.id !== item.id)])
    toast.success(item.duplicate ? 'Tokia nuotrauka jau yra bibliotekoje.' : 'Nuotrauka įkelta.')
  })
  return (
    <>
      <PageHeader kicker="Biblioteka" title="Nuotraukos" lead="Visos įkeltos nuotraukos. Jas galite naudoti bet kuriame puslapyje ar naujienoje. Alt tekstas aprašo nuotrauką paieškos sistemoms ir neregiams." />
      <DropZone multiple onFiles={start} />
      <UploadList uploads={uploads} dismiss={dismiss} />
      {error ? <ErrorState message={error} onRetry={reload} />
        : !items ? <GridSkeleton />
        : items.length === 0 ? <div className="adm-state"><p>Dar nėra įkeltų nuotraukų.</p></div>
        : (
          <div className="adm-media-grid">
            {items.map(item => (
              <MediaCard key={item.id} item={item}
                onChange={next => setItems(list => (list ?? []).map(x => (x.id === next.id ? next : x)))}
                onDeleted={() => setItems(list => (list ?? []).filter(x => x.id !== item.id))} />
            ))}
          </div>
        )}
    </>
  )
}

function MediaCard({ item, onChange, onDeleted }: { item: MediaItem; onChange: (item: MediaItem) => void; onDeleted: () => void }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const [alt, setAlt] = useState(item.alt)
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState<string[] | null>(null)

  const saveAlt = async () => {
    if (alt.trim() === item.alt) return
    setSaving(true)
    try {
      const saved = await api.updateMediaAlt(item.id, alt)
      onChange(saved)
      setAlt(saved.alt)
      toast.success('Alt tekstas išsaugotas.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const ok = await confirm({ title: 'Ištrinti nuotrauką?', text: 'Nuotrauka bus ištrinta visam laikui.', confirm: 'Ištrinti', danger: true })
    if (!ok) return
    try {
      await api.deleteMedia(item.id)
      onDeleted()
      toast.success('Nuotrauka ištrinta.')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'in_use') setUsage((e.data.usage as string[]) ?? [])
      else toast.error((e as Error).message)
    }
  }

  return (
    <div className="adm-media">
      <a className="adm-media__img" href={item.src} target="_blank" rel="noreferrer" aria-label={`Atidaryti ${item.originalName} naujame lange`}>
        <img src={item.src} alt="" loading="lazy" />
      </a>
      <div className="adm-media__body">
        <span className="adm-media__meta" title={item.originalName}>{item.originalName}</span>
        <span className="adm-media__meta">{item.width} × {item.height} · {formatMb(item.size)}</span>
        <input
          className="adm-input" value={alt} maxLength={160} placeholder="Alt tekstas" aria-label={`Alt tekstas: ${item.originalName}`}
          onChange={e => setAlt(e.target.value)} onBlur={saveAlt} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
        <div className="adm-media__actions">
          <span className="adm-media__meta">{saving ? 'Saugoma…' : item.alt ? '' : 'Be alt teksto'}</span>
          <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={`Ištrinti ${item.originalName}`} title="Ištrinti" onClick={remove}>×</button>
        </div>
      </div>
      {usage && (
        <Modal title="Nuotrauka naudojama" onClose={() => setUsage(null)} footer={<button type="button" className="adm-btn" onClick={() => setUsage(null)}>Supratau</button>}>
          <div className="adm-modal__text">
            Šios nuotraukos ištrinti negalima, nes ji naudojama:
            <ul>{usage.map(u => <li key={u}>{u}</li>)}</ul>
            Pirma pakeiskite ją kita nuotrauka ir išsaugokite, tada galėsite ištrinti.
          </div>
        </Modal>
      )}
    </div>
  )
}
