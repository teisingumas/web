import { useEffect, useState } from 'react'
import type React from 'react'
import { TIMETABLE_TABS, type SlotStatus } from './data'

const PINK = '#FFB3C6'
const display = "'Barlow Condensed', sans-serif"

const STATUS_CLASS: Record<SlotStatus, string> = {
  'Renkama grupė': 'open',
  'Uždara grupė': 'closed',
  'Laisvas laikas': 'free',
}

// "17:00" with the same blinking colon as the home page timetable.
function Clock({ time }: { time: string }) {
  const [h, m] = time.split(':')
  return <>{h}<span className="time-colon">:</span>{m}</>
}

export default function Timetable() {
  const [tabId, setTabId] = useState(TIMETABLE_TABS[0].id)
  const days = TIMETABLE_TABS.find(t => t.id === tabId)!.days

  // Times mounted on a tab switch would start their own blink cycle; keep all colons in step.
  useEffect(() => {
    document.getAnimations().forEach(a => {
      if ((a as CSSAnimation).animationName === 'colonBlink') a.startTime = 0
    })
  }, [tabId])

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
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', letterSpacing: 0.5 }}>
                Galioja nuo: <strong style={{ color: 'var(--text)', fontWeight: 600 }}>2026.09.02</strong>
              </p>
              <p style={{ margin: '6px 0 0', fontFamily: display, fontWeight: 800, fontSize: 24, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--pink-text)' }}>
                Me Gusta 2026/2027 sezonas
              </p>
            </div>
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
              Registracija
            </a>
          </div>
        </div>

        <div role="tablist" aria-label="Tvarkaraščiai" className="tt-tabs">
          {TIMETABLE_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tabId === t.id}
              className="day-tab"
              onClick={() => setTabId(t.id)}
              style={{ padding: '14px 12px', fontFamily: display, fontWeight: 800, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {days.length === 0 && (
          <p style={{ margin: 0, padding: '32px 24px', border: '1px solid var(--line)', fontSize: 15, color: 'var(--text-2)' }}>
            Šios salės tvarkaraštis netrukus bus paskelbtas.
          </p>
        )}

        <div className="tt-week" style={{ '--tt-cols': Math.max(days.length, 1) } as React.CSSProperties}>
          {days.map(d => (
            <div key={d.full} style={{ border: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{
                margin: 0, padding: '16px 20px', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--line)',
                fontFamily: display, fontWeight: 800, fontSize: 20, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)',
              }}>
                {d.full}
              </h2>
              {d.slots.length === 0 ? (
                <p style={{ margin: 0, padding: '20px', fontSize: 14, color: 'var(--muted)' }}>Šią dieną treniruočių nėra.</p>
              ) : d.slots.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < d.slots.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    // every second row slightly lighter for easier reading down the day
                    backgroundColor: i % 2 === 1 ? 'var(--zebra)' : 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  }}
                >
                  <span className={`tt-status tt-status--${STATUS_CLASS[slot.status]}`}>{slot.status}</span>
                  <span style={{ fontFamily: display, fontWeight: 800, fontSize: 22, color: 'var(--pink-text)', letterSpacing: 1, marginTop: 4 }}>
                    <Clock time={slot.start} />&nbsp;–&nbsp;<Clock time={slot.end} />
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', lineHeight: 1.35 }}>{slot.group}</span>
                  {/* an empty trainer line keeps every slot the same height, so the day columns line up */}
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }} aria-hidden={!slot.trainer || undefined}>{slot.trainer ?? '\u00a0'}</span>
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
        /* All four tabs share one row; on phones they fold into two columns. */
        .tt-tabs { display: grid; grid-template-columns: repeat(${TIMETABLE_TABS.length}, 1fr); gap: 4px; margin-bottom: 32px; }
        .tt-week { display: grid; grid-template-columns: repeat(var(--tt-cols), 1fr); gap: 16px; align-items: start; }
        /* Slot status: open groups in pink, closed ones muted, free hall time dashed. */
        .tt-status {
          font-size: 11px; letter-spacing: 1.5px; font-weight: 600; text-transform: uppercase; line-height: 1;
          padding: 7px 6.5px 7px 8px; border: 1px solid;
        }
        .tt-status--open { color: var(--pink-text); border-color: color-mix(in srgb, var(--pink-text) 40%, transparent); }
        .tt-status--closed { color: var(--muted); border-color: var(--line-strong); }
        .tt-status--free { color: var(--text-2); border-style: dashed; border-color: var(--line-strong); }
        @media (max-width: 1024px) { .tt-week { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 640px) {
          .tt-week { grid-template-columns: 1fr; }
          .tt-tabs { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </section>
  )
}
