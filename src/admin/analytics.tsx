import { useMemo, useState } from 'react'
import { PageHeader } from './ui'
import { MetaReport, SearchConsole } from './channels'
import { RegistrationStats, useRegistrations } from './registrations'

// Analitika: sample numbers in the shape Google Analytics 4 reports them, until GA4 is connected
// (Data API: sessions, users, views, engagement, sources, pages, devices, key events).

type Range = 7 | 30 | 90

// deterministic pseudo-random series, so the sample looks the same on every visit
export function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 16807) % 2147483647
    return (x - 1) / 2147483646
  }
}

function makeDays(n: number) {
  const rnd = seeded(20261111)
  const out: { date: Date; users: number }[] = []
  const today = new Date()
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dow = d.getDay()
    const weekly = dow === 0 ? 0.62 : dow === 6 ? 0.74 : dow === 1 ? 1.12 : 1
    const trend = 1 + (179 - i) / 600
    out.push({ date: d, users: Math.round((92 + rnd() * 38) * weekly * trend) })
  }
  return out.slice(-n)
}

const ALL = makeDays(180)

export const sampleVisits = () => {
  const week = ALL.slice(-7).reduce((s, d) => s + d.users, 0)
  const now = new Date()
  const month = ALL.filter(d => d.date.getMonth() === now.getMonth() && d.date.getFullYear() === now.getFullYear()).reduce((s, d) => s + d.users, 0)
  const prevWeek = ALL.slice(-14, -7).reduce((s, d) => s + d.users, 0)
  return { week, month, weekChange: Math.round(((week - prevWeek) / prevWeek) * 100) }
}

const nf = new Intl.NumberFormat('lt-LT')
export const fmt = (n: number) => nf.format(n)
export const pct = (n: number) => `${n > 0 ? '+' : ''}${n}%`

const PAGES = [
  { path: '/', title: 'Pagrindinis', share: 0.34 },
  { path: '/tvarkarastis', title: 'Tvarkaraščiai', share: 0.19 },
  { path: '/kainos', title: 'Kainos', share: 0.14 },
  { path: '/registracija', title: 'Registracija', share: 0.11 },
  { path: '/kalendorius', title: 'Kalendorius', share: 0.07 },
  { path: '/naujienos', title: 'Naujienos', share: 0.06 },
  { path: '/kontaktai', title: 'Kontaktai', share: 0.05 },
]
const SOURCES = [
  { name: 'Google paieška', share: 0.41 },
  { name: 'Facebook', share: 0.19 },
  { name: 'Instagram', share: 0.16 },
  { name: 'Tiesioginis', share: 0.14 },
  { name: 'TikTok', share: 0.06 },
  { name: 'Kitos svetainės', share: 0.04 },
]
const DEVICES = [
  { name: 'Telefonas', share: 0.72 },
  { name: 'Kompiuteris', share: 0.23 },
  { name: 'Planšetė', share: 0.05 },
]
const CITIES = [
  { name: 'Kaunas', share: 0.68 },
  { name: 'Vilnius', share: 0.09 },
  { name: 'Kauno r.', share: 0.08 },
  { name: 'Jonava', share: 0.03 },
  { name: 'Kiti', share: 0.12 },
]

const TABS = [
  { id: 'lankomumas', label: 'Lankomumas' },
  { id: 'paieska', label: 'Google paieška' },
  { id: 'meta', label: 'Facebook ir Instagram' },
  { id: 'registracijos', label: 'Registracijos' },
] as const
type Tab = (typeof TABS)[number]['id']

export function Analytics() {
  const [range, setRange] = useState<Range>(30)
  // the open tab lives in the address (#paieska), so a reload or a shared link keeps it
  const [tab, setTabState] = useState<Tab>(() => TABS.find(t => '#' + t.id === window.location.hash)?.id ?? 'lankomumas')
  const setTab = (t: Tab) => {
    setTabState(t)
    history.replaceState(history.state, '', t === 'lankomumas' ? window.location.pathname : '#' + t)
  }
  const regStore = useRegistrations()
  const days = useMemo(() => makeDays(range), [range])
  const prev = useMemo(() => makeDays(range * 2).slice(0, range), [range])
  const users = days.reduce((s, d) => s + d.users, 0)
  const prevUsers = prev.reduce((s, d) => s + d.users, 0)
  const change = (a: number, b: number) => Math.round(((a - b) / b) * 100)
  const views = Math.round(users * 2.6)
  const regs = Math.round(users * 0.018)
  const kpis = [
    { label: 'Lankytojai', value: fmt(users), delta: change(users, prevUsers), hint: 'Unikalūs žmonės' },
    { label: 'Peržiūros', value: fmt(views), delta: change(views, Math.round(prevUsers * 2.55)), hint: 'Atidaryti puslapiai' },
    { label: 'Įsitraukimas', value: '1 min 48 s', delta: 6, hint: 'Vid. laikas puslapyje' },
    { label: 'Registracijos', value: fmt(regs), delta: change(regs, Math.round(prevUsers * 0.016)), hint: `Konversija ${(regs / users * 100).toFixed(1).replace('.', ',')}%` },
  ]

  return (
    <>
      <PageHeader
        kicker="Svetainės lankomumas" title="Analitika"
        lead="Svetainės lankomumas, Google paieška, Facebook ir Instagram bei registracijos vienoje vietoje."
        actions={
          <div role="tablist" aria-label="Laikotarpis" className="an-range">
            {([7, 30, 90] as Range[]).map(r => (
              <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)}>{r} d.</button>
            ))}
          </div>
        }
      />
      <nav role="tablist" aria-label="Analitikos skiltys" className="an-tabs">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      {tab !== 'registracijos' && (
        <p className="adm-note" style={{ marginBottom: 24 }}><strong>Demonstraciniai duomenys.</strong> Skaičiai sugeneruoti: tikri atsiras prijungus {tab === 'lankomumas' ? 'Google Analytics 4' : tab === 'paieska' ? 'Google Search Console' : 'Meta (Facebook ir Instagram) paskyrą'}.</p>
      )}

      {tab === 'lankomumas' && <>
      <div className="an-kpis">
        {kpis.map(k => (
          <div key={k.label} className="an-kpi">
            <span className="an-kpi__label">{k.label}</span>
            <span className="an-kpi__value">{k.value}</span>
            <span className="an-kpi__foot">
              <span className={k.delta >= 0 ? 'an-up' : 'an-down'}>{k.delta >= 0 ? '▲' : '▼'} {pct(k.delta)}</span>
              <span>{k.hint}</span>
            </span>
          </div>
        ))}
      </div>

      <section className="an-card">
        <h2 className="an-title">Lankytojai per dieną</h2>
        <p className="an-sub">Paskutinės {range} d. · palyginimas su ankstesniu laikotarpiu: {pct(change(users, prevUsers))}</p>
        <LineChart days={days} />
      </section>

      <div className="an-grid">
        <section className="an-card">
          <h2 className="an-title">Populiariausi puslapiai</h2>
          <Bars rows={PAGES.map(p => ({ name: p.title, sub: p.path, value: Math.round(views * p.share) }))} />
        </section>
        <section className="an-card">
          <h2 className="an-title">Iš kur ateina lankytojai</h2>
          <Bars rows={SOURCES.map(s => ({ name: s.name, value: Math.round(users * s.share) }))} />
        </section>
        <section className="an-card">
          <h2 className="an-title">Įrenginiai</h2>
          <Bars rows={DEVICES.map(s => ({ name: s.name, value: Math.round(users * s.share) }))} percent />
        </section>
        <section className="an-card">
          <h2 className="an-title">Miestai</h2>
          <Bars rows={CITIES.map(s => ({ name: s.name, value: Math.round(users * s.share) }))} percent />
        </section>
      </div>

      <section className="an-card">
        <h2 className="an-title">Svarbūs veiksmai</h2>
        <div className="an-events">
          {[
            ['Registracijos formos pateikimai', regs],
            ['Paspaudimai ant telefono', Math.round(users * 0.024)],
            ['Paspaudimai ant el. pašto', Math.round(users * 0.009)],
            ['„Registruokis“ mygtuko paspaudimai', Math.round(users * 0.071)],
            ['Stilių video paleidimai', Math.round(users * 0.12)],
          ].map(([name, v]) => (
            <div key={name as string}><span>{name}</span><b>{fmt(v as number)}</b></div>
          ))}
        </div>
      </section>
      </>}

      {tab === 'paieska' && <SearchConsole range={range} />}
      {tab === 'meta' && <MetaReport range={range} />}
      {tab === 'registracijos' && <>
        <RegistrationStats store={regStore} range={range} />
        <p className="an-sub" style={{ marginTop: 8 }}>Registracijas tvarkykite skiltyje <a href="/apzvalga/registracijos" style={{ color: '#111', fontWeight: 700 }}>Registracijos →</a></p>
      </>}
    </>
  )
}

export function Bars({ rows, percent }: { rows: { name: string; sub?: string; value: number }[]; percent?: boolean }) {
  const max = Math.max(...rows.map(r => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <ul className="an-bars">
      {rows.map(r => (
        <li key={r.name} title={`${r.name}: ${fmt(r.value)}`}>
          <span className="an-bars__name">{r.name}{r.sub && <small>{r.sub}</small>}</span>
          <span className="an-bars__track"><span style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="an-bars__val">{percent ? `${Math.round((r.value / total) * 100)}%` : fmt(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}

export function LineChart({ days, unit = 'lankytojų', label = 'Lankytojai per dieną' }: { days: { date: Date; users: number }[]; unit?: string; label?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 1000, H = 260, P = { l: 44, r: 12, t: 12, b: 28 }
  const top = Math.max(...days.map(d => d.users), 1)
  const step = top > 500 ? 100 : top > 100 ? 50 : top > 20 ? 10 : 2
  const max = Math.ceil(top / step) * step
  const x = (i: number) => P.l + (i / Math.max(days.length - 1, 1)) * (W - P.l - P.r)
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b)
  const line = days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.users).toFixed(1)}`).join('')
  const area = `${line}L${x(days.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`
  const ticks = [0, max / 2, max]
  const labelEvery = Math.ceil(days.length / 6)
  const df = new Intl.DateTimeFormat('lt-LT', { month: 'short', day: 'numeric' })
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * (W - P.l - P.r)
    setHover(Math.max(0, Math.min(days.length - 1, Math.round((px / (W - P.l - P.r)) * (days.length - 1)))))
  }
  const h = hover !== null ? days[hover] : null
  return (
    <div className="an-line">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}, iš viso ${fmt(days.reduce((s, d) => s + d.users, 0))}`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#E6E3DB" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#6b6b6b">{t}</text>
          </g>
        ))}
        {days.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="#6b6b6b">{df.format(d.date)}</text>
        ))}
        <path d={area} fill="#F7B1D4" opacity="0.45" />
        <path d={line} fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#111" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.users)} r="5" fill="#fff" stroke="#111" strokeWidth="2" />
          </g>
        )}
        <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {h && hover !== null && (
        <div className="an-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <span>{df.format(h.date)}</span><b>{fmt(h.users)} {unit}</b>
        </div>
      )}
    </div>
  )
}

export function AnalyticsTile() {
  const v = sampleVisits()
  return (
    <a href="/apzvalga/analitika" className="adm-tile">
      <span className="adm-tile__title">Analitika</span>
      <div style={{ display: 'flex', gap: 28 }}>
        <div><div className="adm-stat">{fmt(v.week)}</div><p className="adm-tile__text">apsilankymai šią savaitę</p></div>
        <div><div className="adm-stat">{fmt(v.month)}</div><p className="adm-tile__text">šį mėnesį</p></div>
      </div>
      <span className="adm-tile__more">Visa analitika →</span>
    </a>
  )
}
