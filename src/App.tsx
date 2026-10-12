import { useState } from 'react'
import logo from './assets/logo-megusta.webp'
import heroImage from './assets/hero.webp'

const DANCE_STYLES = [
  {
    id: 'gatves',
    name: 'Gatvės šokiai',
    tagline: 'Born in the streets, perfected on stage',
    description:
      'Autentiški gatvės šokiai — nuo popping ir locking iki krump ir freestyle. Ugdome individualų stilių ir išraišką kiekviename judėjime. Treniruotės vyksta dinamiškoje aplinkoje, kurioje kiekvienas randa savo balsą.',
    image:
      'https://images.unsplash.com/photo-1761882619891-6529ff92df0a?w=900&h=620&fit=crop&auto=format',
    color: '#FFB3C6',
    levels: ['4–6 m.', '7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'pop',
    name: 'Pop Dance',
    tagline: 'Energy meets precision',
    description:
      'Komerciniai ir sceniniai šokiai — ryškūs, dinamiški, su chartiška energija. Tobulai tinka scenai, muzikos vaizdo klipams ir konkursams. Šie šokiai jungia stilių ir techniką į vieną sprogstantį mišinį.',
    image:
      'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=900&h=620&fit=crop&auto=format',
    color: '#FF3DFF',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'lady',
    name: 'Lady Class',
    tagline: 'Power. Grace. Confidence.',
    description:
      'Moteriška plastika, heels šokiai ir sexy style. Atskleidžiame vidinę stiprybę ir išreiškiame ją per judėjimą. Lady Class — tai ne tik šokiai, tai savęs atradimas ir pasitikėjimo savimi ugdymas.',
    image:
      'https://images.unsplash.com/photo-1586211070543-61ae1ad4a665?w=900&h=620&fit=crop&auto=format',
    color: '#FF5C8A',
    levels: ['12–15 m.', 'Nuo 16 m.', '4–99 m.'],
  },
  {
    id: 'breikas',
    name: 'Breikas',
    tagline: 'Defy gravity. Define limits.',
    description:
      'Breakdance — nuo toprocko ir footwork iki freezes ir power moves. Kietumas, disciplina ir neįtikėtinas kūno valdymas. Mūsų treneriai — tarptautiniai čempionai, pasiruošę perduoti visas paslaptis.',
    image:
      'https://images.unsplash.com/photo-1504293476958-6d6d0257d014?w=900&h=620&fit=crop&auto=format',
    color: '#00CFFF',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
]

const SCHEDULE_DAYS = [
  {
    day: 'Pirmad.',
    full: 'Pirmadienis',
    classes: [
      { time: '16:00', duration: '60 min', style: 'Gatvės šokiai', age: '7–11 m.', color: '#FFB3C6' },
      { time: '17:15', duration: '60 min', style: 'Lady Class', age: '12–15 m.', color: '#FF5C8A' },
      { time: '18:30', duration: '90 min', style: 'Breikas', age: 'Nuo 16 m.', color: '#00CFFF' },
    ],
  },
  {
    day: 'Antrad.',
    full: 'Antradienis',
    classes: [
      { time: '16:00', duration: '60 min', style: 'Pop Dance', age: '7–11 m.', color: '#FF3DFF' },
      { time: '17:15', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '90 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FF5C8A' },
    ],
  },
  {
    day: 'Trečiad.',
    full: 'Trečiadienis',
    classes: [
      { time: '15:00', duration: '60 min', style: 'Gatvės šokiai', age: '4–6 m.', color: '#FFB3C6' },
      { time: '16:15', duration: '60 min', style: 'Breikas', age: '7–11 m.', color: '#00CFFF' },
      { time: '17:30', duration: '60 min', style: 'Lady Class', age: '12–15 m.', color: '#FF5C8A' },
      { time: '19:00', duration: '90 min', style: 'Pop Dance', age: 'Nuo 16 m.', color: '#FF3DFF' },
    ],
  },
  {
    day: 'Ketvirt.',
    full: 'Ketvirtadienis',
    classes: [
      { time: '16:00', duration: '60 min', style: 'Breikas', age: '7–11 m.', color: '#00CFFF' },
      { time: '17:15', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FF3DFF' },
      { time: '18:30', duration: '90 min', style: 'Gatvės šokiai', age: 'Nuo 16 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Penktad.',
    full: 'Penktadienis',
    classes: [
      { time: '16:00', duration: '60 min', style: 'Lady Class', age: '7–11 m.', color: '#FF5C8A' },
      { time: '17:15', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '90 min', style: 'Breikas', age: 'Nuo 16 m.', color: '#00CFFF' },
    ],
  },
  {
    day: 'Šeštad.',
    full: 'Šeštadienis',
    classes: [
      { time: '10:00', duration: '60 min', style: 'Gatvės šokiai', age: '4–6 m.', color: '#FFB3C6' },
      { time: '11:15', duration: '60 min', style: 'Breikas', age: '7–11 m.', color: '#00CFFF' },
      { time: '12:30', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FF3DFF' },
      { time: '14:00', duration: '90 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FF5C8A' },
    ],
  },
]

const PLANS = [
  {
    name: 'Standart',
    price: '55',
    desc: '1 užsiėmimas per savaitę',
    features: ['4–5 treniruotės / mėn', '1 pasirinktas stilius', 'Persirengimo kambarys', 'Grupinės treniruotės', 'Prieiga prie vaizdo medžiagos'],
    highlight: false,
    cta: 'Rinktis Standart',
  },
  {
    name: 'Intensive',
    price: '70',
    desc: '2 užsiėmimai per savaitę',
    features: ['8–10 treniruotių / mėn', '2 pasirenkami stiliai', 'Persirengimo kambarys', 'Grupinės treniruotės', 'Vaizdo medžiagos archyvas', 'Pirmenybinė registracija į konkursus'],
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

export default function App() {
  const [activeStyle, setActiveStyle] = useState(0)
  const [activeDay, setActiveDay] = useState(0)
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
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}>
          <a href="#hero" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Me Gusta — į pradžią">
            <img src={logo} alt="Me Gusta" width={75} height={48} style={{ height: 48, width: 'auto', display: 'block' }} />
          </a>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="nav-links">
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
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover', backgroundPosition: '75% center',
        }} aria-hidden="true" />
        {/* gradient overlay */}
        <div className="hero-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, #080808 30%, rgba(8,8,8,0.6) 50%, transparent 75%)',
        }} aria-hidden="true" />
        {/* accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', backgroundColor: '#FFB3C6' }} aria-hidden="true" />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '120px 24px 80px', width: '100%' }}>
          <div style={{ maxWidth: 720 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 5, color: '#FFB3C6', marginBottom: 24, textTransform: 'uppercase' }}>
              ◆&nbsp;&nbsp;Kaunas · Nuo 2006
            </p>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 'clamp(72px, 10vw, 140px)',
              lineHeight: 0.92, textTransform: 'uppercase',
              color: '#f0f0f0', margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}>
              TAVO<br /><br />
              <span style={{ color: '#FFB3C6', WebkitTextStroke: '0px' }}>JUDESIO</span><br />
              NAMAI
            </h1>
            <p style={{ fontSize: 18, color: '#aaa', lineHeight: 1.6, maxWidth: 480, marginBottom: 48, fontWeight: 300 }}>
              Profesionali hip hop šokių studija Kaune. Čia gatvių ritmai virsta scenos menu — nuo pirmų žingsnių iki čempionų podiumo.
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: '#555', textTransform: 'uppercase' }}>Slinkti</span>
          <div style={{ width: 1, height: 48, backgroundColor: '#333', position: 'relative', overflow: 'hidden' }}>
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
            { num: '500+', label: 'Laimėjimų' },
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
                {stat.num}
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
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a', marginBottom: 0, flexWrap: 'wrap' }}>
            {DANCE_STYLES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveStyle(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '18px 32px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase',
                  color: activeStyle === i ? s.color : '#444',
                  borderBottom: activeStyle === i ? `3px solid ${s.color}` : '3px solid transparent',
                  marginBottom: -1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (activeStyle !== i) e.currentTarget.style.color = '#888'; }}
                onMouseLeave={e => { if (activeStyle !== i) e.currentTarget.style.color = '#444'; }}
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
                  filter: 'brightness(0.75)',
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
                Registruotis →
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
              ◆&nbsp;&nbsp;Kada šokami
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
              Tvarkaraštis
            </h2>
          </div>

          {/* Day tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
            {SCHEDULE_DAYS.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                style={{
                  background: activeDay === i ? '#FFB3C6' : '#111',
                  border: '1px solid ' + (activeDay === i ? '#FFB3C6' : '#1e1e1e'),
                  color: activeDay === i ? '#080808' : '#888',
                  padding: '12px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (activeDay !== i) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#ccc'; } }}
                onMouseLeave={e => { if (activeDay !== i) { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#888'; } }}
              >
                {d.day}
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
                <span key={h} style={{ fontSize: 10, letterSpacing: 3, color: '#444', textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
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
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0f0f0f'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: '#FFB3C6', letterSpacing: 1 }}>
                  {cls.time}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cls.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#f0f0f0' }}>{cls.style}</span>
                </div>
                <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>{cls.duration}</span>
                <span style={{
                  fontSize: 11, letterSpacing: 1.5, fontWeight: 600,
                  color: cls.color, textTransform: 'uppercase',
                  padding: '4px 10px', border: `1px solid ${cls.color}33`,
                  display: 'inline-block',
                }}>
                  {cls.age}
                </span>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: '#444', fontWeight: 400 }}>
            * Treniruotės vyksta MoveStudio salėje — Gedimino pr. 45, Vilnius. Pilną tvarkaraštį rasite registracijos formoje.
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

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#444' }}>
            Visos kainos su PVM. Pirmoji bandomoji treniruotė — nemokamai.
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
          href="mailto:info@movestudio.lt"
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
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 3, color: '#FFB3C6', textTransform: 'uppercase', display: 'block', marginBottom: 16 }}>
                MOVE<span style={{ color: '#f0f0f0' }}>STUDIO</span>
              </span>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 260 }}>
                Profesionali hip hop šokių studija Kaune. 20 metų patirtis, 500+ laimėjimų, 4 šokių stiliai.
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
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>Laisvės al. 50, Kaunas</p>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>+370 600 00001</p>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>info@movestudio.lt</p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['IG', 'FB', 'YT'].map(s => (
                  <span key={s} style={{ width: 36, height: 36, border: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: 0.5, cursor: 'pointer' }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #111', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#333' }}>© 2024 MoveStudio. Visos teisės saugomos.</span>
            <span style={{ fontSize: 12, color: '#333' }}>Designed with passion for movement.</span>
          </div>
        </div>
      </footer>

      <style>{`
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
          div[style*="grid-template-columns: 120px 1fr 110px 110px"][style*="background-color"] > span {
            letter-spacing: 1px !important;
          }
        }
      `}</style>
    </div>
  )
}
