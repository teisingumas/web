import { useState } from 'react'
import type { ReactNode } from 'react'
import { section } from './content'
import { PATHS } from './router'

// /gatves-sokiai: what the street dance classes are, the beginners' timetable, the trainers and
// the four styles taught (Hip Hop, Locking, Popping, House).

const VIDEO_ID = 'D0S42GzNWB4'

const FACTS = [
  { num: '45–60', unit: 'min.', label: 'Treniruotės trukmė' },
  { num: '~300', unit: 'kcal', label: 'Sudeginamos kalorijos' },
  { num: '4–99', unit: 'm.', label: 'Amžiaus grupė' },
  { num: 'nuo 2', unit: '', label: 'Pamokos per savaitę' },
]

const CLASSES = [
  { age: '4–5 m.', days: 'I ir III', time: '17:30', duration: '45 min', trainer: 'Paulina' },
  { age: '6–7 m.', days: 'I ir III', time: '18:30', duration: '45 min', trainer: 'Paulina' },
  { age: '8–11 m.', days: 'I ir III', time: '18:00', duration: '', trainer: 'Rytis' },
  { age: '12–15 m.', days: 'I ir III', time: '17:00', duration: '', trainer: 'Rytis' },
  { age: 'Nuo 18 m.', days: 'II ir IV', time: '19:00', duration: '', trainer: 'Greta' },
]

const MORE_VIDEOS = ['JEDBMjsWQYc', 'NcmZ6EOsM-8', 'PhfmoMgc2DE']

const TRAINER_NAMES = ['Rytis', 'Greta', 'Paulina']

type DanceStyle = {
  name: string
  intro: ReactNode
  principle: ReactNode
  music: ReactNode
  movesTitle: string
  moves: string[]
  more: string
  moreHref: string
  video: string
}

const STYLES: DanceStyle[] = [
  {
    name: 'Hip-Hop',
    intro: (
      <>
        <p>Vėlyvieji 60-ieji tapo Hip Hop pradžia. Afroamerikiečių susibūrimuose, vakarėliuose bei pasirodymuose šokėjai ėmė apjungti išpopuliarėjusius Lock B-Boying ir Boogaloo (popping) stilius į bendrus šokio junginius. Judesių mišinys ilgainiui negalėjo būti priskirtas vienam iš jau esamų stilių, todėl buvo pavadintas savu pavadinimu – Hip Hop. Tokį pavadinimą visam kultūriniam judėjimui pasiūlė to laikmečio žymus DJ Afrika Bambaataa.</p>
        <p>Hip Hop‘ui iškilus į didžiąsias koncertų ir televizijos scenas, visas pasaulis sužinojo apie šį judėjimą. Hip Hop kultūra Lietuvą pasiekė apie 1990 metus.</p>
      </>
    ),
    principle: (
      <>
        <p>Hip Hop šokis turi du pagrindinius judėjimo principus (groove), kurie yra neatsiejami nuo šio stiliaus. Pirmasis ir, tikriausiai, svarbiausias – bounce. Minkšti kelių ir krūtinės judesiai suteikia laisvumo šokėjams. Antrasis Hip Hop groove‘as yra rock (rocking). Krūtinės judesiai į priekį bei atgal.</p>
        <p>Kiekvienas Hip Hop šokėjas savo pasirodymą tiek anksčiau, tiek dabar pradeda būtent nuo šių judėjimų. Šio stiliaus šokio pasirodymuose galima pastebėti daug House, Popping, Locking ar breiko stiliaus elementų.</p>
      </>
    ),
    music: <p>Hip Hop stilius šokamas pagal Hip Hop arba kitaip rap’o muziką.</p>,
    movesTitle: 'Populiariausi Hip-Hop judesiai',
    moves: ['Bounce', 'Rock', 'Running Man', 'Dougie', 'Prep', 'The Smurf', 'Jerk', 'Criss Cross', 'Bart Simpson', 'Roger Rabbit'],
    more: 'Daugiau Hip Hop istorijos',
    moreHref: 'https://megusta.lt/apie-hip-hop-sokiu-stiliu/',
    video: 'KTOfqqV7eEQ',
  },
  {
    name: 'Locking',
    intro: (
      <p>Tai funk šokio stilius, kurio judėjimas prasideda dar ankstyvais 70’aisiais Jungtinėse Amerikos Valstijose. Locking pavadinimas kilo iš pagrindinio šio stiliaus judėjimo elemento – lock (en. užrakinti/užfiksuoti). Šis judesys dar apie 1960 metus gimė šokėjui Don Campbell.</p>
    ),
    principle: (
      <>
        <p>Šio stiliaus ypatumas yra aiškūs ir greiti rankų bei plaštakų judesiai kartu su labiau atpalaiduotomis šlaunimis ir kojomis. Judesiai dažniausiai labai dideli ir perdėti, taip pat ritmiški ir sinchronizuoti su muzika. Locking yra orientuotas į pasirodymus, kai atlikėjas dažnai sąveikauja su publika šypsodamasis arba paduodamas jiems ranką, o judesiai kartais būna gana juokingi.</p>
        <p>Šį stilių sudaro daugelis akrobatinių ir fizinių jėgų reikalaujančių judesių, tokių kaip nusileidimas ant kelių ir virvutė. Šiems judesiams atlikti dažnai reikalinga kelių apsauga.</p>
      </>
    ),
    music: <p>Locking šokamas pagal tradicinę funk muziką. Šiomis dienomis pasaulyje funk muziką atlieka ir populiarina atlikėjas Bruno Mars.</p>,
    movesTitle: 'Populiariausi Locking judesiai',
    moves: ['Lock / Double lock', 'Point', 'Wrist Twril', 'Muscle Man', 'Scoo B Do', 'Funky Guitar', 'Jazz Split', 'Stop and Go', 'Kick', 'The Skeeter Rabbit'],
    more: 'Daugiau Locking istorijos',
    moreHref: 'https://megusta.lt/apie-locking-sokiu-stiliu/',
    video: 'BIt7lbBiVDE',
  },
  {
    name: 'Popping',
    intro: <p>Gatvės šokio stilius, atsiradęs tarp JAV jaunimo apie 1970-uosius metus.</p>,
    principle: (
      <p>Vienas iš pagrindinių ir svarbiausių Popping šokio elementų – pop arba hit. Tai gebėjimas staigiai įtempti ir atleisti kūno raumenis, taip sukuriant virpesį. Šio stiliaus pasirodymai būna dinamiški, panaudojant daugybę technikų. Kūno bangavimas (waving), atskirų kūno dalių izoliacijos (isolations), judesiai rankomis su griežtomis linijomis (tutting), funk judėjimas (fresno) – tai tik maža dalis to, ką galima išvysti per Popping šokių kovas ar pasirodymus.</p>
    ),
    music: <p>Popping stilius „užaugo“ ant gyvos funk muzikos. Atsiradus Hip Hop muzikai, Popping šokėjai ėmė šokti ir pagal šį muzikinį žanrą.</p>,
    movesTitle: 'Populiariausi Popping judėjimai',
    moves: ['Fresno', 'Waving', 'Tutting', 'Slow Motion', 'Gliding', 'Isolations (izoliacijos)', 'Boogaloo Rolls', 'Robotting', 'Animations'],
    more: 'Daugiau Popping istorijos',
    moreHref: 'https://megusta.lt/apie-popping-sokiu-stiliu/',
    video: 'XKJgAaQV4Jg',
  },
  {
    name: 'House',
    intro: <p>Tai gatvės šokių stilius, kilęs JAV klubuose iš Čikagoje atsiradusios House muzikos. Apie 1980-uosius metus atsiradęs House judėjimas pasižymi energija ir gera nuotaika, neleidžiančia stovėti vietoje nė vienam šokėjui.</p>,
    principle: (
      <>
        <p>House šokis susideda iš trijų pagrindinių elementų, kurie pasirodymus padaro dinamiškais ir įspūdingais.</p>
        <p><b>Jacking arba Jack</b> – pagrindinis ir populiariausias House judesys, dar laikomas ir House groove‘u. Tai judėjimas, kai šokėjas banguoja visu savo kūnu ir taip sukelia minkštumo, atsipalaidavimo jausmą.</p>
        <p><b>Footwork</b> – judesiai, atliekami kojomis. House stilius pasižymi greitais ir techniškais kojų, o ypač pėdų judesiais.</p>
        <p><b>Lofting</b> – House judesiai ant žemės. Dažnai lofting‘e galima išvysti akrobatinių elementų, tačiau nuo B-Boying jie išsiskiria savo vientisumu ir švelnumu.</p>
      </>
    ),
    music: (
      <p>Šis šokio stilius šokamas pagal elektroninę House muziką. Šiandien visame pasaulyje vieni populiariausių{' '}
        <a href="https://en.wikipedia.org/wiki/List_of_house_music_artists" target="_blank" rel="noopener noreferrer">House muzikos atlikėjų</a>{' '}
        yra Avicii, Diplo, Tiesto, Daft Punk ir daug kitų.</p>
    ),
    movesTitle: 'Populiariausi House judesiai',
    moves: ['Jack', 'The Loose Legs', 'Pad Berou', 'Farmer', 'Salsa Step', 'Shuffle', 'Jack In The Box', 'Tip Tap Toe', 'Heel-Toe', 'The Skate'],
    more: 'Daugiau House istorijos',
    moreHref: 'https://megusta.lt/apie-house-sokiu-stiliu/',
    video: '6fHiA3Eai-I',
  },
]

const arrow = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

// Click-to-play YouTube clip. The poster is the largest thumbnail YouTube has (maxres, 1280x720);
// the small hqdefault one (480x360) only stands in when a video has no larger one.
function Video({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false)
  const [small, setSmall] = useState(false)
  if (playing) {
    return (
      <iframe
        className="sd-video__frame" title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1&hl=lt`}
      />
    )
  }
  return (
    <button type="button" className="sd-video__poster" aria-label={`Paleisti vaizdo įrašą: ${title}`} onClick={() => setPlaying(true)}>
      <img src={`https://i.ytimg.com/vi/${id}/${small ? 'hqdefault' : 'maxresdefault'}.jpg`} alt="" loading="lazy" onError={() => setSmall(true)} />
      <span className="sd-video__shade" aria-hidden="true" />
      <span className="sd-video__play" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
      </span>
    </button>
  )
}

export default function StreetDance() {
  const trainers = section('home.trainers').items.filter(t => TRAINER_NAMES.includes(t.name.split(' ')[0]))
  trainers.sort((a, b) => TRAINER_NAMES.indexOf(a.name.split(' ')[0]) - TRAINER_NAMES.indexOf(b.name.split(' ')[0]))

  return (
    <main className="sd">
      {/* intro */}
      <section className="ng-wrap sd-hero">
        <span className="ng-kicker">Šokių pamokos</span>
        <h1 className="ng-h1 sd-hero__title">Gatvės <span className="ng-mark">šokiai</span></h1>
        <p className="ng-lead sd-hero__lead">
          Treniruočių metu pažindinamės su gatvės šokių istorija, gilinamės į įvairius stilius, tokius kaip HIP HOP, LOCKING, POPPING, HOUSE, mokomės muzikalumo, šokame įvairias šokių choreografijas, improvizuojame, laviname fizinį pasiruošimą ir lankstumą. Ruošiamės įvairiems konkursams bei pasirodymams, taip pat ugdome bendravimą komandoje.
        </p>
        <div className="ng-actions">
          <a href={PATHS.registration} className="ng-btn ng-btn--dark">Registruokis {arrow}</a>
          <a href="#pradedanciuju-laikai" className="ng-btn ng-btn--ghost">Pradedančiųjų laikai</a>
        </div>
      </section>

      {/* key facts */}
      <section aria-label="Gatvės šokiai skaičiais" className="ng-wrap ng-stats">
        {FACTS.map((f, i) => (
          <div key={f.label} className={`ng-stat ng-stat--${i === 0 ? 'accent' : i === FACTS.length - 1 ? 'dark' : 'white'}`}>
            <span className="ng-stat__num">{f.num}{f.unit && <small className="sd-unit">{f.unit}</small>}</span>
            <span className="ng-stat__label">{f.label}</span>
          </div>
        ))}
      </section>

      {/* beginners' timetable */}
      <section id="pradedanciuju-laikai" className="ng-wrap ng-sec">
        <div className="ng-head">
          <span className="ng-kicker">Tvarkaraštis</span>
          <h2 className="ng-h2">Pradedančiųjų laikai</h2>
        </div>
        <div className="ng-table">
          <div className="ng-table__scroll">
            <div className="sd-row sd-row--head">
              <span>Amžius</span><span>Dienos</span><span>Laikas</span><span>Treneris</span>
            </div>
            {CLASSES.map(c => (
              <div key={c.age} className="sd-row">
                <span className="sd-age">{c.age}</span>
                <span className="sd-days">{c.days}</span>
                <span className="sd-time">
                  <span className="ng-time">{c.time.split(':')[0]}<span className="time-colon">:</span>{c.time.split(':')[1]}</span>
                  {c.duration && <em>{c.duration}</em>}
                </span>
                <span className="sd-trainer">{c.trainer}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="sd-note">I – pirmadienis, II – antradienis, III – trečiadienis, IV – ketvirtadienis. Visą savaitės tvarkaraštį rasi <a href={PATHS.timetable}>čia</a>.</p>
      </section>

      {/* trainers */}
      {trainers.length > 0 && (
        <section id="treneriai" className="ng-wrap ng-sec">
          <div className="ng-head">
            <span className="ng-kicker">Komanda</span>
            <h2 className="ng-h2">Gatvės šokių treneriai</h2>
          </div>
          <div className="ng-trainers">
            {trainers.map((t, i) => (
              <article key={i} className="ng-trainer">
                <img src={t.image.src} alt={t.image.alt} loading="lazy" className="ng-trainer__photo" />
                <span className="ng-trainer__shade" aria-hidden="true" />
                <div className="ng-trainer__info">
                  <h3>{t.name.split(' ')[0]}</h3>
                  {t.specialty && <span className="ng-trainer__style">{t.specialty}</span>}
                </div>
                {t.bio && <p className="ng-trainer__bio">{t.bio}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* video */}
      <section className="ng-wrap ng-sec">
        <div className="sd-video">
          <Video id={VIDEO_ID} title="Gatvės šokių pamoka — vaizdo įrašas" />
        </div>
      </section>

      {/* styles */}
      <section id="stiliai" className="ng-wrap ng-sec">
        <div className="ng-head">
          <span className="ng-kicker">Ką mokomės</span>
          <h2 className="ng-h2">Gatvės šokių stiliai</h2>
        </div>
        <div className="sd-styles">
          {STYLES.map((s, i) => (
            <article key={s.name} id={s.name.toLowerCase().replace('-', '')} className="sd-style">
              <header className="sd-style__head">
                <span className="ng-tag">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="ng-h3">{s.name}</h3>
              </header>
              <div className="sd-style__body">
                <div className="sd-style__text">
                  {s.intro}
                  <h4>Judėjimo principas</h4>
                  {s.principle}
                  <h4>Muzikos žanras</h4>
                  {s.music}
                </div>
                <aside className="sd-style__side">
                  <div className="sd-video"><Video id={s.video} title={`${s.name} — vaizdo įrašas`} /></div>
                  <div className="sd-style__moves">
                  <h4>{s.movesTitle}</h4>
                  <ul>{s.moves.map(m => <li key={m}>{m}</li>)}</ul>
                  <a href={s.moreHref} target="_blank" rel="noopener noreferrer" className="sd-more">{s.more} {arrow}</a>
                  </div>
                </aside>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* more videos */}
      <section className="ng-wrap ng-sec">
        <div className="sd-videos">
          {MORE_VIDEOS.map((id, i) => (
            <div key={id} className="sd-video"><Video id={id} title={`Vaizdo įrašas ${i + 1}`} /></div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ng-wrap ng-sec">
        <div className="sd-cta">
          <h2 className="ng-h2">Išbandyk pirmą nemokamą pamoką</h2>
          <a href={PATHS.registration} className="ng-btn ng-btn--dark ng-btn--xl">Registruokis {arrow}</a>
        </div>
      </section>
    </main>
  )
}
