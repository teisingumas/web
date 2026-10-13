import { useState } from 'react'
import { DANCE_STYLES, SCHEDULE_DAYS } from './data'

const PINK = '#FFB3C6'
const display = "'Barlow Condensed', sans-serif"

// The schedule names styles as on the home page cards, so filter by those names.
const FILTERS = ['Visi', ...DANCE_STYLES.map(s => s.name)]

export default function Timetable() {
  const [filter, setFilter] = useState('Visi')

  const days = SCHEDULE_DAYS.map(d => ({
    ...d,
    classes: d.classes.filter(c => filter === 'Visi' || c.style === filter),
  }))

  return (
    <section id="tvarkarastis-pilnas" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
            ◆&nbsp;&nbsp;Kada šokam
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
            Tvarkaraštis
          </h1>
          <p style={{ marginTop: 20, fontSize: 16, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.6, fontWeight: 300 }}>
            Visa savaitės treniruočių programa vienoje vietoje. Pasirinkite stilių, kad matytumėte tik jo grupes.
          </p>
        </div>

        <div role="group" aria-label="Filtruoti pagal stilių" style={{ display: 'flex', gap: 4, marginBottom: 32, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              className="day-tab"
              onClick={() => setFilter(f)}
              style={{ padding: '12px 20px', fontFamily: display, fontWeight: 800, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              <span>{f}</span>
            </button>
          ))}
        </div>

        <div className="tt-week">
          {days.map(d => (
            <div key={d.day} style={{ border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{
                margin: 0, padding: '16px 20px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--line)',
                fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)',
              }}>
                {d.full}
              </h2>
              {d.classes.length === 0 ? (
                <p style={{ margin: 0, padding: '20px', fontSize: 14, color: 'var(--muted)' }}>Šią dieną pasirinkto stiliaus treniruočių nėra.</p>
              ) : d.classes.map((cls, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < d.classes.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    backgroundColor: i % 2 === 1 ? 'var(--zebra)' : 'transparent',
                    display: 'grid', gridTemplateColumns: '64px 1fr', columnGap: 12, rowGap: 6, alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: display, fontWeight: 800, fontSize: 22, color: 'var(--pink-text)', letterSpacing: 1 }}>
                    {cls.time.split(':')[0]}<span className="time-colon">:</span>{cls.time.split(':')[1]}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{cls.style}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{cls.duration}</span>
                  <span style={{
                    fontSize: 11, letterSpacing: 1.5, fontWeight: 600, color: 'var(--pink-text)', textTransform: 'uppercase',
                    padding: '8px 6.5px 8px 8px', lineHeight: 1, border: '1px solid color-mix(in srgb, var(--pink-text) 40%, transparent)', justifySelf: 'start',
                  }}>
                    {cls.age}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--c-9a9a9a)' }}>
            * Treniruotės vyksta Me Gusta salėje, Savanorių pr. 271, Kaunas.
          </p>
          <a
            href="/registracija"
            style={{
              backgroundColor: PINK, color: '#080808', textDecoration: 'none',
              padding: '14px 32px', fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--btn-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = PINK }}
          >
            Registruotis →
          </a>
        </div>
      </div>

      <style>{`
        .tt-week { display: grid; grid-template-columns: repeat(${SCHEDULE_DAYS.length}, 1fr); gap: 16px; align-items: start; }
        .day-tab[aria-pressed="true"] { color: #080808; border-color: ${PINK}; }
        .day-tab[aria-pressed="true"]::before { transform: scaleX(1); }
        @media (max-width: 1024px) { .tt-week { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) { .tt-week { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}
