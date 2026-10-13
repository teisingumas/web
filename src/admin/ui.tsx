import type React from 'react'

export function PageHeader({ kicker, title, lead, actions }: { kicker: string; title: string; lead?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="adm-head">
      <div style={{ minWidth: 0 }}>
        <p className="adm-kicker">◆&nbsp;&nbsp;{kicker}</p>
        <h1 className="adm-h1">{title}</h1>
        {lead && <p className="adm-lead">{lead}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{actions}</div>}
    </header>
  )
}

export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div className="adm-skel" aria-hidden="true" style={{ height: 16, ...style }} />
}

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="adm-stack" aria-busy="true" aria-label="Kraunama">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} style={{ height: 76 }} />)}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="adm-state adm-state--error" role="alert">
      <p>Nepavyko įkelti duomenų.</p>
      <p>{message}</p>
      {onRetry && <button type="button" className="adm-btn adm-btn--small" onClick={onRetry}>Bandyti dar kartą</button>}
    </div>
  )
}

export function Spinner() {
  return <span className="adm-spinner" aria-hidden="true" />
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; label: string
}) {
  return (
    <div className="adm-tabs" role="tablist" aria-label={label}>
      {tabs.map(t => (
        <button key={t.id} type="button" role="tab" className="adm-tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="adm-tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

const timeFormat = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vilnius' })
const clockFormat = new Intl.DateTimeFormat('lt-LT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vilnius' })

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : timeFormat.format(d)
}

/** "šiandien 14:32" / "2026-10-12 09:10" */
export function formatSaved(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? `šiandien ${clockFormat.format(d)}` : timeFormat.format(d)
}

export const Icons = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3z" /><path d="M9 21v-6h6v6" /></svg>,
  page: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  form: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  news: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5" /></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
}
