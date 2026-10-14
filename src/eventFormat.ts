import type { EventCard } from './content/types'

// Dates and times of events. Both are Lithuanian wall-clock values ("2026-10-18", "18:00"), so they
// are never converted between time zones; only "today" depends on the clock (Lithuanian time).

const TZ = 'Europe/Vilnius'
export const MONTHS_SHORT = ['Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp', 'Rgs', 'Spa', 'Lap', 'Grd']
export const MONTH_NAMES = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis']
export const WEEKDAYS = ['Sekmadienis', 'Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis']

const todayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const longDateFormat = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** Today's date in Lithuania, "YYYY-MM-DD". */
export function todayVilnius() {
  return todayFormat.format(new Date())
}

const utcDate = (ymd: string) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)))

export const dayOf = (ymd: string) => ymd.slice(8, 10)
export const yearOf = (ymd: string) => ymd.slice(0, 4)
export const monthShort = (ymd: string) => MONTHS_SHORT[+ymd.slice(5, 7) - 1]
export const weekdayOf = (ymd: string) => WEEKDAYS[utcDate(ymd).getUTCDay()]
export const monthKey = (ymd: string) => ymd.slice(0, 7)
export const monthLabel = (key: string) => `${MONTH_NAMES[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`
/** "2026 m. spalio 18 d." */
export const longDate = (ymd: string) => longDateFormat.format(utcDate(ymd))

/** The last day an event takes up. */
export const lastDay = (e: Pick<EventCard, 'startDate' | 'endDate'>) => e.endDate || e.startDate
export const isMultiDay = (e: Pick<EventCard, 'startDate' | 'endDate'>) => !!e.endDate && e.endDate !== e.startDate
export const isPast = (e: Pick<EventCard, 'startDate' | 'endDate'>, today = todayVilnius()) => lastDay(e) < today
export const isOngoing = (e: Pick<EventCard, 'startDate' | 'endDate'>, today = todayVilnius()) => e.startDate <= today && lastDay(e) >= today

/** Every month an event touches ("2026-10", "2026-11" …): a long event is listed under each. */
export function monthsOf(e: Pick<EventCard, 'startDate' | 'endDate'>): string[] {
  const out: string[] = []
  let y = +e.startDate.slice(0, 4)
  let m = +e.startDate.slice(5, 7)
  const end = lastDay(e)
  const ey = +end.slice(0, 4)
  const em = +end.slice(5, 7)
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

/** Short time text for lists: "Visą dieną", "12:00 – 16:00", "09:00", "nuo 10:00" (several days) or "". */
type When = Pick<EventCard, 'allDay' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>

export function timeText(e: When) {
  if (e.allDay) return 'Visą dieną'
  if (!e.startTime) return ''
  if (isMultiDay(e)) return `nuo ${e.startTime}`
  return e.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime
}

/** When an event happens, in full: "2026 m. spalio 18 d., 12:00 – 16:00" or "2026 m. spalio 18 d. – 2026 m. gruodžio 1 d.". */
export function whenText(e: When) {
  const from = longDate(e.startDate)
  if (isMultiDay(e)) {
    const to = longDate(e.endDate!)
    return e.allDay ? `${from} – ${to}` : `${from}${e.startTime ? ` ${e.startTime}` : ''} – ${to}${e.endTime ? ` ${e.endTime}` : ''}`
  }
  if (e.allDay) return `${from}, visą dieną`
  const time = e.startTime ? (e.endTime ? `${e.startTime} – ${e.endTime}` : e.startTime) : ''
  return time ? `${from}, ${time}` : from
}

/** "Nemokama", "12 €", "12,50 €". */
export function priceText(price: number | null) {
  if (price === null) return ''
  if (price === 0) return 'Nemokama'
  return `${Number.isInteger(price) ? price : price.toFixed(2).replace('.', ',')} €`
}

/** What to search for on the map: the venue's name and address. */
export const mapQuery = (venue: NonNullable<EventCard['venue']>) => [venue.name, venue.address].filter(Boolean).join(', ')
export const mapEmbedUrl = (venue: NonNullable<EventCard['venue']>) => `https://www.google.com/maps?q=${encodeURIComponent(mapQuery(venue))}&output=embed&hl=lt`
export const mapLinkUrl = (venue: NonNullable<EventCard['venue']>) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery(venue))}`
