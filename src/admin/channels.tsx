import { useMemo } from 'react'
import { Bars, LineChart, fmt, pct, seeded } from './analytics'

// Sample Google Search Console and Meta (Facebook + Instagram) reports, in the shape their APIs
// return them, until the accounts are connected. Same range switch as the GA4 part above.

function series(seed: number, n: number, base: number, spread: number, weekend: number) {
  const rnd = seeded(seed)
  const today = new Date()
  const out: { date: Date; users: number }[] = []
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dow = d.getDay()
    const w = dow === 0 || dow === 6 ? weekend : 1
    const v = Math.round((base + rnd() * spread) * w * (1 + (179 - i) / 700))
    out.push({ date: d, users: v })
  }
  return out.slice(-n)
}
const sum = (a: { users: number }[]) => a.reduce((s, d) => s + d.users, 0)
const change = (a: number, b: number) => Math.round(((a - b) / Math.max(b, 1)) * 100)

function Kpis({ items }: { items: { label: string; value: string; delta: number; hint: string; invert?: boolean }[] }) {
  return (
    <div className="an-kpis an-kpis--in">
      {items.map(k => {
        const good = k.invert ? k.delta <= 0 : k.delta >= 0
        return (
          <div key={k.label} className="an-kpi an-kpi--soft">
            <span className="an-kpi__label">{k.label}</span>
            <span className="an-kpi__value">{k.value}</span>
            <span className="an-kpi__foot">
              <span className={good ? 'an-up' : 'an-down'}>{k.delta >= 0 ? '▲' : '▼'} {pct(k.delta)}</span>
              <span>{k.hint}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

const QUERIES = [
  ['šokių studija kaunas', 0.19, 2.1],
  ['me gusta kaunas', 0.14, 1.0],
  ['hip hop šokiai kaunas', 0.11, 3.4],
  ['šokiai vaikams kaunas', 0.1, 4.8],
  ['breikas kaunas', 0.07, 2.6],
  ['gatvės šokiai', 0.06, 7.9],
  ['lady class kaunas', 0.05, 3.1],
  ['šokių būreliai šilainiai', 0.04, 5.6],
  ['šokių stovykla vasarai kaunas', 0.03, 8.4],
] as const

export function SearchConsole({ range }: { range: number }) {
  const clicks = useMemo(() => series(4401, range, 38, 22, 0.8), [range])
  const prev = useMemo(() => series(4401, range * 2, 38, 22, 0.8).slice(0, range), [range])
  const c = sum(clicks), pc = sum(prev)
  const impr = Math.round(c * 21.4), pimpr = Math.round(pc * 21.9)
  return (
    <section className="an-card" id="paieska">
      <div className="an-head">
        <span className="an-logo an-logo--gsc" aria-hidden="true">G</span>
        <div>
          <h2 className="an-title">Google paieška</h2>
          <p className="an-sub">Search Console: kaip svetainė rodoma ir spaudžiama Google paieškoje · {range} d.</p>
        </div>
      </div>
      <Kpis items={[
        { label: 'Paspaudimai', value: fmt(c), delta: change(c, pc), hint: 'iš paieškos' },
        { label: 'Parodymai', value: fmt(impr), delta: change(impr, pimpr), hint: 'kiek kartų matė' },
        { label: 'CTR', value: `${((c / impr) * 100).toFixed(1).replace('.', ',')}%`, delta: 3, hint: 'paspaudė iš matančių' },
        { label: 'Vid. pozicija', value: '6,2', delta: -8, hint: 'mažiau = geriau', invert: true },
      ]} />
      <LineChart days={clicks} unit="paspaudimų" label="Paspaudimai iš Google per dieną" />
      <table className="an-table">
        <thead><tr><th>Paieškos frazė</th><th>Paspaudimai</th><th>Parodymai</th><th>CTR</th><th>Pozicija</th></tr></thead>
        <tbody>
          {QUERIES.map(([q, share, pos]) => {
            const cl = Math.round(c * share)
            const im = Math.round(cl * (10 + pos * 6))
            return (
              <tr key={q}>
                <td>{q}</td><td>{fmt(cl)}</td><td>{fmt(im)}</td>
                <td>{((cl / im) * 100).toFixed(1).replace('.', ',')}%</td>
                <td><span className={`an-pos${pos <= 3 ? ' an-pos--top' : ''}`}>{pos.toFixed(1).replace('.', ',')}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

const CAMPAIGNS = [
  { name: 'Rudens registracija · vaikai 6–12 m.', spend: 0.42, cpl: 3.9 },
  { name: 'Lady Class · moterys 18–35 m.', spend: 0.27, cpl: 5.2 },
  { name: 'Breikas · pirmoji treniruotė nemokama', spend: 0.19, cpl: 4.4 },
  { name: 'Stovyklos priminimas (retargetingas)', spend: 0.12, cpl: 2.8 },
]
const POSTS = [
  { title: 'Reels: pasirodymas „Kauno dienose“', net: 'Instagram', reach: 0.31, eng: 9.4 },
  { title: 'Naujas tvarkaraštis nuo rugsėjo', net: 'Facebook', reach: 0.18, eng: 4.1 },
  { title: 'Treneriai: susipažinkime', net: 'Instagram', reach: 0.14, eng: 6.8 },
  { title: 'Kalėdinis koncertas: bilietai', net: 'Facebook', reach: 0.11, eng: 3.6 },
]

export function MetaReport({ range }: { range: number }) {
  const reach = useMemo(() => series(7702, range, 820, 520, 1.25), [range])
  const prev = useMemo(() => series(7702, range * 2, 820, 520, 1.25).slice(0, range), [range])
  const r = sum(reach), pr = sum(prev)
  const spend = Math.round(range * 6.4)
  const leads = CAMPAIGNS.reduce((s, cp) => s + Math.round((spend * cp.spend) / cp.cpl), 0)
  return (
    <section className="an-card" id="meta">
      <div className="an-head">
        <span className="an-logo an-logo--meta" aria-hidden="true">∞</span>
        <div>
          <h2 className="an-title">Facebook ir Instagram</h2>
          <p className="an-sub">Meta Business Suite ir reklamos ataskaita · {range} d.</p>
        </div>
      </div>
      <Kpis items={[
        { label: 'Pasiekimas', value: fmt(r), delta: change(r, pr), hint: 'žmonės, matę įrašus' },
        { label: 'Nauji sekėjai', value: fmt(Math.round(range * 4.3)), delta: 12, hint: 'FB + IG' },
        { label: 'Reklamai išleista', value: `${fmt(spend)} €`, delta: 0, hint: `${CAMPAIGNS.length} kampanijos` },
        { label: 'Užklausos iš reklamų', value: fmt(leads), delta: 9, hint: `${(spend / leads).toFixed(2).replace('.', ',')} € už vieną` },
      ]} />
      <LineChart days={reach} unit="žmonių pasiekta" label="Pasiekimas per dieną" />
      <div className="an-grid an-grid--in">
        <div>
          <h3 className="an-h3">Reklamos kampanijos</h3>
          <table className="an-table">
            <thead><tr><th>Kampanija</th><th>Išleista</th><th>Užklausos</th><th>€ / užkl.</th></tr></thead>
            <tbody>
              {CAMPAIGNS.map(cp => {
                const s = Math.round(spend * cp.spend)
                return <tr key={cp.name}><td>{cp.name}</td><td>{fmt(s)} €</td><td>{fmt(Math.round(s / cp.cpl))}</td><td>{cp.cpl.toFixed(2).replace('.', ',')}</td></tr>
              })}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="an-h3">Geriausi įrašai</h3>
          <Bars rows={POSTS.map(p => ({ name: p.title, sub: `${p.net} · įsitraukimas ${p.eng.toFixed(1).replace('.', ',')}%`, value: Math.round(r * p.reach) }))} />
          <h3 className="an-h3" style={{ marginTop: 24 }}>Sekėjai</h3>
          <Bars rows={[{ name: 'Instagram', value: 3842 }, { name: 'Facebook', value: 2917 }, { name: 'TikTok', value: 1265 }]} />
        </div>
      </div>
    </section>
  )
}
