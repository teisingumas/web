import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RegBackup, RegStatus, Registration } from './api'
import { Bars, fmt } from './analytics'
import { Modal, useApi, useConfirm, useToast } from './context'
import { ErrorState, PageHeader, Skeleton, Spinner } from './ui'
import { downloadBlob, xlsxBlob } from './xlsx'

// Registrations from the public form, managed like a small CRM: call, mark the outcome, keep notes.

const STATUS: { id: RegStatus; label: string; short: string }[] = [
  { id: 'nesusisiekta', label: 'Nesusisiekta', short: 'Nesusisiekta' },
  { id: 'susisiekta', label: 'Susisiekta', short: 'Susisiekta' },
  { id: 'neatvyks', label: 'Neatvyks', short: 'Neatvyks' },
]
const statusLabel = (s: RegStatus) => STATUS.find(x => x.id === s)?.label ?? s

const dt = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vilnius' })
const dshort = new Intl.DateTimeFormat('lt-LT', { month: 'short', day: 'numeric', timeZone: 'Europe/Vilnius' })
const fmtDate = (iso: string | null) => (iso ? dt.format(new Date(iso)) : '')

function age(birth: string) {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(birth)
  if (!m) return null
  const b = new Date(+m[1], +m[2] - 1, +m[3])
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}
// "Gatvės šokiai (nuo 4m. iki …)" → "Gatvės šokiai"
const styleNames = (s: string) => [...new Set(s.split(/,\s*(?![^()]*\))/).map(x => x.replace(/\s*\(.*\)\s*$/, '').trim()).filter(Boolean))]
const telHref = (p: string) => 'tel:' + p.replace(/[^\d+]/g, '')

/** Loads the list once per mount; both the stats and the table read from it. */
export function useRegistrations() {
  const api = useApi()
  const [items, setItems] = useState<Registration[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setError(null)
    api.registrations().then(r => setItems(r.items)).catch(e => setError(e.message))
  }, [api, attempt])
  const retry = useCallback(() => setAttempt(a => a + 1), [])
  return { items, setItems, error, retry }
}

type Store = ReturnType<typeof useRegistrations>

// --- stats --------------------------------------------------------------------------------

export function RegistrationStats({ store, range }: { store: Store; range: number }) {
  const { items, error, retry } = store
  if (error) return <section className="an-card"><ErrorState message={error} onRetry={retry} /></section>
  if (!items) return <section className="an-card"><Skeleton style={{ height: 260 }} /></section>

  const since = Date.now() - range * 86400000
  const inRange = items.filter(r => new Date(r.createdAt).getTime() >= since)
  const count = (s: RegStatus) => items.filter(r => r.status === s).length
  const reached = count('susisiekta')
  const decided = reached + count('neatvyks')

  // registrations per week, oldest first; enough weeks to cover the range (at least 8)
  const weeks = Math.max(8, Math.ceil(range / 7))
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday)
    start.setDate(monday.getDate() - (weeks - 1 - i) * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const rows = items.filter(r => { const t = new Date(r.createdAt); return t >= start && t < end })
    return { start, total: rows.length, ok: rows.filter(r => r.status === 'susisiekta').length, no: rows.filter(r => r.status === 'neatvyks').length }
  })

  const tally = (pick: (r: Registration) => string[]) => {
    const m = new Map<string, number>()
    for (const r of inRange) for (const k of pick(r)) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }
  const byStyle = tally(r => styleNames(r.styles))
  const bySource = tally(r => (r.source ? [r.source] : []))
  const byDistrict = tally(r => (r.district ? [r.district] : [])).slice(0, 6)

  return (
    <>
      <div className="an-kpis">
        <div className="an-kpi"><span className="an-kpi__label">Registracijos per {range} d.</span><span className="an-kpi__value">{fmt(inRange.length)}</span><span className="an-kpi__foot"><span>iš viso sąraše {fmt(items.length)}</span></span></div>
        <div className="an-kpi an-kpi--todo"><span className="an-kpi__label">Laukia skambučio</span><span className="an-kpi__value">{fmt(count('nesusisiekta'))}</span><span className="an-kpi__foot"><span>būsena „Nesusisiekta“</span></span></div>
        <div className="an-kpi"><span className="an-kpi__label">Susisiekta</span><span className="an-kpi__value">{fmt(reached)}</span><span className="an-kpi__foot"><span className="an-up">{decided ? Math.round((reached / decided) * 100) : 0}%</span><span>iš aptartų</span></span></div>
        <div className="an-kpi"><span className="an-kpi__label">Neatvyks</span><span className="an-kpi__value">{fmt(count('neatvyks'))}</span><span className="an-kpi__foot"><span>atsisakė ar neatėjo</span></span></div>
      </div>

      <section className="an-card">
        <h2 className="an-title">Registracijos per savaitę</h2>
        <p className="an-sub">Paskutinės {weeks} sav. · tikri duomenys iš registracijos formos</p>
        <WeekBars buckets={buckets} />
      </section>

      <div className="an-grid an-grid--3">
        <section className="an-card"><h2 className="an-title">Pagal stilių</h2>{byStyle.length ? <Bars rows={byStyle} /> : <p className="an-sub">Nėra duomenų.</p>}</section>
        <section className="an-card"><h2 className="an-title">Iš kur sužinojo</h2>{bySource.length ? <Bars rows={bySource} /> : <p className="an-sub">Nėra duomenų.</p>}</section>
        <section className="an-card"><h2 className="an-title">Mikrorajonai</h2>{byDistrict.length ? <Bars rows={byDistrict} /> : <p className="an-sub">Nėra duomenų.</p>}</section>
      </div>
    </>
  )
}

function WeekBars({ buckets }: { buckets: { start: Date; total: number; ok: number; no: number }[] }) {
  const W = 1000, H = 240, P = { l: 36, r: 8, t: 16, b: 30 }
  const max = Math.max(4, ...buckets.map(b => b.total))
  const step = (W - P.l - P.r) / buckets.length
  const bw = Math.min(56, step * 0.62)
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="an-line">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Registracijos per savaitę">
        {[0, Math.round(max / 2), max].map(t => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#E6E3DB" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#6b6b6b">{t}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = P.l + i * step + (step - bw) / 2
          const rest = b.total - b.ok - b.no
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={P.l + i * step} y={P.t} width={step} height={H - P.t - P.b} fill="transparent" />
              <rect x={x} y={y(b.ok)} width={bw} height={y(0) - y(b.ok)} fill="#111" rx="4" />
              <rect x={x} y={y(b.ok + rest)} width={bw} height={y(0) - y(rest)} fill="#F7B1D4" />
              <rect x={x} y={y(b.total)} width={bw} height={y(0) - y(b.no)} fill="#D9D5CB" />
              {b.total > 0 && <text x={x + bw / 2} y={y(b.total) - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="#111">{b.total}</text>}
              <text x={x + bw / 2} y={H - 9} textAnchor="middle" fontSize="12" fill={hover === i ? '#111' : '#6b6b6b'}>{dshort.format(b.start)}</text>
            </g>
          )
        })}
      </svg>
      <div className="an-legend">
        <span><i style={{ background: '#111' }} />Susisiekta</span>
        <span><i style={{ background: '#F7B1D4' }} />Nesusisiekta</span>
        <span><i style={{ background: '#D9D5CB' }} />Neatvyks</span>
      </div>
      {hover !== null && (
        <div className="an-tip" style={{ left: `${((P.l + hover * step + step / 2) / W) * 100}%` }}>
          <span>Savaitė nuo {dshort.format(buckets[hover].start)}</span>
          <b>{buckets[hover].total} registr. · {buckets[hover].ok} susisiekta</b>
        </div>
      )}
    </div>
  )
}

// --- the table ----------------------------------------------------------------------------

const COLS: { key: keyof Registration | 'age'; label: string; width: number }[] = [
  { key: 'id', label: 'Nr.', width: 6 },
  { key: 'createdAt', label: 'Gauta', width: 17 },
  { key: 'dancer', label: 'Šokėjas', width: 24 },
  { key: 'birthDate', label: 'Gimimo data', width: 12 },
  { key: 'age', label: 'Amžius', width: 8 },
  { key: 'phone', label: 'Telefonas', width: 16 },
  { key: 'parentPhone', label: 'Tėvų telefonas', width: 16 },
  { key: 'email', label: 'El. paštas', width: 28 },
  { key: 'styles', label: 'Stiliai', width: 30 },
  { key: 'district', label: 'Mikrorajonas', width: 16 },
  { key: 'source', label: 'Iš kur sužinojo', width: 16 },
  { key: 'experience', label: 'Patirtis', width: 36 },
  { key: 'status', label: 'Būsena', width: 14 },
  { key: 'statusAt', label: 'Būsena pakeista', width: 17 },
  { key: 'notes', label: 'Pastabos', width: 40 },
]

function exportXlsx(rows: Registration[], name: string) {
  const data = rows.map(r => COLS.map(c => {
    if (c.key === 'age') return age(r.birthDate)
    if (c.key === 'createdAt' || c.key === 'statusAt') return fmtDate(r[c.key])
    if (c.key === 'status') return statusLabel(r.status)
    if (c.key === 'styles') return styleNames(r.styles).join(', ')
    const v = r[c.key]
    return typeof v === 'number' ? v : String(v ?? '')
  }))
  downloadBlob(xlsxBlob('Registracijos', COLS.map(c => c.label), data, COLS.map(c => c.width)), name)
}

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vilnius' })

export function RegistrationsCrm({ store }: { store: Store }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const { items, setItems, error, retry } = store
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<RegStatus | ''>('')
  const [style, setStyle] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [backups, setBackups] = useState(false)

  const styles = useMemo(() => [...new Set((items ?? []).flatMap(r => styleNames(r.styles)))].sort(), [items])
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items ?? []).filter(r =>
      (!status || r.status === status) &&
      (!style || styleNames(r.styles).includes(style)) &&
      (!needle || [r.dancer, r.email, r.phone, r.parentPhone, r.district, r.notes].some(v => v.toLowerCase().includes(needle))))
  }, [items, q, status, style])
  const demoCount = (items ?? []).filter(r => r.demo).length

  const patch = (id: number, p: { status?: RegStatus; notes?: string }) => {
    const before = items
    setItems(list => list && list.map(r => (r.id === id ? { ...r, ...p, statusAt: p.status && p.status !== r.status ? new Date().toISOString() : r.statusAt } : r)))
    return api.updateRegistration(id, p)
      .then(saved => { setItems(list => list && list.map(r => (r.id === id ? saved : r))); return true })
      .catch(e => { setItems(before); toast.error(e.message); return false })
  }

  const remove = async (r: Registration) => {
    if (!(await confirm({ title: 'Ištrinti registraciją?', text: <>Bus ištrinta <b>{r.dancer}</b> registracija. Vakarykštė atsarginė kopija jos nepraras.</>, confirm: 'Ištrinti', danger: true }))) return
    api.deleteRegistration(r.id).then(() => { setItems(list => list && list.filter(x => x.id !== r.id)); toast.success('Registracija ištrinta.') }).catch(e => toast.error(e.message))
  }

  const removeDemo = async () => {
    if (!(await confirm({ title: `Ištrinti ${demoCount} pavyzdines registracijas?`, text: 'Liks tik tikros registracijos iš svetainės formos.', confirm: 'Ištrinti pavyzdines', danger: true }))) return
    api.deleteDemoRegistrations().then(r => { setItems(list => list && list.filter(x => !x.demo)); toast.success(`Ištrinta: ${r.deleted}.`) }).catch(e => toast.error(e.message))
  }

  return (
    <section className="an-card crm" id="registracijos">
      <div className="crm__head">
        <div>
          <h2 className="an-title">Registracijų sąrašas</h2>
          <p className="an-sub">Visos registracijos iš svetainės formos. Paskambinkite, pažymėkite rezultatą ir užsirašykite pastabas: viskas išsaugoma iš karto.</p>
        </div>
        <div className="crm__actions">
          <button type="button" className="adm-btn adm-btn--small" disabled={!shown.length} onClick={() => exportXlsx(shown, `registracijos-${today()}.xlsx`)}>
            Eksportuoti į Excel{shown.length !== (items?.length ?? 0) ? ` (${shown.length})` : ''}
          </button>
          <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setBackups(true)}>Atsarginės kopijos</button>
          {demoCount > 0 && <button type="button" className="adm-btn adm-btn--small adm-btn--ghost crm__demo" onClick={removeDemo}>Ištrinti pavyzdines ({demoCount})</button>}
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={retry} /> : !items ? <Skeleton style={{ height: 320 }} /> : (
        <>
          <div className="crm__filters">
            <input type="search" className="adm-input crm__search" placeholder="Ieškoti: vardas, telefonas, el. paštas, pastabos" value={q} onChange={e => setQ(e.target.value)} aria-label="Ieškoti registracijų" />
            <div className="an-range" role="tablist" aria-label="Būsena">
              <button type="button" role="tab" aria-selected={status === ''} onClick={() => setStatus('')}>Visos <span className="crm__n">{items.length}</span></button>
              {STATUS.map(s => (
                <button key={s.id} type="button" role="tab" aria-selected={status === s.id} onClick={() => setStatus(s.id)}>
                  {s.short} <span className="crm__n">{items.filter(r => r.status === s.id).length}</span>
                </button>
              ))}
            </div>
            <select className="adm-input crm__select" value={style} onChange={e => setStyle(e.target.value)} aria-label="Stilius">
              <option value="">Visi stiliai</option>
              {styles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {!shown.length ? <p className="crm__empty">{items.length ? 'Pagal paiešką registracijų nerasta.' : 'Registracijų dar nėra. Jos atsiras čia, kai kas nors užpildys formą svetainėje.'}</p> : (
            <div className="crm__wrap">
              <table className="crm__table">
                <thead>
                  <tr><th>Gauta</th><th>Šokėjas</th><th>Kontaktai</th><th>Stilius</th><th>Būsena</th><th>Pastabos</th><th aria-label="Veiksmai" /></tr>
                </thead>
                <tbody>
                  {shown.map(r => (
                    <Row key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(o => (o === r.id ? null : r.id))} onPatch={p => patch(r.id, p)} onDelete={() => remove(r)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {backups && <Backups onClose={() => setBackups(false)} all={items ?? []} />}
    </section>
  )
}

function Row({ r, open, onToggle, onPatch, onDelete }: { r: Registration; open: boolean; onToggle: () => void; onPatch: (p: { status?: RegStatus; notes?: string }) => Promise<boolean>; onDelete: () => void }) {
  const [notes, setNotes] = useState(r.notes)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  useEffect(() => setNotes(r.notes), [r.notes])
  const saveNotes = () => {
    if (notes === r.notes) return
    setSaving('saving')
    onPatch({ notes }).then(ok => { setSaving(ok ? 'saved' : 'idle'); if (ok) setTimeout(() => setSaving('idle'), 1800) })
  }
  const a = age(r.birthDate)
  return (
    <>
      <tr className={`crm__row crm__row--${r.status}`}>
        <td data-label="Gauta" className="crm__date">{fmtDate(r.createdAt).slice(0, 10)}<small>{fmtDate(r.createdAt).slice(11)}</small>{r.demo && <span className="crm__tag">pavyzdys</span>}</td>
        <td data-label="Šokėjas">
          <b className="crm__name">{r.dancer}</b>
          <span className="crm__meta">{a !== null ? `${a} m.` : ''}{a !== null && r.district ? ' · ' : ''}{r.district}</span>
        </td>
        <td data-label="Kontaktai">
          <div className="crm__contact">
            <a href={telHref(r.phone)} className="crm__call" title={`Skambinti ${r.phone}`}>
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
              {r.phone}
            </a>
            {r.parentPhone && <a href={telHref(r.parentPhone)} className="crm__sub">Tėvai: {r.parentPhone}</a>}
            <a href={`mailto:${r.email}`} className="crm__sub">{r.email}</a>
          </div>
        </td>
        <td data-label="Stilius"><div className="crm__styles">{styleNames(r.styles).map(s => <span key={s}>{s}</span>)}</div></td>
        <td data-label="Būsena">
          <div className="crm__status" role="group" aria-label={`${r.dancer}: būsena`}>
            {STATUS.map(s => (
              <button key={s.id} type="button" className={`crm__st crm__st--${s.id}`} aria-pressed={r.status === s.id} onClick={() => r.status !== s.id && onPatch({ status: s.id })}>{s.short}</button>
            ))}
          </div>
          {r.statusAt && r.status !== 'nesusisiekta' && <span className="crm__meta">{fmtDate(r.statusAt)}</span>}
        </td>
        <td data-label="Pastabos" className="crm__notes">
          <textarea className="adm-input" rows={2} value={notes} placeholder="Įrašykite pastabą…" onChange={e => setNotes(e.target.value)} onBlur={saveNotes} aria-label={`${r.dancer}: pastabos`} />
          <span className="crm__saved" aria-live="polite">{saving === 'saving' ? <><Spinner /> Saugoma…</> : saving === 'saved' ? 'Išsaugota' : ''}</span>
        </td>
        <td className="crm__more">
          <button type="button" className="crm__icon" aria-expanded={open} aria-label="Daugiau informacijos" onClick={onToggle}>{open ? '−' : '+'}</button>
        </td>
      </tr>
      {open && (
        <tr className="crm__detail">
          <td colSpan={7}>
            <dl>
              <div><dt>Gimimo data</dt><dd>{r.birthDate || '—'}</dd></div>
              <div><dt>Iš kur sužinojo</dt><dd>{r.source || '—'}</dd></div>
              <div><dt>Visi stiliai</dt><dd>{r.styles || '—'}</dd></div>
              <div className="crm__wide"><dt>Šokio patirtis</dt><dd>{r.experience || '—'}</dd></div>
            </dl>
            <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={onDelete}>Ištrinti registraciją</button>
          </td>
        </tr>
      )}
    </>
  )
}

function Backups({ onClose, all }: { onClose: () => void; all: Registration[] }) {
  const api = useApi()
  const toast = useToast()
  const [list, setList] = useState<RegBackup[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.registrationBackups().then(r => setList(r.items)).catch(e => setError(e.message)) }, [api])
  const download = (name: string) => api.registrationBackup(name).then(b => downloadBlob(b, name)).catch(e => toast.error(e.message))
  return (
    <Modal title="Atsarginės kopijos" onClose={onClose}
      footer={<>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Uždaryti</button>
        <button type="button" className="adm-btn" disabled={!all.length} onClick={() => exportXlsx(all, `registracijos-visos-${today()}.xlsx`)}>Atsisiųsti viską (.xlsx)</button>
      </>}>
      <p className="adm-modal__text">Kiekvieną dieną, kai gaunama nauja registracija ar pakeičiama būsena, serveryje automatiškai išsaugoma tos dienos kopija (Excel atidaromas .csv failas). Kopijos laikomos už svetainės aplanko ribų ir neištrinamos.</p>
      {error ? <ErrorState message={error} /> : !list ? <Skeleton style={{ height: 120 }} /> : !list.length ? <p className="adm-modal__text">Kopijų dar nėra.</p> : (
        <ul className="crm__backups">
          {list.map(b => (
            <li key={b.name}>
              <span><b>{b.name}</b><small>{fmtDate(b.modifiedAt)} · {Math.max(1, Math.round(b.size / 1024))} KB</small></span>
              <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => download(b.name)}>Atsisiųsti</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

export function RegistrationsPage() {
  const store = useRegistrations()
  return (
    <>
      <PageHeader kicker="Klientai" title="Registracijos" lead="Registracijos iš svetainės formos: skambinkite, žymėkite rezultatą, rašykite pastabas, eksportuokite į Excel." />
      <RegistrationStats store={store} range={30} />
      <RegistrationsCrm store={store} />
    </>
  )
}
