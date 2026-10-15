import { useEffect } from 'react'
import { PATHS } from './router'
import { withSiteName } from './seo'

const display = "'Archivo', sans-serif"

export default function NotFound() {
  useEffect(() => {
    document.title = withSiteName('Puslapis nerastas')
  }, [])

  return (
    <section style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)', minHeight: '70vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
          ◆&nbsp;&nbsp;Klaida 404
        </p>
        <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(48px, 7vw, 100px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 24px' }}>
          Puslapis<br /><span style={{ color: 'var(--pink-text)' }}>nerastas</span>
        </h1>
        <p style={{ fontSize: 17, color: 'var(--c-b0b0b0)', lineHeight: 1.6, maxWidth: 520, fontWeight: 300, margin: '0 0 40px' }}>
          Šio puslapio nėra arba jis buvo perkeltas. Grįžkite į pradžią arba paskaitykite naujienas.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href={PATHS.home} className="nf-btn">Į pradžią →</a>
          <a href={PATHS.news} className="nf-btn nf-btn--ghost">Naujienos</a>
        </div>
      </div>
      <style>{`
        .nf-btn {
          background: #FFB3C6; color: #080808; border: 1px solid #FFB3C6; padding: 16px 40px; text-decoration: none;
          font-weight: 800; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; transition: background-color 0.2s, color 0.2s;
        }
        .nf-btn:hover { background: var(--btn-hover); }
        .nf-btn--ghost { background: transparent; color: var(--text); border-color: var(--line-strong); }
        .nf-btn--ghost:hover { background: transparent; color: var(--pink-text); border-color: #FFB3C6; }
      `}</style>
    </section>
  )
}
