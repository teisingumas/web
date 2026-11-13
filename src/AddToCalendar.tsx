import { useEffect, useRef, useState } from 'react'
import type { EventDetail } from './content/types'

type Ev = Pick<EventDetail, 'slug' | 'title' | 'excerpt' | 'allDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'venue'>

const pad = (n: number) => String(n).padStart(2, '0')
const compact = (ymd: string) => ymd.replace(/-/g, '')
function nextDay(ymd: string) {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10) + 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}
/** "+02:00" / "+03:00": Lithuania's offset from UTC on that date and time. */
function vilniusOffset(ymd: string, hm: string) {
  const at = new Date(`${ymd}T${hm}:00Z`)
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Vilnius', timeZoneName: 'longOffset' }).formatToParts(at).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+02:00'
  const m = /GMT([+-]\d{2}):?(\d{2})?/.exec(name)
  return m ? `${m[1]}:${m[2] ?? '00'}` : '+02:00'
}
function addHours(ymd: string, hm: string, hours: number): [string, string] {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10), +hm.slice(0, 2) + hours, +hm.slice(3, 5)))
  return [`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`]
}

/** Start and end as Lithuanian dates and times; no start time = an all-day event, no end = two hours. */
function span(e: Ev) {
  const last = e.endDate || e.startDate!
  if (e.allDay || !e.startTime) return { allDay: true as const, start: e.startDate!, end: nextDay(last) }
  let end: [string, string] = e.endTime ? [last, e.endTime] : addHours(e.startDate!, e.startTime, 2)
  if (`${end[0]}T${end[1]}` <= `${e.startDate}T${e.startTime}`) end = addHours(e.startDate!, e.startTime, 2)
  return { allDay: false as const, start: e.startDate!, startTime: e.startTime, end: end[0], endTime: end[1] }
}

// "Pridėti į kalendorių": Apple Calendar and other apps take the .ics file; Google and Outlook get a
// pre-filled page of their own (Android phones use Google Calendar).
export default function AddToCalendar({ event: e }: { event: Ev }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (ev: MouseEvent) => { if (!ref.current?.contains(ev.target as Node)) setOpen(false) }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  if (!e.startDate) return null

  const s = span(e)
  const url = `${window.location.origin}/kalendorius/${e.slug}`
  const place = [e.venue?.name, e.venue?.address].filter(Boolean).join(', ')
  const details = [e.excerpt, url].filter(Boolean).join('\n\n')
  const ics = `/api/public/events/${e.slug}.ics`
  const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: e.title, details, location: place, ctz: 'Europe/Vilnius',
    dates: s.allDay ? `${compact(s.start)}/${compact(s.end)}` : `${compact(s.start)}T${s.startTime.replace(':', '')}00/${compact(s.end)}T${s.endTime.replace(':', '')}00`,
  }).toString()
  const outlook = 'https://outlook.live.com/calendar/0/action/compose?' + new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: e.title, body: details, location: place,
    ...(s.allDay
      ? { startdt: s.start, enddt: s.end, allday: 'true' }
      : { startdt: `${s.start}T${s.startTime}:00${vilniusOffset(s.start, s.startTime)}`, enddt: `${s.end}T${s.endTime}:00${vilniusOffset(s.end, s.endTime)}` }),
  }).toString()

  const items = [
    { label: 'Apple kalendorius', sub: 'iPhone, iPad, Mac', href: ics, external: false },
    { label: 'Google kalendorius', sub: 'Android, Gmail', href: google, external: true },
    { label: 'Outlook', sub: 'Outlook.com, Hotmail', href: outlook, external: true },
    { label: 'Kitas kalendorius', sub: 'Atsisiųsti .ics failą', href: ics, external: false, download: `${e.slug}.ics` },
  ]
  return (
    <div className="atc" ref={ref}>
      <button type="button" className="atc__btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>
        Pridėti į kalendorių
      </button>
      {open && (
        <div className="atc__menu" role="menu" aria-label="Pridėti į kalendorių">
          {items.map(i => (
            <a key={i.label} role="menuitem" className="atc__item" href={i.href} onClick={() => setOpen(false)}
              {...(i.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...(i.download ? { download: i.download } : {})}>
              <span>{i.label}</span><small>{i.sub}</small>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
