import { useState } from 'react'

// Sample reviews until the Google reviews are connected.
const RATING = '4,9'
const COUNT = 127
const REVIEWS = [
  { tag: 'Tėvai · Gatvės šokiai', text: 'Dukra šoka jau trečius metus ir namo grįžta spindėdama. Treneriai moka rasti kiekvieno vaiko stipriąsias puses, o atmosfera salėje tikrai šeimyniška.', author: 'Rūta K.' },
  { tag: 'Mokinė · Lady Class', text: 'Atėjau į pirmą treniruotę be jokios patirties ir išėjau su šypsena. Po pusmečio jau šoku scenoje per studijos renginį. Labai rekomenduoju!', author: 'Gintarė M.' },
  { tag: 'Mokinys · Breikas', text: 'Čia išmokau daugiau nei tikėjausi: technika, disciplina ir komandos jausmas. Varžybos su studija tapo geriausiu mano metų prisiminimu.', author: 'Lukas P.' },
  { tag: 'Tėvai · Pop Dance', text: 'Sūnus anksčiau vengė būrelių, o čia pats primena, kada treniruotė. Draugiška, bet reikli komanda, aiškus tvarkaraštis ir geras bendravimas su tėvais.', author: 'Andrius V.' },
]

const Star = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#111111" aria-hidden="true"><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.6 5.8 21 7.2 14 2 9.3 8.9 8.6" /></svg>
)
const Arrow = ({ back }: { back?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? 'M19 12H5M11 6l-6 6 6 6' : 'M5 12h14M13 6l6 6-6 6'} />
  </svg>
)

export default function Reviews() {
  const [i, setI] = useState(0)
  const n = REVIEWS.length
  const r = REVIEWS[i]
  const pad = (v: number) => String(v).padStart(2, '0')
  return (
    <section id="atsiliepimai" className="ng-wrap ng-sec">
      <div className="ng-head">
        <span className="ng-kicker">Atsiliepimai</span>
        <h2 className="ng-h2">Ką sako mūsų šokėjai</h2>
      </div>
      <div className="rv">
        <div className="rv__score">
          <span className="rv__num">{RATING}</span>
          <span role="img" aria-label="Įvertinimas 4,9 iš 5" className="rv__stars">{[0, 1, 2, 3, 4].map(k => <Star key={k} />)}</span>
          <span className="rv__count">{COUNT} atsiliepimai Google</span>
          <a href="https://www.google.com/maps/search/?api=1&query=Me+Gusta+Kaunas" target="_blank" rel="noopener noreferrer" className="rv__link">Palikti atsiliepimą →</a>
        </div>
        <div className="rv__main">
          <div className="ng-stack">
            <span className="ng-tag">{r.tag}</span>
            <blockquote className="rv__quote" aria-live="polite">„{r.text}“</blockquote>
            <span className="rv__author">{r.author}</span>
          </div>
          <div className="rv__nav">
            <span className="rv__pos">{pad(i + 1)} / {pad(n)}</span>
            <div className="rv__btns">
              <button type="button" aria-label="Ankstesnis atsiliepimas" onClick={() => setI((i - 1 + n) % n)} className="rv__btn"><Arrow back /></button>
              <button type="button" aria-label="Kitas atsiliepimas" onClick={() => setI((i + 1) % n)} className="rv__btn rv__btn--dark"><Arrow /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
