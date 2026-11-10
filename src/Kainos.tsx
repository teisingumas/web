import { section } from './content'
import Pricing from './Pricing'
import Faq from './Faq'

// /kainos: the plans from the home page, the notes marked with * and the D.U.K.
export default function Kainos() {
  const pricing = section('pricing')
  const notes = section('pricing.notes').items
  const faq = section('pricing.faq')
  return (
    <section id="kainos-puslapis" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div className="ng-head">
          <span className="ng-kicker">{pricing.kicker}</span>
          <h1 className="ng-h2" style={{ fontSize: 'clamp(48px, 6vw, 88px)' }}>{pricing.title}</h1>
        </div>
        <Pricing header={false} marks />
        {notes.length > 0 && (
          <ul className="kn-notes">
            {notes.map((n, i) => <li key={i}><span aria-hidden="true">*</span>{n.text}</li>)}
          </ul>
        )}
        {faq.groups.length > 0 && (
          <div className="kn-faq">
            <Faq groups={faq.groups} idPrefix="kn" />
          </div>
        )}
      </div>
    </section>
  )
}
