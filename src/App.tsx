import { useEffect, useState } from 'react'
import type React from 'react'
import logo from './assets/logo-megusta.webp'
import heroImage from './assets/hero.webp'
import { heroPhotoStyle } from './heroPhoto'
import LayoutEditor from './editor/LayoutEditor'
import Odometer from './Odometer'
import styleGatves from './assets/styles/gatves.webp'
import stylePop from './assets/styles/pop.webp'
import styleLady from './assets/styles/lady.webp'
import styleBreikas from './assets/styles/breikas.webp'

const DANCE_STYLES = [
  {
    id: 'gatves',
    name: 'Gatvės šokiai',
    tagline: 'Born in the streets, perfected on stage',
    description:
      'Autentiški gatvės šokiai — nuo popping ir locking iki krump ir freestyle. Ugdome individualų stilių ir išraišką kiekviename judėjime. Treniruotės vyksta dinamiškoje aplinkoje, kurioje kiekvienas randa savo balsą.',
    image: styleGatves,
    color: '#FFB3C6',
    levels: ['4–6 m.', '7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'pop',
    name: 'Pop Dance',
    tagline: 'Energy meets precision',
    description:
      'Komerciniai ir sceniniai šokiai — ryškūs, dinamiški, su chartiška energija. Tobulai tinka scenai, muzikos vaizdo klipams ir konkursams. Šie šokiai jungia stilių ir techniką į vieną sprogstantį mišinį.',
    image: stylePop,
    color: '#FFB3C6',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'lady',
    name: 'Lady Class',
    tagline: 'Power. Grace. Confidence.',
    description:
      'Moteriška plastika, heels šokiai ir sexy style. Atskleidžiame vidinę stiprybę ir išreiškiame ją per judėjimą. Lady Class — tai ne tik šokiai, tai savęs atradimas ir pasitikėjimo savimi ugdymas.',
    image: styleLady,
    color: '#FFB3C6',
    levels: ['12–15 m.', 'Nuo 16 m.', '4–99 m.'],
  },
  {
    id: 'breikas',
    name: 'Breikas',
    tagline: 'Defy gravity. Define limits.',
    description:
      'Breakdance — nuo toprocko ir footwork iki freezes ir power moves. Kietumas, disciplina ir neįtikėtinas kūno valdymas. Mūsų treneriai — tarptautiniai čempionai, pasiruošę perduoti visas paslaptis.',
    image: styleBreikas,
    color: '#FFB3C6',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
]

// Weekly timetable: Mon & Wed share one programme, Tue & Thu the other.
const SCHEDULE_DAYS = [
  {
    day: 'Pirmad.',
    full: 'Pirmadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Breikas', age: 'Nuo 7 m.', color: '#FFB3C6' },
      { time: '17:00', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '17:30', duration: '60 min', style: 'Gatvės šokiai', age: '4–5 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Gatvės šokiai', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Pop Dance', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '60 min', style: 'Gatvės šokiai', age: '6–7 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Antrad.',
    full: 'Antradienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Gatvės šokiai', age: 'Nuo 18 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Trečiad.',
    full: 'Trečiadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Breikas', age: 'Nuo 7 m.', color: '#FFB3C6' },
      { time: '17:00', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '17:30', duration: '60 min', style: 'Gatvės šokiai', age: '4–5 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Gatvės šokiai', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Pop Dance', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '60 min', style: 'Gatvės šokiai', age: '6–7 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Ketvirt.',
    full: 'Ketvirtadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Gatvės šokiai', age: 'Nuo 18 m.', color: '#FFB3C6' },
    ],
  },
]

const PLANS = [
  {
    name: 'Standart',
    price: '55',
    desc: '1 šokių stilius',
    features: ['1 šokių stilius', '8 šokių pamokos per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
    highlight: false,
    cta: 'Rinktis Standart',
  },
  {
    name: 'Intensive',
    price: '70',
    desc: '2 šokių stiliai',
    features: ['2 šokių stiliai', '16 šokių pamokų per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
    highlight: true,
    cta: 'Rinktis Intensive',
  },
]

const TRAINERS = [
  {
    name: 'Tomas Kazlauskas',
    specialty: 'Gatvės šokiai',
    exp: '12 m. patirtis',
    bio: 'Lietuvos freestyle čempionas. Šokęs su žymiausiais Europos artistais ir vedęs masterclass 12 šalių.',
    color: '#FFB3C6',
    image: 'https://images.unsplash.com/photo-1605450984717-5b2386930f7c?w=400&h=520&fit=crop&auto=format',
  },
  {
    name: 'Eglė Mockutė',
    specialty: 'Lady Class',
    exp: '8 m. patirtis',
    bio: 'Heels ir women\'s style specialistė. Choreografė, dirbusi su Lietuvos muzikos žvaigždėmis ir TV projektais.',
    color: '#FF5C8A',
    image: 'https://images.unsplash.com/photo-1586211070543-61ae1ad4a665?w=400&h=520&fit=crop&auto=format',
  },
  {
    name: 'Mantas Rimkus',
    specialty: 'Breikas',
    exp: '15 m. patirtis',
    bio: 'Battle King Vilnius nugalėtojas. Atstovauja Lietuvai tarptautiniuose breakdance čempionatuose Europoje ir JAV.',
    color: '#00CFFF',
    image: 'https://images.unsplash.com/photo-1504293476958-6d6d0257d014?w=400&h=520&fit=crop&auto=format',
  },
  {
    name: 'Karolis Adomaitis',
    specialty: 'Pop Dance',
    exp: '10 m. patirtis',
    bio: 'Buvęs profesionalus šokėjas iš televizijos. Specializuojasi sceninėje choreografijoje ir konkursų ruošime.',
    color: '#FF3DFF',
    image: 'https://images.unsplash.com/photo-1769535348343-d01ebd9ed8e4?w=400&h=520&fit=crop&auto=format',
  },
]

const CONTACT = {
  email: 'labas@megusta.lt',
  phone: '+370 606 44888',
  phoneHref: 'tel:+37060644888',
}

// Social links will be provided later; '#' until then.
const SOCIALS = [
  { name: 'Facebook', href: '#', icon: 'facebook' },
  { name: 'TikTok', href: '#', icon: 'tiktok' },
  { name: 'Instagram', href: '#', icon: 'instagram' },
  { name: 'YouTube', href: '#', icon: 'youtube' },
] as const

type IconName = 'mail' | 'phone' | (typeof SOCIALS)[number]['icon']

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {name === 'mail' && (
        <g {...stroke}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></g>
      )}
      {name === 'phone' && (
        <path {...stroke} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      )}
      {name === 'facebook' && (
        <path {...stroke} d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      )}
      {name === 'instagram' && (
        <g {...stroke}><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><path d="M17.5 6.5h.01" /></g>
      )}
      {name === 'youtube' && (
        <g {...stroke}><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></g>
      )}
      {name === 'tiktok' && (
        <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      )}
    </svg>
  )
}

const hoverPink = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = '#FFB3C6' },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = '#ccc' },
}

export default function App() {
  const [activeStyle, setActiveStyle] = useState(0)
  const [activeDay, setActiveDay] = useState(0)

  // Rows mounted on a day switch would start their own blink cycle; pin every
  // colon animation to the same start so all times blink together.
  useEffect(() => {
    document.getAnimations().forEach(a => {
      if ((a as CSSAnimation).animationName === 'colonBlink') a.startTime = 0
    })
  }, [activeDay])
  const [menuOpen, setMenuOpen] = useState(false)

  const current = DANCE_STYLES[activeStyle]

  return (
    <div style={{ backgroundColor: '#080808', color: '#f0f0f0', fontFamily: "'Outfit', sans-serif", overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: '1px solid #1a1a1a',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(8,8,8,0.88)',
      }}>
        <div className="wide-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 88, gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#hero" data-edit="Logotipas" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Me Gusta — į pradžią">
              <img src={logo} alt="Me Gusta" width={81} height={52} style={{ height: 52, width: 'auto', display: 'block' }} />
            </a>
            <div className="nav-contacts" data-edit="Kontaktai" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`mailto:${CONTACT.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: 0.3, transition: 'color 0.2s' }} {...hoverPink}>
                <span style={{ color: '#FFB3C6' }}><Icon name="mail" size={14} /></span>
                {CONTACT.email}
              </a>
              <a href={CONTACT.phoneHref} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: 0.3, transition: 'color 0.2s' }} {...hoverPink}>
                <span style={{ color: '#FFB3C6' }}><Icon name="phone" size={14} /></span>
                {CONTACT.phone}
              </a>
            </div>
            <span className="nav-socials" aria-hidden="true" style={{ width: 1, height: 40, backgroundColor: '#2a2a2a' }} />
            <div className="nav-socials" data-edit="Soc. tinklai" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 16px)', gap: 10 }}>
              {SOCIALS.map(s => (
                <a key={s.name} href={s.href} aria-label={s.name} title={s.name} style={{ color: '#ccc', display: 'flex', transition: 'color 0.2s' }} {...hoverPink}>
                  <Icon name={s.icon} size={16} />
                </a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="nav-links" data-edit="Meniu">
            {['Stiliai', 'Tvarkaraštis', 'Kainos', 'Treneriai'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{ color: '#888', textDecoration: 'none', fontSize: 13, fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFB3C6')}
                onMouseLeave={e => (e.currentTarget.style.color = '#888')}
              >
                {item}
              </a>
            ))}
            <a
              href="#kainos"
              style={{
                backgroundColor: '#FFB3C6', color: '#080808', textDecoration: 'none',
                padding: '8px 20px', fontWeight: 700, fontSize: 12, letterSpacing: 1.5,
                textTransform: 'uppercase', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFB3C6'; }}
            >
              Registruotis
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* bg image */}
        <div data-edit-photo className="hero-photo hero-photo-in" style={{ position: 'absolute', inset: 0, ...heroPhotoStyle(heroImage) }} aria-hidden="true" />
        {/* gradient overlay */}
        <div className="hero-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, #080808 30%, rgba(8,8,8,0.6) 50%, transparent 75%)',
        }} aria-hidden="true" />
        {/* accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', backgroundColor: '#FFB3C6' }} aria-hidden="true" />

        <div className="hero-content" style={{ position: 'relative', paddingTop: 144, paddingBottom: 80, width: '100%' }}>
          <div style={{ maxWidth: 720 }}>
            <p data-edit="Hero: Kaunas · Nuo 2006" className="hero-in hero-in-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#FFB3C6', marginBottom: 24, textTransform: 'uppercase' }}>
              ◆&nbsp;&nbsp;Kaunas · Nuo 2006
            </p>
            <h1 data-edit="Hero: antraštė" style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 'clamp(72px, 10vw, 140px)',
              lineHeight: 0.92, textTransform: 'uppercase',
              color: '#f0f0f0', margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}>
              <span className="hero-in hero-in-2">TAVO</span><br />
              <span className="hero-in hero-in-3" style={{ color: '#FFB3C6', WebkitTextStroke: '0px' }}><span className="hero-shake">JUDESIO</span></span><br />
              <span className="hero-in hero-in-4">NAMAI</span>
            </h1>
            <p data-edit="Hero: aprašymas" className="hero-in hero-in-5" style={{ fontSize: 18, color: '#aaa', lineHeight: 1.6, maxWidth: 480, marginBottom: 48, fontWeight: 300 }}>
              Profesionali hip hop šokių studija Kaune. Čia gatvių ritmai virsta scenos menu — nuo pirmų žingsnių iki čempionų podiumo.
            </p>
            <div data-edit="Hero: mygtukai" className="hero-in hero-in-6" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a
                href="#stiliai"
                style={{
                  backgroundColor: '#FFB3C6', color: '#080808',
                  padding: '16px 40px', fontWeight: 800, fontSize: 14,
                  letterSpacing: 2, textTransform: 'uppercase',
                  textDecoration: 'none', display: 'inline-block',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFB3C6'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Pasirink stilių →
              </a>
              <a
                href="#tvarkarastis"
                style={{
                  border: '1px solid #333', color: '#f0f0f0',
                  padding: '16px 40px', fontWeight: 600, fontSize: 14,
                  letterSpacing: 2, textTransform: 'uppercase',
                  textDecoration: 'none', display: 'inline-block',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFB3C6'; e.currentTarget.style.color = '#FFB3C6'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#f0f0f0'; }}
              >
                Tvarkaraštis
              </a>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div data-edit="Slinkti" className="hero-fade-in" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: '#9a9a9a', textTransform: 'uppercase' }}>Slinkti</span>
          <div style={{ width: 1, height: 48, backgroundColor: '#555', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '40%', backgroundColor: '#FFB3C6',
              animation: 'scrollLine 1.8s ease-in-out infinite',
            }} />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{ backgroundColor: '#FFB3C6', padding: '0' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { num: '4', label: 'Šokių stiliai' },
            { num: '5', label: 'Šokių mokytojai' },
            { num: '20', label: 'Metų patirties' },
            { num: '650+', label: 'Laimėjimų' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                padding: '40px 24px',
                borderRight: i < 3 ? '1px solid rgba(0,0,0,0.12)' : 'none',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 'clamp(52px, 6vw, 80px)',
                color: '#080808', lineHeight: 1, letterSpacing: '-0.02em',
              }}>
                <Odometer value={stat.num} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DANCE STYLE SELECTOR */}
      <section id="stiliai" style={{ padding: '120px 0', backgroundColor: '#080808' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#FFB3C6', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;Ko mokome
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
              Pasirink savo<br /><span style={{ color: '#FFB3C6' }}>stilių</span>
            </h2>
          </div>

          {/* Tab row */}
          <div role="tablist" aria-label="Šokių stiliai" style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: 0, flexWrap: 'wrap' }}>
            {DANCE_STYLES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeStyle === i}
                className="style-tab"
                onClick={() => setActiveStyle(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '18px 32px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase',
                  borderBottom: '3px solid transparent',
                  marginBottom: -1,
                  position: 'relative',
                }}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Content panel */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            border: '1px solid #1a1a1a', borderTop: 'none',
          }}>
            {/* Image */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 480, backgroundColor: '#111' }}>
              <img
                src={current.image}
                alt={current.name}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  position: 'absolute', inset: 0,
                  transition: 'opacity 0.4s',
                }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(135deg, ${current.color}22 0%, transparent 60%)`,
              }} />
              <div style={{
                position: 'absolute', bottom: 24, left: 24,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 'clamp(36px, 4vw, 56px)',
                color: current.color, textTransform: 'uppercase', lineHeight: 1,
                letterSpacing: 1,
              }}>
                {current.name}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '56px 48px', backgroundColor: '#0d0d0d', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, letterSpacing: 3, color: current.color, textTransform: 'uppercase', fontWeight: 600, marginBottom: 20 }}>
                  {current.tagline}
                </p>
                <p style={{ fontSize: 17, color: '#ccc', lineHeight: 1.75, fontWeight: 300, marginBottom: 40 }}>
                  {current.description}
                </p>
                <div style={{ marginBottom: 40 }}>
                  <p style={{ fontSize: 11, letterSpacing: 3, color: '#555', textTransform: 'uppercase', marginBottom: 12 }}>Lygiai</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {current.levels.map(l => (
                      <span
                        key={l}
                        style={{
                          padding: '6px 16px', fontSize: 12, fontWeight: 600,
                          letterSpacing: 1.5, textTransform: 'uppercase',
                          border: `1px solid ${current.color}44`,
                          color: current.color,
                        }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <a
                href="#kainos"
                style={{
                  display: 'inline-block', padding: '16px 36px',
                  backgroundColor: current.color, color: '#080808',
                  fontWeight: 800, fontSize: 13, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none',
                  alignSelf: 'flex-start', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Plačiau →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="tvarkarastis" style={{ padding: '120px 0', backgroundColor: '#060606', borderTop: '1px solid #111' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#FFB3C6', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;Kada šokam
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
              Tvarkaraštis
            </h2>
          </div>

          {/* Day tabs */}
          <div role="tablist" aria-label="Savaitės dienos" style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
            {SCHEDULE_DAYS.map((d, i) => (
              <button
                key={d.day}
                type="button"
                role="tab"
                aria-selected={activeDay === i}
                className="day-tab"
                onClick={() => setActiveDay(i)}
                style={{
                  padding: '12px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                <span>{d.full}</span>
              </button>
            ))}
          </div>

          {/* Classes for active day */}
          <div style={{ border: '1px solid #1a1a1a' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 110px 110px',
              padding: '12px 24px',
              borderBottom: '1px solid #1a1a1a',
              backgroundColor: '#0d0d0d',
            }}>
              {['Laikas', 'Stilius', 'Trukmė', 'Amžius'].map(h => (
                <span key={h} style={{ fontSize: 10, letterSpacing: 3, color: '#8a8a8a', textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
              ))}
            </div>
            {SCHEDULE_DAYS[activeDay].classes.map((cls, i) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 110px 110px',
                  padding: '20px 24px',
                  borderBottom: i < SCHEDULE_DAYS[activeDay].classes.length - 1 ? '1px solid #131313' : 'none',
                  alignItems: 'center',
                  // every second row slightly lighter for easier reading across
                  backgroundColor: i % 2 === 1 ? '#141414' : 'transparent',
                }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: '#FFB3C6', letterSpacing: 1 }}>
                  {cls.time.split(':')[0]}<span className="time-colon">:</span>{cls.time.split(':')[1]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cls.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#f0f0f0' }}>{cls.style}</span>
                </div>
                <span style={{ fontSize: 14, color: '#c4c4c4', fontWeight: 400 }}>{cls.duration}</span>
                <span style={{
                  fontSize: 11, letterSpacing: 1.5, fontWeight: 600,
                  color: cls.color, textTransform: 'uppercase',
                  // equal space on every side; the right side is 1.5px less to
                  // offset the letter-spacing after the last character
                  padding: '10px 8.5px 10px 10px', lineHeight: 1, border: `1px solid ${cls.color}66`,
                  display: 'inline-block', justifySelf: 'start',
                }}>
                  {cls.age}
                </span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: '#9a9a9a', fontWeight: 400 }}>
            * Treniruotės vyksta Me Gusta salėje, Savanorių pr. 271, Kaunas. Pilną tvarkaraštį galite rasti paspaudę{' '}
            {/* TODO: link to the timetable page once it exists */}
            <a href="#" style={{ color: '#FFB3C6', textDecoration: 'underline', textUnderlineOffset: 3 }}>Tvarkaraštis</a>.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="kainos" style={{ padding: '120px 0', backgroundColor: '#080808', borderTop: '1px solid #111' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#FFB3C6', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;Investicija
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
              Kainos
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, maxWidth: 800 }}>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                style={{
                  backgroundColor: plan.highlight ? '#FFB3C6' : '#0d0d0d',
                  border: '1px solid ' + (plan.highlight ? '#FFB3C6' : '#1a1a1a'),
                  padding: '48px 40px',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -12, left: 40,
                    backgroundColor: '#080808', color: '#FFB3C6',
                    padding: '4px 16px', fontSize: 10, fontWeight: 800,
                    letterSpacing: 3, textTransform: 'uppercase',
                    border: '1px solid #FFB3C6',
                  }}>
                    Populiariausias
                  </div>
                )}
                <div>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: plan.highlight ? '#333' : '#555', marginBottom: 8 }}>
                    {plan.desc}
                  </p>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, textTransform: 'uppercase', color: plan.highlight ? '#080808' : '#f0f0f0', margin: '0 0 28px', letterSpacing: 2 }}>
                    {plan.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 36 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 72, color: plan.highlight ? '#080808' : '#f0f0f0', lineHeight: 1 }}>
                      €{plan.price}
                    </span>
                    <span style={{ fontSize: 14, color: plan.highlight ? '#333' : '#555', fontWeight: 500 }}>/mėn</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: plan.highlight ? '#111' : '#aaa', fontWeight: 400 }}>
                        <span style={{ color: plan.highlight ? '#080808' : '#FFB3C6', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <a
                  href="#kontaktai"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '16px 24px',
                    backgroundColor: plan.highlight ? '#080808' : '#FFB3C6',
                    color: plan.highlight ? '#FFB3C6' : '#080808',
                    fontWeight: 800, fontSize: 13, letterSpacing: 2,
                    textTransform: 'uppercase', textDecoration: 'none',
                    transition: 'all 0.2s', marginTop: 'auto',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {plan.cta} →
                </a>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', maxWidth: 800, marginTop: 32, fontSize: 15, fontWeight: 700, color: '#f0f0f0', letterSpacing: 0.3 }}>
            Pirmoji treniruotė nemokama.
          </p>
        </div>
      </section>

      {/* TRAINERS */}
      <section id="treneriai" style={{ padding: '120px 0', backgroundColor: '#060606', borderTop: '1px solid #111' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#FFB3C6', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;Komanda
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
              Mūsų treneriai
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {TRAINERS.map((t) => (
              <div
                key={t.name}
                style={{
                  position: 'relative', overflow: 'hidden',
                  backgroundColor: '#111',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  const img = e.currentTarget.querySelector('.trainer-img') as HTMLElement
                  const overlay = e.currentTarget.querySelector('.trainer-overlay') as HTMLElement
                  if (img) img.style.transform = 'scale(1.06)'
                  if (overlay) overlay.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  const img = e.currentTarget.querySelector('.trainer-img') as HTMLElement
                  const overlay = e.currentTarget.querySelector('.trainer-overlay') as HTMLElement
                  if (img) img.style.transform = 'scale(1)'
                  if (overlay) overlay.style.opacity = '0'
                }}
              >
                <div style={{ paddingBottom: '130%', position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
                  <img
                    src={t.image}
                    alt={t.name}
                    className="trainer-img"
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: 'brightness(0.65) grayscale(0.2)',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(180deg, transparent 40%, ${t.color}33 100%)`,
                  }} />

                  {/* Hover overlay with bio */}
                  <div
                    className="trainer-overlay"
                    style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: 'rgba(8,8,8,0.88)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      alignItems: 'center', padding: 28, textAlign: 'center',
                      opacity: 0, transition: 'opacity 0.3s ease',
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.65, fontWeight: 300 }}>{t.bio}</p>
                  </div>
                </div>

                {/* Info bar */}
                <div style={{ padding: '20px 20px', borderTop: `3px solid ${t.color}` }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: '#f0f0f0', margin: '0 0 4px', letterSpacing: 0.5 }}>
                    {t.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: t.color, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{t.specialty}</span>
                    <span style={{ fontSize: 11, color: '#555', fontWeight: 500, letterSpacing: 1 }}>{t.exp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ backgroundColor: '#FFB3C6', padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#333', textTransform: 'uppercase', marginBottom: 16 }}>
          ◆&nbsp;&nbsp;Pirmoji treniruotė nemokama
        </p>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 7vw, 100px)', textTransform: 'uppercase', color: '#080808', lineHeight: 0.95, margin: '0 0 40px', letterSpacing: '-0.01em' }}>
          Pradėk šokti<br />šiandien
        </h2>
        <a
          href={`mailto:${CONTACT.email}`}
          style={{
            display: 'inline-block',
            backgroundColor: '#080808', color: '#FFB3C6',
            padding: '20px 56px', fontWeight: 800, fontSize: 14,
            letterSpacing: 3, textTransform: 'uppercase',
            textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#080808'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Registruotis dabar →
        </a>
      </section>

      {/* FOOTER */}
      <footer id="kontaktai" style={{ backgroundColor: '#050505', borderTop: '1px solid #111', padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <img src={logo} alt="Me Gusta" width={87} height={56} style={{ height: 56, width: 'auto', display: 'block', marginBottom: 20 }} />
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 260 }}>
                Profesionali hip hop šokių studija Kaune. 20 metų patirtis, 650+ laimėjimų, 4 šokių stiliai.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#333', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Stiliai</p>
              {['Gatvės šokiai', 'Pop Dance', 'Lady Class', 'Breikas'].map(s => (
                <p key={s} style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{s}</p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#333', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Studija</p>
              {['Apie mus', 'Treneriai', 'Tvarkaraštis', 'Kainos'].map(s => (
                <p key={s} style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{s}</p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#333', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Kontaktai</p>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>Savanorių pr. 271, Kaunas</p>
              <p style={{ fontSize: 14, marginBottom: 8 }}><a href={CONTACT.phoneHref} style={{ color: '#555', textDecoration: 'none' }}>{CONTACT.phone}</a></p>
              <p style={{ fontSize: 14, marginBottom: 16 }}><a href={`mailto:${CONTACT.email}`} style={{ color: '#555', textDecoration: 'none' }}>{CONTACT.email}</a></p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['IG', 'FB', 'YT'].map(s => (
                  <span key={s} style={{ width: 36, height: 36, border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: 0.5, cursor: 'pointer' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #111', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#333' }}>© {new Date().getFullYear()} Me Gusta. Visos teisės saugomos.</span>
            <span style={{ fontSize: 12, color: '#333' }}>Designed with passion for movement.</span>
          </div>
        </div>
      </footer>

      <LayoutEditor />

      <style>{`
        /* Header + hero edge: one column of a 12-column grid (1/12 of the width),
           never further right than the 1280px content container, min 24px. */
        .wide-container {
          padding-left: max(24px, min(calc((100% - 1280px) / 2 + 24px), 8.3333%));
          padding-right: max(24px, min(calc((100% - 1280px) / 2 + 24px), 8.3333%));
        }
        /* Hero text: 12% of the width, never further right than the 1280px
           content edge. */
        .hero-content {
          padding-left: max(24px, min(calc((100% - 1280px) / 2 + 24px), 12%));
          padding-right: max(24px, min(calc((100% - 1280px) / 2 + 24px), 12%));
        }
        /* Placed with the layout editor at 1845px: +90px right (4.88% of the
           width) and 40px up. Desktop only; phones keep the plain layout. */
        @media (min-width: 1025px) {
          .hero-content {
            padding-left: calc(max(24px, min(calc((100% - 1280px) / 2 + 24px), 12%)) + 4.88%);
            top: -40px;
          }
        }
        /* Phones: keep the dancers in frame (desktop framing shows the dark left side). */
        @media (max-width: 900px) {
          .hero-photo { background-position: 0 0, 75% 50% !important; }
        }
        @media (max-width: 640px) {
          .nav-socials { display: none !important; }
        }
        /* Hero load-in: photo settles, then text rises in reading order.
           Ease-out only, transform + opacity only; off for reduced motion. */
        @keyframes heroPhotoIn {
          from { opacity: 0; transform: scale(1.06); }
          to { opacity: 1; transform: none; }
        }
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .hero-photo-in { animation: heroPhotoIn 1400ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        .hero-in { display: inline-block; animation: heroIn 900ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        p.hero-in, div.hero-in { display: block; }
        .hero-in-1 { animation-delay: 300ms; }
        .hero-in-2 { animation-delay: 420ms; }
        .hero-in-3 { animation-delay: 540ms; }
        .hero-in-4 { animation-delay: 660ms; }
        .hero-in-5 { animation-delay: 820ms; }
        .hero-in-6 { animation-delay: 960ms; }
        .hero-fade-in { animation: heroFadeIn 800ms ease-out 1300ms both; }
        /* JUDESIO: a short shake, then rest; repeats every 2s after the load-in. */
        @keyframes heroShake {
          0%, 100% { transform: none; }
          3% { transform: translateX(-3px) rotate(-0.6deg); }
          6% { transform: translateX(3px) rotate(0.6deg); }
          9% { transform: translateX(-2px) rotate(-0.4deg); }
          12% { transform: translateX(2px) rotate(0.3deg); }
          15% { transform: none; }
        }
        .hero-shake { display: inline-block; animation: heroShake 2s ease-in-out 1.8s infinite; }
        /* Style tabs: brighter idle state, underline grows in on hover, stays on the active tab. */
        .style-tab { color: #707070; transition: color 180ms cubic-bezier(0.23, 1, 0.32, 1); }
        .style-tab:hover, .style-tab:focus-visible { color: #b0b0b0; }
        .style-tab[aria-selected="true"] { color: #FFB3C6; }
        .style-tab::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px;
          background: #FFB3C6; transform: scaleX(0); transform-origin: center;
          transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .style-tab:hover::after, .style-tab:focus-visible::after, .style-tab[aria-selected="true"]::after { transform: scaleX(1); }
        /* Day tabs: hover fills the tab with pink from left to right, like the active one. */
        .day-tab {
          position: relative; overflow: hidden;
          background: #111; border: 1px solid #1e1e1e; color: #a0a0a0;
          transition: color 260ms cubic-bezier(0.23, 1, 0.32, 1), border-color 260ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .day-tab::before {
          content: ''; position: absolute; inset: 0; background: #FFB3C6;
          transform: scaleX(0); transform-origin: left center;
          transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .day-tab > span { position: relative; }
        .day-tab:hover, .day-tab:focus-visible, .day-tab[aria-selected="true"] { color: #080808; border-color: #FFB3C6; }
        .day-tab:hover::before, .day-tab:focus-visible::before, .day-tab[aria-selected="true"]::before { transform: scaleX(1); }
        /* Timetable clock colon blinks once a second. */
        @keyframes colonBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.15; }
        }
        .time-colon { animation: colonBlink 1s steps(1, end) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .day-tab::before { transition: none; }
          .time-colon { animation: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-photo-in, .hero-in, .hero-fade-in, .hero-shake { animation: none; }
          .style-tab::after { transition: none; }
        }
        @keyframes scrollLine {
          0% { top: -40%; }
          100% { top: 140%; }
        }
        @media (max-width: 1024px) {
          .nav-links { display: none !important; }
        }
        @media (max-width: 900px) {
          .hero-overlay {
            background: linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.8) 60%, rgba(8,8,8,0.9) 100%) !important;
          }
        }
        @media (max-width: 900px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(4"],
          section > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: 2fr"],
          footer > div > div[style*="grid-template-columns: 2fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          section > div > div[style*="grid-template-columns: repeat(4"],
          section > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          section > div > div[style*="grid-template-columns: 2fr"],
          footer > div > div[style*="grid-template-columns: 2fr"] {
            grid-template-columns: 1fr !important;
          }
          section > div[style*="grid-template-columns: repeat(4"] > div:nth-child(2n) {
            border-right: none !important;
          }
          div[style*="grid-template-columns: 120px 1fr 110px 110px"] {
            grid-template-columns: 52px 1fr 52px 96px !important;
            column-gap: 8px;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
          div[style*="grid-template-columns: 120px 1fr 110px 110px"][style*="rgb(13, 13, 13)"] > span {
            letter-spacing: 1px !important;
          }
        }
      `}</style>
    </div>
  )
}
