import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Img } from '../content/types'
import { EventView } from '../EventPage'
import { navigate, SLUG_RE } from '../router'
import { ApiError, type AdminEvent, type EventInput, type EventList, type LookupInput, type LookupKind, type LookupMap, type Organizer, type Venue } from './api'
import { Modal, useApi, useConfirm, useDirty, useToast } from './context'
import { Counter, setIn, type PathArr } from './fields'
import { SectionCard, SeoCard, SerpPreview, stableJson } from './FormCard'
import ImageInput from './ImageInput'
import { ADMIN } from './pages'
import { fromVilniusLocal, slugify, toVilniusLocal } from './posts'
import RichEditor from './RichEditor'
import { SCHEMA, type Errors, type ImageField } from './schema'
import { ErrorState, formatDateTime, PageHeader, Skeleton, Spinner, Tabs } from './ui'

const statusKey = (p: Pick<AdminEvent, 'status' | 'scheduled'>) => (p.scheduled ? 'scheduled' : p.status)
const statusLabel = (p: Pick<AdminEvent, 'status' | 'scheduled'>) => ({ published: 'Publikuotas', draft: 'Juodraštis', scheduled: 'Suplanuotas' })[statusKey(p)]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]?\d|2[0-3])[:.][0-5]\d$/
const PRICE_RE = /^\d{1,5}([.,]\d{1,2})?$/
const parsePrice = (s: string) => (PRICE_RE.test(s.trim()) ? Number(s.trim().replace(',', '.')) : null)

// --- /apzvalga/renginiai ----------------------------------------------------------------------

export function EventsAdmin() {
  const [tab, setTab] = useState<'events' | 'page' | 'seo'>('events')
  return (
    <>
      <PageHeader
        kicker="Renginiai" title="Renginiai"
        lead={<>Publikuoti renginiai rodomi kalendoriuje <a className="adm-link" href="/kalendorius" target="_blank" rel="noreferrer">/kalendorius</a>, kiekvienas turi savo adresą, pvz. <span className="adm-code">/kalendorius/atviru-duru-diena</span>.</>}
        actions={<a href={`${ADMIN}/renginiai/naujas`} className="adm-btn">+ Naujas renginys</a>}
      />
      <Tabs label="Renginių skiltys" value={tab} onChange={setTab} tabs={[
        { id: 'events', label: 'Renginiai' }, { id: 'page', label: 'Puslapio tekstai' }, { id: 'seo', label: 'SEO' },
      ]} />
      <div hidden={tab !== 'events'}><EventsList /></div>
      <div hidden={tab !== 'page'}><SectionCard sectionKey="calendar" defaultOpen viewHref="/kalendorius" /></div>
      <div hidden={tab !== 'seo'}><SeoCard pageKey="kalendorius" path="/kalendorius" /></div>
    </>
  )
}

function EventsList() {
  const api = useApi()
  const [status, setStatus] = useState<'' | 'published' | 'draft'>('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<EventList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const t = window.setTimeout(() => { setQ(query); setPage(1) }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.events({ status, q, page })
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, status, q, page, attempt])

  const counts = data?.counts
  return (
    <>
      <div className="adm-toolbar">
        <div role="tablist" aria-label="Filtras" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([['', 'Visi', counts?.all], ['published', 'Publikuoti', counts?.published], ['draft', 'Juodraščiai', counts?.draft]] as const).map(([value, label, n]) => (
            <button key={value} type="button" role="tab" aria-selected={status === value}
              className={`adm-btn adm-btn--small${status === value ? '' : ' adm-btn--ghost'}`}
              onClick={() => { setStatus(value); setPage(1) }}>
              {label}{n !== undefined && ` (${n})`}
            </button>
          ))}
        </div>
        <input className="adm-input" type="search" placeholder="Ieškoti pagal pavadinimą…" aria-label="Ieškoti renginių" value={query} onChange={e => setQuery(e.target.value)} />
        {loading && data && <Spinner />}
      </div>

      {error ? <ErrorState message={error} onRetry={() => setAttempt(a => a + 1)} />
        : !data ? (
          <div className="adm-table" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="adm-table__row"><Skeleton style={{ height: 45 }} /><Skeleton /><Skeleton /><Skeleton /><span /></div>)}</div>
        ) : data.items.length === 0 ? (
          <div className="adm-state">
            <p>{q || status ? 'Pagal šiuos kriterijus renginių nerasta.' : 'Renginių dar nėra. Sukurkite pirmąjį!'}</p>
            {!q && !status && <a href={`${ADMIN}/renginiai/naujas`} className="adm-btn adm-btn--small">+ Naujas renginys</a>}
          </div>
        ) : (
          <div className="adm-table">
            <div className="adm-table__row adm-table__row--head" aria-hidden="true"><span /><span>Pavadinimas</span><span>Būsena</span><span>Renginio data</span><span /></div>
            {data.items.map(p => (
              <div key={p.id} className="adm-table__row">
                {p.cover.src ? <img className="adm-table__thumb" src={p.cover.src} alt="" loading="lazy" /> : <span className="adm-table__thumb" aria-hidden="true" />}
                <div style={{ minWidth: 0 }}>
                  <a className="adm-table__title" href={`${ADMIN}/renginiai/${p.id}`}>{p.title || 'Be pavadinimo'}</a>
                  <span className="adm-table__slug">/kalendorius/{p.slug}</span>
                </div>
                <span>
                  <span className={`adm-chip adm-chip--${statusKey(p)}`}>{statusLabel(p)}</span>
                  {p.scheduled && <span className="adm-table__slug">pasirodys {formatDateTime(p.publishedAt)}</span>}
                </span>
                <span className="adm-table__date">
                  {p.startDate ? <>{p.startDate}{p.endDate && <> – {p.endDate}</>}<span className="adm-table__slug">{p.allDay ? 'Visą dieną' : [p.startTime, p.endTime].filter(Boolean).join(' – ')}</span></> : '—'}
                </span>
                <div className="adm-table__actions">
                  <a className="adm-btn adm-btn--small adm-btn--ghost" href={`${ADMIN}/renginiai/${p.id}`}>Redaguoti</a>
                  {p.status === 'published' && !p.scheduled && <a className="adm-btn adm-btn--small adm-btn--ghost" href={`/kalendorius/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`Žiūrėti „${p.title}“ svetainėje`}>↗</a>}
                </div>
              </div>
            ))}
          </div>
        )}

      {data && data.pages > 1 && (
        <nav className="adm-pages" aria-label="Puslapiai">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" className={`adm-btn adm-btn--small${n === data.page ? '' : ' adm-btn--ghost'}`} aria-current={n === data.page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
          ))}
        </nav>
      )}
    </>
  )
}

// --- /apzvalga/renginiai/naujas, /apzvalga/renginiai/:id -------------------------------------

type Form = {
  title: string; slug: string; excerpt: string; bodyHtml: string; cover: Img; type: string
  allDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string
  venueId: string; organizerId: string   // '' = none
  showMap: boolean; price: string
  seoTitle: string; seoDescription: string; seoKeywords: string
  publishedAt: string   // Lithuanian time, '' = automatic (now)
}
const EMPTY: Form = {
  title: '', slug: '', excerpt: '', bodyHtml: '', cover: { src: '', alt: '' }, type: SCHEMA.options.eventTypes[0].value,
  allDay: false, startDate: '', startTime: '', endDate: '', endTime: '', venueId: '', organizerId: '', showMap: false, price: '',
  seoTitle: '', seoDescription: '', seoKeywords: '', publishedAt: '',
}
const COVER_FIELD: ImageField = { key: 'cover', type: 'image', label: 'Nuotrauka (thumbnail)', required: true, help: 'Rodoma kalendoriuje, renginio puslapio viršuje ir dalinantis Facebook. Geriausia plati, pvz. 1600 × 1000 px.' }

const fromEvent = (e: AdminEvent): Form => ({
  title: e.title, slug: e.slug, excerpt: e.excerpt, bodyHtml: e.bodyHtml, cover: e.cover, type: e.type,
  allDay: e.allDay, startDate: e.startDate ?? '', startTime: e.startTime ?? '', endDate: e.endDate ?? '', endTime: e.endTime ?? '',
  venueId: e.venueId === null ? '' : String(e.venueId), organizerId: e.organizerId === null ? '' : String(e.organizerId),
  showMap: e.showMap, price: e.price === null ? '' : String(e.price).replace('.', ','),
  seoTitle: e.seoTitle, seoDescription: e.seoDescription, seoKeywords: e.seoKeywords,
  publishedAt: toVilniusLocal(e.publishedAt),
})

function slugProblem(slug: string) {
  if (!slug) return 'Įrašykite adresą.'
  if (!SLUG_RE.test(slug)) return 'Tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai, pvz. atviru-duru-diena.'
  return null
}

function validateEvent(f: Form, slugAuto: boolean, publish: boolean, venues: Venue[]): Errors {
  const e: Errors = {}
  const len = (s: string) => s.trim().length
  if (!len(f.title)) e.title = 'Įrašykite pavadinimą.'
  else if (len(f.title) > 160) e.title = `Ne daugiau kaip 160 ženklų (dabar ${len(f.title)}).`
  if (!slugAuto) { const p = slugProblem(f.slug); if (p) e.slug = p }
  if (len(f.excerpt) > 300) e.excerpt = `Ne daugiau kaip 300 ženklų (dabar ${len(f.excerpt)}).`
  if (f.cover.src && len(f.cover.alt) < 3) e['cover.alt'] = 'Trumpai aprašykite, kas nuotraukoje (alt tekstas).'

  if (f.startDate && !DATE_RE.test(f.startDate)) e.startDate = 'Neteisinga pradžios data.'
  if (f.endDate && !DATE_RE.test(f.endDate)) e.endDate = 'Neteisinga pabaigos data.'
  if (!f.allDay) {
    if (f.startTime && !TIME_RE.test(f.startTime)) e.startTime = 'Laikas formatu VV:MM, pvz. 17:30.'
    if (f.endTime && !TIME_RE.test(f.endTime)) e.endTime = 'Laikas formatu VV:MM, pvz. 17:30.'
    if (f.endTime && !f.startTime && !e.startTime) e.startTime = 'Įrašykite pradžios laiką.'
  }
  if (f.startDate && f.endDate && !e.endDate && f.endDate < f.startDate) e.endDate = 'Pabaigos data negali būti ankstesnė už pradžios datą.'
  if (!f.allDay && f.startDate && (!f.endDate || f.endDate === f.startDate) && f.startTime && f.endTime && !e.endTime && f.endTime <= f.startTime) {
    e.endTime = 'Pabaiga turi būti vėliau nei pradžia.'
  }
  if (f.price.trim() && parsePrice(f.price) === null) e.price = 'Įrašykite kainą skaičiais, pvz. 12 arba 12,50 (0 = nemokamas).'
  if (len(f.seoTitle) > 70) e.seoTitle = `Ne daugiau kaip 70 ženklų (dabar ${len(f.seoTitle)}).`
  if (len(f.seoDescription) > 160) e.seoDescription = `Ne daugiau kaip 160 ženklų (dabar ${len(f.seoDescription)}).`
  if (len(f.seoKeywords) > 255) e.seoKeywords = 'Ne daugiau kaip 255 ženklai.'
  if (publish) {
    if (!len(f.excerpt)) e.excerpt = 'Prieš publikuojant įrašykite trumpą aprašą (jis rodomas kalendoriuje).'
    if (!f.cover.src) e['cover.src'] = 'Prieš publikuojant įkelkite nuotrauką (thumbnail).'
    if (!f.startDate) e.startDate = 'Prieš publikuojant nurodykite renginio datą.'
    if (!f.allDay && !f.startTime && !e.startTime) e.startTime = 'Nurodykite pradžios laiką arba pažymėkite „Visos dienos renginys“.'
    if (f.showMap) {
      const venue = venues.find(v => String(v.id) === f.venueId)
      if (!venue) e.venueId = 'Kad rodytumėte žemėlapį, pasirinkite vietą.'
      else if (!venue.address.trim()) e.venueId = 'Pasirinktos vietos adresas nenurodytas, todėl žemėlapio parodyti negalima. Papildykite vietą skiltyje „Vietos“.'
    }
  }
  return e
}

export function EventEditor({ id }: { id: number | 'new' }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [form, setForm] = useState<Form>(EMPTY)
  const [base, setBase] = useState<Form>(EMPTY)
  const [slugAuto, setSlugAuto] = useState(id === 'new')
  const [errors, setErrors] = useState<Errors>({})
  const [tried, setTried] = useState<'draft' | 'published' | null>(null)
  const [saving, setSaving] = useState<'draft' | 'published' | 'delete' | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [slugRemote, setSlugRemote] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [organizers, setOrganizers] = useState<Organizer[]>([])
  const [adding, setAdding] = useState<LookupKind | null>(null)

  // The lists the dropdowns are made of.
  useEffect(() => {
    api.lookups('venues').then(r => setVenues(r.items)).catch(() => {})
    api.lookups('organizers').then(r => setOrganizers(r.items)).catch(() => {})
  }, [api])

  // Load the event (a freshly created one is already in state).
  useEffect(() => {
    if (id === 'new') {
      setEvent(null); setForm(EMPTY); setBase(EMPTY); setSlugAuto(true)
      return
    }
    if (event?.id === id) return
    let cancelled = false
    setLoadError(null)
    api.event(id)
      .then(p => { if (cancelled) return; setEvent(p); setForm(fromEvent(p)); setBase(fromEvent(p)); setSlugAuto(false) })
      .catch(e => { if (!cancelled) setLoadError(e.message) })
    return () => { cancelled = true }
  }, [api, id, attempt])

  const effective = useMemo(() => (slugAuto ? { ...form, slug: slugify(form.title) } : form), [form, slugAuto])
  const dirty = stableJson(effective) !== stableJson(base) && !(id === 'new' && !form.title && !form.bodyHtml && !form.excerpt && !form.cover.src)
  const markClean = useDirty('event-editor', dirty)

  const set = useCallback((path: PathArr, value: unknown) => {
    setForm(f => setIn(f, path, value))
  }, [])

  // live errors after a failed attempt
  const shownErrors = useMemo(
    () => (tried ? { ...validateEvent(form, slugAuto, tried === 'published', venues), ...errors } : errors),
    [tried, form, slugAuto, errors, venues],
  )

  // Is the typed address free? (checked while typing, the server checks again on save)
  useEffect(() => {
    setSlugRemote(null)
    if (slugAuto || slugProblem(form.slug) || form.slug === event?.slug) return
    const t = window.setTimeout(() => {
      api.eventSlugCheck(form.slug, event?.id).then(r => setSlugRemote(r.ok ? null : r.message)).catch(() => {})
    }, 450)
    return () => window.clearTimeout(t)
  }, [api, form.slug, slugAuto, event?.id, event?.slug])

  const status = event?.status ?? 'draft'
  const isPublished = status === 'published'
  const chosenAt = form.publishedAt ? fromVilniusLocal(form.publishedAt) : null
  const willSchedule = !!chosenAt && chosenAt.getTime() > Date.now()
  const isScheduled = !!event?.scheduled
  const dateLabel = formatDateTime(chosenAt?.toISOString())
  const venue = venues.find(v => String(v.id) === form.venueId)
  const organizer = organizers.find(o => String(o.id) === form.organizerId)

  const focusFirstError = () => window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.adm-post [aria-invalid="true"]')
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.focus({ preventScroll: true })
  }, 50)

  const save = async (next: 'draft' | 'published') => {
    const found = validateEvent(form, slugAuto, next === 'published', venues)
    if (Object.keys(found).length) {
      setTried(next)
      setErrors({})
      toast.error(next === 'published' ? 'Kad publikuotumėte, užpildykite pažymėtus laukus.' : 'Patikrinkite pažymėtus laukus.')
      focusFirstError()
      return
    }
    if (isPublished && !isScheduled && event && !slugAuto && form.slug !== event.slug) {
      const ok = await confirm({
        title: 'Pakeisti adresą?',
        text: <>Renginys persikels iš <span className="adm-code">/kalendorius/{event.slug}</span> į <span className="adm-code">/kalendorius/{form.slug}</span>. Sena nuoroda automatiškai nukreips į naują, todėl pasidalintos nuorodos (pvz. Facebook) ir Google rezultatai toliau veiks.</>,
        confirm: 'Keisti adresą',
      })
      if (!ok) return
    }
    if (isPublished && next === 'draft') {
      const ok = await confirm({ title: 'Grąžinti į juodraščius?', text: 'Renginys nebebus matomas svetainėje, kol vėl jį publikuosite.', confirm: 'Grąžinti', danger: true })
      if (!ok) return
    }
    setSaving(next)
    const input: EventInput = {
      ...form, status: next, slugAuto, slug: slugAuto ? slugify(form.title) : form.slug,
      venueId: form.venueId ? Number(form.venueId) : null, organizerId: form.organizerId ? Number(form.organizerId) : null,
    } as unknown as EventInput
    try {
      const saved = event ? await api.updateEvent(event.id, input) : await api.createEvent(input)
      setEvent(saved)
      setForm(fromEvent(saved))
      setBase(fromEvent(saved))
      setSlugAuto(false)
      setErrors({})
      setTried(null)
      toast.success(
        next === 'draft'
          ? (isPublished ? 'Renginys grąžintas į juodraščius ir nebematomas svetainėje.' : 'Juodraštis išsaugotas.')
          : saved.scheduled
            ? `Renginys suplanuotas: svetainėje jis pasirodys ${formatDateTime(saved.publishedAt)}.`
            : (isPublished ? 'Pakeitimai paskelbti svetainėje.' : 'Renginys paskelbtas! Jis jau matomas kalendoriuje.'),
      )
      if (id === 'new') {
        markClean()
        navigate(`${ADMIN}/renginiai/${saved.id}`, true)
      }
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        setErrors(e.fields)
        setTried(next)
        focusFirstError()
      }
      toast.error((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const remove = async () => {
    if (!event) return
    const ok = await confirm({
      title: 'Ištrinti renginį?',
      text: <>„{event.title}“ bus ištrintas visam laikui{isPublished ? ' ir dings iš kalendoriaus' : ''}.</>,
      confirm: 'Ištrinti', danger: true,
    })
    if (!ok) return
    setSaving('delete')
    try {
      await api.deleteEvent(event.id)
      markClean()
      toast.success('Renginys ištrintas.')
      navigate(`${ADMIN}/renginiai`)
    } catch (e) {
      toast.error((e as Error).message)
      setSaving(null)
    }
  }

  const added = (kind: LookupKind, item: Venue | Organizer) => {
    if (kind === 'venues') { setVenues(l => [...l, item as Venue].sort((a, b) => a.name.localeCompare(b.name, 'lt'))); set(['venueId'], String(item.id)) }
    else { setOrganizers(l => [...l, item as Organizer].sort((a, b) => a.name.localeCompare(b.name, 'lt'))); set(['organizerId'], String(item.id)) }
    setAdding(null)
  }

  if (loadError) return <><PageHeader kicker="Renginiai" title="Renginys" /><ErrorState message={loadError} onRetry={() => setAttempt(a => a + 1)} /></>
  if (id !== 'new' && !event) return <><PageHeader kicker="Renginiai" title="Kraunama…" /><Skeleton style={{ height: 400 }} /></>

  const siteHost = window.location.host
  const busy = saving !== null
  const err = shownErrors
  return (
    <>
      <PageHeader
        kicker={id === 'new' ? 'Naujas renginys' : 'Renginio redagavimas'}
        title={id === 'new' ? 'Naujas renginys' : 'Redaguoti'}
        actions={<a href={`${ADMIN}/renginiai`} className="adm-btn adm-btn--ghost">← Visi renginiai</a>}
      />
      <div className="adm-post">
        <div className="adm-stack" style={{ gap: 28 }}>
          <div className="adm-field">
            <label htmlFor="ev-title" className="adm-label"><span>Pavadinimas<span className="adm-req"> *</span></span><Counter length={form.title.trim().length} max={160} /></label>
            <input id="ev-title" className="adm-title-input" value={form.title} placeholder="Renginio pavadinimas" aria-invalid={!!err.title}
              onChange={e => set(['title'], e.target.value)} />
            {err.title && <p className="adm-error">{err.title}</p>}
          </div>

          <div className="adm-field">
            <label htmlFor="ev-slug" className="adm-label"><span>Adresas (nuoroda)</span></label>
            <div className="adm-slug">
              <span className="adm-slug__base">{siteHost}/kalendorius/</span>
              <input
                id="ev-slug" className="adm-input" value={effective.slug} placeholder="renginio-pavadinimas"
                aria-invalid={!!(err.slug || slugRemote)} aria-describedby="ev-slug-help"
                onChange={e => { setSlugAuto(false); set(['slug'], e.target.value.toLowerCase().replace(/\s+/g, '-')) }}
              />
            </div>
            {(err.slug || slugRemote) && <p className="adm-error">{err.slug || slugRemote}</p>}
            <p id="ev-slug-help" className="adm-help">
              {slugAuto ? 'Sukuriamas automatiškai iš pavadinimo. Galite pakeisti.' : 'Tik mažosios raidės be lietuviškų ženklų, skaičiai ir brūkšneliai.'}
              {!slugAuto && !isPublished && <> <button type="button" className="adm-link" onClick={() => setSlugAuto(true)}>Kurti iš pavadinimo</button></>}
            </p>
          </div>

          <div className="adm-field">
            <label htmlFor="ev-excerpt" className="adm-label"><span>Trumpas aprašas<span className="adm-req"> *</span></span><Counter length={form.excerpt.trim().length} max={300} recommended={160} /></label>
            <textarea id="ev-excerpt" className="adm-input" rows={3} value={form.excerpt} aria-invalid={!!err.excerpt}
              placeholder="1–2 sakiniai, kurie kviečia ateiti" onChange={e => set(['excerpt'], e.target.value)} />
            {err.excerpt && <p className="adm-error">{err.excerpt}</p>}
            <p className="adm-help">Rodomas kalendoriuje ir renginio puslapio viršuje, taip pat Google paieškoje (jei SEO aprašymas tuščias).</p>
          </div>

          <div className="adm-field" style={{ maxWidth: 280 }}>
            <label htmlFor="ev-type" className="adm-label"><span>Žyma</span></label>
            <select id="ev-type" className="adm-input" value={form.type} aria-invalid={!!err.type} onChange={e => set(['type'], e.target.value)}>
              {SCHEMA.options.eventTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {err.type && <p className="adm-error">{err.type}</p>}
            <p className="adm-help">Rodoma prie renginio kalendoriuje.</p>
          </div>

          <div className="adm-panel">
            <span className="adm-panel__title">Data ir laikas</span>
            <p className="adm-help" style={{ marginTop: -8 }}>Lietuvos laiku.</p>
            <label className="adm-check">
              <input type="checkbox" checked={form.allDay} onChange={e => set(['allDay'], e.target.checked)} />
              <span>Visos dienos renginys</span>
            </label>
            <div className="adm-grid2">
              <div className="adm-field">
                <label htmlFor="ev-start-date" className="adm-label"><span>Pradžios data<span className="adm-req"> *</span></span></label>
                <input id="ev-start-date" type="date" className="adm-input" value={form.startDate} aria-invalid={!!err.startDate} onChange={e => set(['startDate'], e.target.value)} />
                {err.startDate && <p className="adm-error">{err.startDate}</p>}
              </div>
              {!form.allDay && (
                <div className="adm-field">
                  <label htmlFor="ev-start-time" className="adm-label"><span>Pradžios laikas<span className="adm-req"> *</span></span></label>
                  <input id="ev-start-time" type="time" className="adm-input" value={form.startTime} aria-invalid={!!err.startTime} onChange={e => set(['startTime'], e.target.value)} />
                  {err.startTime && <p className="adm-error">{err.startTime}</p>}
                </div>
              )}
            </div>
            <div className="adm-grid2">
              <div className="adm-field">
                <label htmlFor="ev-end-date" className="adm-label"><span>Pabaigos data</span></label>
                <input id="ev-end-date" type="date" className="adm-input" value={form.endDate} min={form.startDate || undefined} aria-invalid={!!err.endDate} onChange={e => set(['endDate'], e.target.value)} />
                {err.endDate && <p className="adm-error">{err.endDate}</p>}
              </div>
              {!form.allDay && (
                <div className="adm-field">
                  <label htmlFor="ev-end-time" className="adm-label"><span>Pabaigos laikas</span></label>
                  <input id="ev-end-time" type="time" className="adm-input" value={form.endTime} aria-invalid={!!err.endTime} onChange={e => set(['endTime'], e.target.value)} />
                  {err.endTime && <p className="adm-error">{err.endTime}</p>}
                </div>
              )}
            </div>
            <p className="adm-help">Pabaiga nebūtina. Jei renginys trunka kelias dienas, nurodykite pabaigos datą: kalendoriuje jis bus pažymėtas „Kelių dienų“.</p>
          </div>

          <div className="adm-panel">
            <span className="adm-panel__title">Vieta, organizatorius, kaina</span>
            <div className="adm-field">
              <label htmlFor="ev-venue" className="adm-label"><span>Vieta</span></label>
              <div className="adm-pick">
                <select id="ev-venue" className="adm-input" value={form.venueId} aria-invalid={!!err.venueId} onChange={e => set(['venueId'], e.target.value)}>
                  <option value="">— Nepasirinkta —</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}{v.address ? ` — ${v.address}` : ''}</option>)}
                </select>
                <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setAdding('venues')}>+ Nauja vieta</button>
              </div>
              {err.venueId && <p className="adm-error">{err.venueId}</p>}
              <p className="adm-help">Vietos kuriamos skiltyje <a className="adm-link" href={`${ADMIN}/renginiai/vietos`} target="_blank" rel="noreferrer">Vietos</a> arba čia, mygtuku „Nauja vieta“.</p>
            </div>
            <label className="adm-check">
              <input type="checkbox" checked={form.showMap} onChange={e => set(['showMap'], e.target.checked)} />
              <span>Rodyti žemėlapyje</span>
            </label>
            {form.showMap && venue && !venue.address.trim() && <p className="adm-help" style={{ color: 'var(--danger)' }}>Pasirinktos vietos adresas nenurodytas, todėl žemėlapio nebus. Papildykite vietą skiltyje „Vietos“.</p>}

            <div className="adm-field">
              <label htmlFor="ev-organizer" className="adm-label"><span>Organizatorius</span></label>
              <div className="adm-pick">
                <select id="ev-organizer" className="adm-input" value={form.organizerId} onChange={e => set(['organizerId'], e.target.value)}>
                  <option value="">— Nepasirinktas —</option>
                  {organizers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setAdding('organizers')}>+ Naujas organizatorius</button>
              </div>
              <p className="adm-help">Organizatoriai kuriami skiltyje <a className="adm-link" href={`${ADMIN}/renginiai/organizatoriai`} target="_blank" rel="noreferrer">Organizatoriai</a> arba čia.</p>
            </div>

            <div className="adm-field" style={{ maxWidth: 240 }}>
              <label htmlFor="ev-price" className="adm-label"><span>Kaina (EUR)</span></label>
              <input id="ev-price" className="adm-input" inputMode="decimal" value={form.price} placeholder="pvz. 12 arba 12,50" aria-invalid={!!err.price} onChange={e => set(['price'], e.target.value)} />
              {err.price && <p className="adm-error">{err.price}</p>}
              <p className="adm-help">0 = nemokamas renginys. Palikus tuščią, kaina nerodoma.</p>
            </div>
          </div>

          <div className="adm-field">
            <span className="adm-label"><span>Tekstas</span></span>
            <RichEditor id="ev-body" variant="full" label="Renginio tekstas" value={form.bodyHtml} onChange={html => set(['bodyHtml'], html)} invalid={!!err.bodyHtml} />
            {err.bodyHtml && <p className="adm-error">{err.bodyHtml}</p>}
            <p className="adm-help">Plačiau apie renginį: programa, taisyklės, nuotraukos, vaizdo įrašai. Nuotraukas galite įtempti tiesiai į tekstą.</p>
          </div>
        </div>

        <aside className="adm-post__side">
          <div className="adm-panel">
            <span className="adm-panel__title">Publikavimas</span>
            <dl className="adm-meta">
              <dt>Būsena</dt><dd><span className={`adm-chip adm-chip--${event ? statusKey(event) : 'draft'}`}>{event ? statusLabel(event) : 'Juodraštis'}</span>{dirty && <span className="adm-badge" style={{ marginLeft: 8 }}>Neišsaugota</span>}</dd>
              {event?.publishedAt && <><dt>{isScheduled ? 'Pasirodys' : 'Paskelbta'}</dt><dd>{formatDateTime(event.publishedAt)}</dd></>}
              {event && <><dt>Atnaujinta</dt><dd>{formatDateTime(event.updatedAt)}</dd></>}
            </dl>
            <div className="adm-field">
              <label htmlFor="ev-date" className="adm-label"><span>Publikavimo data ir laikas</span></label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input id="ev-date" type="datetime-local" className="adm-input" value={form.publishedAt} aria-invalid={!!err.publishedAt}
                  onChange={e => set(['publishedAt'], e.target.value)} />
                {form.publishedAt && !isPublished && <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => set(['publishedAt'], '')}>Išvalyti</button>}
              </div>
              {err.publishedAt && <p className="adm-error">{err.publishedAt}</p>}
              <p className="adm-help">
                {willSchedule
                  ? <>Renginys kalendoriuje pasirodys automatiškai {dateLabel} (Lietuvos laiku). Tai ne renginio data, o kada jis atsiras svetainėje.</>
                  : chosenAt && !isPublished ? <>Renginys bus paskelbtas su data {dateLabel}.</>
                  : isPublished ? 'Kada renginys atsirado svetainėje. Ateities data jį paslėps iki tos dienos.'
                  : 'Kada renginys atsiras svetainėje. Palikus tuščią, jis bus paskelbtas iš karto, kai spausite „Publikuoti“.'}
              </p>
            </div>
            {isPublished ? (
              <>
                <button type="button" className="adm-btn adm-btn--block" disabled={busy || !dirty} onClick={() => save('published')}>
                  {saving === 'published' ? <><Spinner /> Skelbiama…</> : isScheduled && !willSchedule ? 'Publikuoti dabar' : 'Atnaujinti'}
                </button>
                {!isScheduled && <a className="adm-btn adm-btn--ghost adm-btn--block" href={`/kalendorius/${event!.slug}`} target="_blank" rel="noreferrer">Žiūrėti svetainėje ↗</a>}
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" disabled={busy} onClick={() => save('draft')}>
                  {saving === 'draft' ? <><Spinner /> Saugoma…</> : 'Grąžinti į juodraščius'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="adm-btn adm-btn--block" disabled={busy} onClick={() => save('published')}>
                  {saving === 'published' ? <><Spinner /> Skelbiama…</> : willSchedule ? 'Suplanuoti' : 'Publikuoti'}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" disabled={busy || (!dirty && !!event)} onClick={() => save('draft')}>
                  {saving === 'draft' ? <><Spinner /> Saugoma…</> : 'Išsaugoti juodraštį'}
                </button>
              </>
            )}
            <button type="button" className="adm-btn adm-btn--ghost adm-btn--block" onClick={() => setPreviewOpen(true)}>Peržiūra</button>
            {event && (
              <button type="button" className="adm-btn adm-btn--danger adm-btn--block" disabled={busy} onClick={remove}>
                {saving === 'delete' ? <><Spinner /> Trinama…</> : 'Ištrinti'}
              </button>
            )}
          </div>

          <div className="adm-panel">
            <ImageInput field={COVER_FIELD} value={form.cover} path={['cover']} errors={err} set={set} />
          </div>

          <div className="adm-panel">
            <span className="adm-panel__title">SEO</span>
            <p className="adm-help" style={{ marginTop: -8 }}>Nebūtina: tuščius laukus užpildome pavadinimu ir trumpu aprašu.</p>
            <div className="adm-field">
              <label htmlFor="ev-seo-title" className="adm-label"><span>SEO pavadinimas</span><Counter length={form.seoTitle.trim().length} max={70} recommended={60} /></label>
              <input id="ev-seo-title" className="adm-input" value={form.seoTitle} placeholder={form.title} aria-invalid={!!err.seoTitle} onChange={e => set(['seoTitle'], e.target.value)} />
              {err.seoTitle && <p className="adm-error">{err.seoTitle}</p>}
            </div>
            <div className="adm-field">
              <label htmlFor="ev-seo-desc" className="adm-label"><span>SEO aprašymas</span><Counter length={form.seoDescription.trim().length} max={160} recommended={155} /></label>
              <textarea id="ev-seo-desc" className="adm-input" rows={3} value={form.seoDescription} placeholder={form.excerpt} aria-invalid={!!err.seoDescription} onChange={e => set(['seoDescription'], e.target.value)} />
              {err.seoDescription && <p className="adm-error">{err.seoDescription}</p>}
            </div>
            <div className="adm-field">
              <label htmlFor="ev-seo-kw" className="adm-label"><span>Raktažodžiai</span></label>
              <input id="ev-seo-kw" className="adm-input" value={form.seoKeywords} placeholder="pvz. šokių varžybos, Kaunas" aria-invalid={!!err.seoKeywords} onChange={e => set(['seoKeywords'], e.target.value)} />
            </div>
            <SerpPreview title={`${form.seoTitle || form.title || 'Pavadinimas'} — Me Gusta`} description={form.seoDescription || form.excerpt} path={`/kalendorius/${effective.slug}`} />
          </div>
        </aside>
      </div>

      {previewOpen && (
        <Modal title="Peržiūra" size="full" onClose={() => setPreviewOpen(false)}>
          <div className="adm-preview" style={{ margin: -20 }}>
            <EventView preview event={{
              title: form.title || 'Be pavadinimo', excerpt: form.excerpt, cover: form.cover, bodyHtml: form.bodyHtml,
              type: form.type, typeLabel: SCHEMA.options.eventTypes.find(o => o.value === form.type)?.label ?? '',
              allDay: form.allDay, startDate: form.startDate, startTime: form.allDay ? null : form.startTime || null,
              endDate: form.endDate && form.endDate !== form.startDate ? form.endDate : null, endTime: form.allDay ? null : form.endTime || null,
              venue: venue ? { name: venue.name, address: venue.address } : null,
              organizer: organizer ? { name: organizer.name, website: organizer.website } : null,
              showMap: form.showMap && !!venue?.address.trim(), price: parsePrice(form.price),
            }} />
          </div>
        </Modal>
      )}
      {adding && <LookupModal kind={adding} onClose={() => setAdding(null)} onSaved={item => added(adding, item)} />}
    </>
  )
}

// --- venues and organizers ---------------------------------------------------------------------

const LOOKUP = {
  venues: {
    one: 'vieta', title: 'Vietos', newLabel: 'Nauja vieta', editTitle: 'Redaguoti vietą', newTitle: 'Nauja vieta',
    second: 'address' as const, secondLabel: 'Adresas', secondHelp: 'Gatvė, miestas. Pagal jį rodomas žemėlapis, pvz. Savanorių pr. 271, Kaunas.', secondMax: 200,
    lead: 'Vietos, kurias pasirenkate kurdami renginį. Žemėlapis renginio puslapyje rodomas pagal vietos adresą.',
    empty: 'Vietų dar nėra. Sukurkite pirmąją!', nameHelp: 'pvz. Me Gusta studija',
  },
  organizers: {
    one: 'organizatorius', title: 'Organizatoriai', newLabel: 'Naujas organizatorius', editTitle: 'Redaguoti organizatorių', newTitle: 'Naujas organizatorius',
    second: 'website' as const, secondLabel: 'Svetainė', secondHelp: 'Nebūtina. Jei įrašysite, organizatoriaus pavadinimas renginio puslapyje bus nuoroda.', secondMax: 300,
    lead: 'Renginių organizatoriai. Pasirenkami kurdami renginį.',
    empty: 'Organizatorių dar nėra. Sukurkite pirmąjį!', nameHelp: 'pvz. Me Gusta',
  },
}

/** Create or edit a venue / organizer in a dialog (used on the lists and inside the event form). */
function LookupModal<K extends LookupKind>({ kind, item, onClose, onSaved }: { kind: K; item?: LookupMap[K]; onClose: () => void; onSaved: (item: LookupMap[K]) => void }) {
  const api = useApi()
  const toast = useToast()
  const def = LOOKUP[kind]
  const [name, setName] = useState(item?.name ?? '')
  const [second, setSecond] = useState(item ? String((item as unknown as Record<string, unknown>)[def.second] ?? '') : '')
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const formId = `lookup-form-${kind}`

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!name.trim()) found.name = 'Įrašykite pavadinimą.'
    else if (name.trim().length > 120) found.name = `Ne daugiau kaip 120 ženklų (dabar ${name.trim().length}).`
    if (second.trim().length > def.secondMax) found[def.second] = `Ne daugiau kaip ${def.secondMax} ženklų (dabar ${second.trim().length}).`
    if (kind === 'organizers' && second.trim() && !/^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(second.trim())) found.website = 'Įrašykite pilną nuorodą, prasidedančią https://'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    const input: LookupInput = { name, [def.second]: second }
    try {
      const saved = item ? await api.updateLookup(kind, item.id, input) : await api.createLookup(kind, input)
      toast.success(item ? 'Pakeitimai išsaugoti.' : kind === 'venues' ? 'Vieta sukurta.' : 'Organizatorius sukurtas.')
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields)
      else toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={item ? def.editTitle : def.newTitle} onClose={onClose}
      footer={<>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>Atšaukti</button>
        <button type="submit" form={formId} className="adm-btn" disabled={saving}>{saving ? <><Spinner /> Saugoma…</> : 'Išsaugoti'}</button>
      </>}
    >
      <form id={formId} className="adm-stack" onSubmit={submit} noValidate>
        <div className="adm-field">
          <label htmlFor={`${formId}-name`} className="adm-label"><span>Pavadinimas<span className="adm-req"> *</span></span><Counter length={name.trim().length} max={120} /></label>
          <input id={`${formId}-name`} className="adm-input" value={name} autoFocus placeholder={def.nameHelp} aria-invalid={!!errors.name} onChange={e => setName(e.target.value)} />
          {errors.name && <p className="adm-error">{errors.name}</p>}
        </div>
        <div className="adm-field">
          <label htmlFor={`${formId}-second`} className="adm-label"><span>{def.secondLabel}</span><Counter length={second.trim().length} max={def.secondMax} /></label>
          <input id={`${formId}-second`} className="adm-input" value={second} type={kind === 'organizers' ? 'url' : 'text'} placeholder={kind === 'organizers' ? 'https://' : ''}
            aria-invalid={!!errors[def.second]} onChange={e => setSecond(e.target.value)} />
          {errors[def.second] && <p className="adm-error">{errors[def.second]}</p>}
          <p className="adm-help">{def.secondHelp}</p>
        </div>
      </form>
    </Modal>
  )
}

/** /apzvalga/renginiai/vietos and /apzvalga/renginiai/organizatoriai */
export function LookupAdmin({ kind }: { kind: LookupKind }) {
  const api = useApi()
  const toast = useToast()
  const confirm = useConfirm()
  const def = LOOKUP[kind]
  const [items, setItems] = useState<(Venue | Organizer)[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState<Venue | Organizer | 'new' | null>(null)
  const [usage, setUsage] = useState<{ list: string[]; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    api.lookups(kind).then(r => { if (!cancelled) setItems(r.items) }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [api, kind, attempt])

  const saved = (item: Venue | Organizer) => {
    setItems(list => {
      const rest = (list ?? []).filter(i => i.id !== item.id)
      return [...rest, item].sort((a, b) => a.name.localeCompare(b.name, 'lt'))
    })
    setEditing(null)
  }

  const remove = async (item: Venue | Organizer) => {
    const ok = await confirm({ title: `Ištrinti ${def.one === 'vieta' ? 'vietą' : 'organizatorių'}?`, text: <>„{item.name}“ bus ištrinta visam laikui.</>, confirm: 'Ištrinti', danger: true })
    if (!ok) return
    try {
      await api.deleteLookup(kind, item.id)
      setItems(list => (list ?? []).filter(i => i.id !== item.id))
      toast.success('Ištrinta.')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'in_use') setUsage({ list: (e.data.usage as string[]) ?? [], message: e.message })
      else toast.error((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        kicker="Renginiai" title={def.title} lead={def.lead}
        actions={<><a href={`${ADMIN}/renginiai`} className="adm-btn adm-btn--ghost">← Renginiai</a><button type="button" className="adm-btn" onClick={() => setEditing('new')}>+ {def.newLabel}</button></>}
      />
      {error ? <ErrorState message={error} onRetry={() => setAttempt(a => a + 1)} />
        : !items ? <div className="adm-lookup" aria-busy="true">{Array.from({ length: 3 }, (_, i) => <div key={i} className="adm-lookup__row"><Skeleton style={{ height: 40 }} /><span /><span /></div>)}</div>
        : items.length === 0 ? (
          <div className="adm-state">
            <p>{def.empty}</p>
            <button type="button" className="adm-btn adm-btn--small" onClick={() => setEditing('new')}>+ {def.newLabel}</button>
          </div>
        ) : (
          <div className="adm-lookup">
            {items.map(item => {
              const second = String((item as unknown as Record<string, unknown>)[def.second] ?? '')
              return (
                <div key={item.id} className="adm-lookup__row">
                  <div style={{ minWidth: 0 }}>
                    <button type="button" className="adm-table__title adm-lookup__name" onClick={() => setEditing(item)}>{item.name}</button>
                    <span className="adm-table__slug">{second || (kind === 'venues' ? 'Adresas nenurodytas' : 'Svetainė nenurodyta')}</span>
                  </div>
                  <span className="adm-table__date">{item.eventCount > 0 ? `Renginių: ${item.eventCount}` : 'Nenaudojama'}</span>
                  <div className="adm-table__actions">
                    <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setEditing(item)}>Redaguoti</button>
                    <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={`Ištrinti „${item.name}“`} title="Ištrinti" onClick={() => remove(item)}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      {editing && (
        <LookupModal
          kind={kind} item={editing === 'new' ? undefined : editing as LookupMap[typeof kind]}
          onClose={() => setEditing(null)} onSaved={item => saved(item as Venue | Organizer)}
        />
      )}
      {usage && (
        <Modal title="Negalima ištrinti" onClose={() => setUsage(null)} footer={<button type="button" className="adm-btn" onClick={() => setUsage(null)}>Supratau</button>}>
          <div className="adm-modal__text">
            {usage.message}
            <ul>{usage.list.map(u => <li key={u}>{u}</li>)}</ul>
          </div>
        </Modal>
      )}
    </>
  )
}
