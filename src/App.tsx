import { lazy, Suspense, useEffect, useState } from 'react'
import type React from 'react'
import logo from './assets/logo-megusta.webp'
import { HERO_PHOTO, heroPhotoStyle } from './heroPhoto'
import LayoutEditor from './editor/LayoutEditor'
import Odometer from './Odometer'
import { heroImages, inlineData, phoneHref, section } from './content'
import Registration from './Registration'
import Pricing from './Pricing'
import StyleVideo from './StyleVideo'
import Reviews from './Reviews'
import Timetable from './Timetable'
import News from './News'
import Calendar from './Calendar'
import EventPage from './EventPage'
import PostPage from './PostPage'
import NotFound from './NotFound'
import { installLinkHandling, isAdminPage, PATHS, useRoute, type Page } from './router'
import { pageTitle } from './seo'
import './newdesign.css'

// The admin (Clerk sign-in, editors) loads only on /adminas and /apzvalga.
const AdminApp = lazy(() => import('./admin/AdminApp'))

// Header and footer social links; empty ones are not shown.
const SOCIAL_ICONS = [
  { key: 'facebook', name: 'Facebook', icon: 'facebook', short: 'FB' },
  { key: 'tiktok', name: 'TikTok', icon: 'tiktok', short: 'TT' },
  { key: 'instagram', name: 'Instagram', icon: 'instagram', short: 'IG' },
  { key: 'youtube', name: 'YouTube', icon: 'youtube', short: 'YT' },
] as const

type IconName = 'mail' | 'phone' | (typeof SOCIAL_ICONS)[number]['icon']

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

// Header menu (desktop row and the hamburger panel). Tvarkaraštis, Naujienos and Kalendorius have
// their pages; Kainos gets an href once it has one.
const MENU_ITEMS: { label: string; href?: string }[] = [
  { label: 'Kainos' },
  { label: 'Tvarkaraštis', href: PATHS.timetable },
  { label: 'Kalendorius', href: PATHS.calendar },
  { label: 'Naujienos', href: PATHS.news },
  { label: 'Kontaktai', href: PATHS.contacts },
]

function ContactsPage() {
  const contacts = section('global.contacts')
  const socialLinks = section('global.socials')
  const hours = section('registration').hours
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contacts.address)}`
  const label = { fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 3, color: 'var(--text-3, var(--text-2))', textTransform: 'uppercase' as const, margin: '0 0 10px' }
  const link = { color: 'var(--text)', textDecoration: 'none', fontSize: 20, fontWeight: 500 }
  return (
    <section style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)', minHeight: '70vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <p style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>◆&nbsp;&nbsp;Susisiek</p>
        <h1 style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 56px' }}>Kontaktai</h1>
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
          <div>
            <p style={label}>Adresas</p>
            <a href={map} target="_blank" rel="noopener noreferrer" style={link}>{contacts.address}</a>
            <p style={{ margin: '10px 0 0' }}><a href={map} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pink-text)', fontSize: 14, fontWeight: 600 }}>Atidaryti žemėlapyje →</a></p>
          </div>
          <div>
            <p style={label}>Telefonas</p>
            <a href={phoneHref(contacts.phone)} style={link}>{contacts.phone}</a>
            <p style={{ ...label, margin: '28px 0 10px' }}>El. paštas</p>
            <a href={`mailto:${contacts.email}`} style={{ ...link, overflowWrap: 'anywhere' }}>{contacts.email}</a>
          </div>
          <div>
            <p style={label}>Darbo laikas</p>
            {hours.map(h => (
              <p key={h.days} style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 500, color: 'var(--text)' }}>
                <span style={{ display: 'inline-block', minWidth: 64, color: 'var(--pink-text)', fontWeight: 700 }}>{h.days}</span>{h.hours}
              </p>
            ))}
            <p style={{ ...label, margin: '28px 0 10px' }}>Socialiniai tinklai</p>
            <div style={{ display: 'flex', gap: 18 }}>
              {SOCIAL_ICONS.map(s => socialLinks[s.key]
                ? <a key={s.key} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name} style={{ color: 'var(--text)', display: 'flex' }}><Icon name={s.icon} size={24} /></a>
                : <span key={s.key} aria-hidden="true" style={{ color: 'var(--text)', display: 'flex' }}><Icon name={s.icon} size={24} /></span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  // Inner pages have their own paths (/tvarkarastis, /registracija/...); see router.ts.
  const route = useRoute()

  useEffect(() => installLinkHandling(), [])

  if (isAdminPage(route.page)) {
    return (
      <Suspense fallback={<p style={{ font: "15px 'Manrope', sans-serif", color: 'var(--text-2)', padding: 32 }}>Kraunama…</p>}>
        <AdminApp route={route} />
      </Suspense>
    )
  }
  return <Site page={route.page} />
}

const SITE_PAGES = new Set<Page>(['home', 'registracija', 'tvarkarastis', 'naujienos', 'kalendorius', 'kontaktai'])

function Site({ page }: { page: Page }) {
  const route = useRoute()
  const contacts = section('global.contacts')
  const socialLinks = section('global.socials')
  const socials = SOCIAL_ICONS   // all four always show; one without a link yet is not clickable
  const footer = section('global.footer')
  const hero = section('home.hero')
  const heroImg = heroImages(hero)
  const heroFocus = { zoom: HERO_PHOTO.zoom, x: hero.image.x ?? HERO_PHOTO.x, y: hero.image.y ?? HERO_PHOTO.y }
  // phones keep the dancers in frame: the default photo uses its own framing, a new one its focus point
  const heroMobilePos = hero.image.src === '/img/hero.webp' ? '75% 50%' : `${heroFocus.x}% ${heroFocus.y}%`
  const stats = section('home.stats')
  const styles = section('home.styles')
  const schedule = section('home.schedule')
  const trainers = section('home.trainers')
  const cta = section('home.cta')

  useEffect(() => { document.documentElement.dataset.theme = 'light' }, [])

  useEffect(() => {
    // news posts and the news list set their own titles
    if (SITE_PAGES.has(page) && page !== 'naujienos') document.title = pageTitle(page)
    // after switching pages, open at the top, or at the #section the link asked for
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])
  const [activeStyle, setActiveStyle] = useState(0)
  const [picked, setPicked] = useState(false)   // a tab was chosen: its video starts by itself
  const [activeDay, setActiveDay] = useState(0)

  // Sections marked data-reveal play their intro once they scroll into view.
  useEffect(() => {
    const sections = document.querySelectorAll('[data-reveal]')
    if (!('IntersectionObserver' in window)) {
      sections.forEach(el => el.classList.add('in-view'))
      return
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.35 })
    sections.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [page])

  // Rows mounted on a day switch would start their own blink cycle; pin every
  // colon animation to the same start so all times blink together.
  useEffect(() => {
    document.getAnimations().forEach(a => {
      if ((a as CSSAnimation).animationName === 'colonBlink') a.startTime = 0
    })
  }, [activeDay])
  const [menuOpen, setMenuOpen] = useState(false)

  // Hamburger menu: closes on a new page, Escape, or a click outside the header.
  useEffect(() => { setMenuOpen(false) }, [route.path])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.site-header')) setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [menuOpen])
  const isCurrent = (href?: string) =>
    !!href && (route.path === href || route.path.startsWith(href + '/') || (href === PATHS.news && page === 'post'))

  const current = styles.items[Math.min(activeStyle, styles.items.length - 1)]
  const scheduleDay = schedule.days[Math.min(activeDay, schedule.days.length - 1)]

  const arrow = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    const arrowDown = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
  const heading = (kicker: string, title: React.ReactNode) => (
    <div className="ng-head">
      <span className="ng-kicker">{kicker}</span>
      <h2 className="ng-h2">{title}</h2>
    </div>
  )

  return (
    <div className="ng" style={{ overflowX: 'clip' }}>

      {/* HEADER */}
      <nav className="site-header">
        <div className="wide-container ng-bar">
          <div className="ng-bar__left">
            <a href={PATHS.home} data-edit="Logotipas" className="nav-logo" aria-label="Me Gusta — į pradžią">
              <img src={logo} alt="Me Gusta" width={81} height={52} />
            </a>
            <div className="nav-contacts" data-edit="Kontaktai">
              <a href={`mailto:${contacts.email}`} className="nav-contact"><Icon name="mail" size={16} />{contacts.email}</a>
              <a href={phoneHref(contacts.phone)} className="nav-contact"><Icon name="phone" size={16} />{contacts.phone}</a>
            </div>
          </div>
          <div className="nav-links ng-pills" data-edit="Meniu">
            {MENU_ITEMS.map(({ label, href }) => (
              <a key={label} href={href} aria-current={isCurrent(href) ? 'page' : undefined} className="ng-pill">{label}</a>
            ))}
          </div>
          <div className="ng-bar__right">
            <div className="nav-socials" data-edit="Soc. tinklai">
              {socials.map(s => socialLinks[s.key] ? (
                <a key={s.name} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name} className="ng-social"><Icon name={s.icon} size={16} /></a>
              ) : (
                <span key={s.name} aria-hidden="true" className="ng-social"><Icon name={s.icon} size={16} /></span>
              ))}
            </div>
            <a href={PATHS.registration} className="nav-cta ng-btn ng-btn--accent">Registruotis</a>
            <button type="button" className="menu-btn" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(o => !o)}>
              <span className="menu-btn__icon" aria-hidden="true"><i /><i /><i /></span>
              Meniu
            </button>
          </div>
        </div>

        {/* Hamburger menu (tablet and phone) */}
        <div id="site-menu" className="menu-panel" data-open={menuOpen} inert={!menuOpen} onClick={e => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false) }}>
          <div className="wide-container menu-panel__inner">
            <ul className="menu-list">
              {MENU_ITEMS.map(({ label, href }) => (
                <li key={label}>
                  {href
                    ? <a href={href} className="menu-link" aria-current={isCurrent(href) ? 'page' : undefined}>{label}</a>
                    : <span className="menu-link menu-link--idle">{label}</span>}
                </li>
              ))}
            </ul>
            <a href={PATHS.registration} className="menu-cta ng-btn ng-btn--accent">Registruotis</a>
            <div className="menu-contacts">
              <a href={`mailto:${contacts.email}`} className="menu-contact"><Icon name="mail" size={16} />{contacts.email}</a>
              <a href={phoneHref(contacts.phone)} className="menu-contact"><Icon name="phone" size={16} />{contacts.phone}</a>
            </div>
            <div className="menu-socials">
              {socials.map(s => socialLinks[s.key] ? (
                <a key={s.name} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name} className="ng-social"><Icon name={s.icon} size={18} /></a>
              ) : (
                <span key={s.name} aria-hidden="true" className="ng-social"><Icon name={s.icon} size={18} /></span>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {page === 'registracija' ? <Registration route={route} />
        : page === 'tvarkarastis' ? <Timetable />
        : page === 'naujienos' ? <News pageNum={route.pageNum} />
        : page === 'kalendorius' ? <Calendar />
        : page === 'kontaktai' ? <ContactsPage />
        : page === 'event' ? <EventPage slug={route.slug} />
        : page === 'post' ? <PostPage slug={route.slug} />
        : page === 'notfound' ? <NotFound />
        : (<>
      {/* HERO */}
      <section id="hero" className="ng-wrap ng-hero">
        <div className="ng-hero__text">
          <div data-edit="Hero: Kaune nuo 2006" className="ng-chips"><span>{hero.kicker}</span></div>
          <h1 data-edit="Hero: antraštė" className="ng-h1">
            {hero.line1}<br />
            <span className="ng-mark">{hero.line2}</span>
            {hero.line3 && <><br />{hero.line3}</>}
          </h1>
          <p data-edit="Hero: aprašymas" className="ng-lead">{hero.text}</p>
          <div data-edit="Hero: mygtukai" className="ng-actions hero-btns">
            <a href={PATHS.registration} className="ng-btn ng-btn--dark hero-btn">Registruokis {arrow}</a>
            <a href="#stiliai" className="ng-btn ng-btn--ghost hero-btn">{hero.primaryCta.replace(/\s*→\s*$/, '')}{arrowDown}</a>
          </div>
        </div>
        <div className="ng-hero__photo">
          <div data-edit-photo className="ng-hero__img">
            <img src={heroImg.light.src} alt={heroImg.light.alt} fetchPriority="high" style={{ objectPosition: heroMobilePos }} />
          </div>
          <span className="ng-float ng-float--top">{cta.kicker}</span>
          <span className="ng-float ng-float--bottom"><i />{contacts.address}</span>
        </div>
      </section>

      {/* STATS */}
      <section aria-label="Studija skaičiais" className="ng-wrap ng-stats">
        {stats.items.map((stat, i) => (
          <div key={i} className={`ng-stat ng-stat--${i === 0 ? 'accent' : i === stats.items.length - 1 ? 'dark' : 'white'}`}>
            <span className="ng-stat__num"><Odometer value={stat.num} /></span>
            <span className="ng-stat__label">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* DANCE STYLE SELECTOR */}
      <section id="stiliai" className="ng-wrap ng-sec">
        <div className="ng-head-row">
          {heading(styles.kicker, <>{styles.title1}{styles.title2 && <><br />{styles.title2}</>}</>)}
          <div role="tablist" aria-label="Šokių stiliai" className="ng-tabs style-tabs">
            {styles.items.map((s, i) => (
              <button key={i} type="button" role="tab" aria-selected={current === s} className="ng-tab style-tab" onClick={() => { setPicked(true); setActiveStyle(i) }}>{s.name}</button>
            ))}
          </div>
        </div>
        <div className="ng-split">
          <div className="ng-card ng-card--photo">
            <StyleVideo key={activeStyle} src={current.image.src} alt={current.image.alt} name={current.name} autoPlay={picked} />
          </div>
          <div className="ng-card ng-card--info">
            <span className="ng-tag">{current.tagline}</span>
            <h3 className="ng-h3">{current.name}</h3>
            <p className="ng-text">{current.description}</p>
            <div className="ng-stack ng-stack--sm">
              <span className="ng-small">Lygiai</span>
              <div className="ng-levels">{current.levels.map((l, i) => <span key={i}>{l}</span>)}</div>
            </div>
            <div className="ng-card__foot">
              <a href={PATHS.registration} className="ng-btn ng-btn--dark">Registruokis {arrow}</a>
              <a href="#kainos" className="ng-link">{styles.button.replace(/\s*→\s*$/, '')}</a>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="tvarkarastis" className="ng-wrap ng-sec">
        <div className="ng-head-row">
          {heading(schedule.kicker, schedule.title)}
          <div role="tablist" aria-label="Savaitės dienos" className="ng-tabs day-tabs">
            {schedule.days.map((d, i) => (
              <button key={i} type="button" role="tab" aria-selected={scheduleDay === d} className="ng-tab day-tab" onClick={() => setActiveDay(i)}>{d.day}</button>
            ))}
          </div>
        </div>
        <div className="ng-table">
          <div className="ng-table__scroll">
            <div className="ng-row ng-row--head sched-head">
              {['Laikas', 'Stilius', 'Trukmė', 'Amžius'].map(h => <span key={h}>{h}</span>)}
            </div>
            {scheduleDay?.classes.map((cls, i) => (
              <div key={i} className="ng-row">
                <span className="ng-time">{cls.time.split(':')[0]}<span className="time-colon">:</span>{cls.time.split(':')[1]}</span>
                <span className="ng-style"><i />{cls.style}</span>
                <span className="ng-dur">{cls.duration}</span>
                <span className="ng-age">{cls.age}</span>
              </div>
            ))}
          </div>
        </div>
        {schedule.note && <div className="rich-note ng-note" dangerouslySetInnerHTML={{ __html: schedule.note }} />}
      </section>

      {/* PRICING */}
      <section id="kainos" className="ng-wrap ng-sec">
        <Pricing />
      </section>

      {/* TRAINERS */}
      <section id="treneriai" className="ng-wrap ng-sec">
        {heading(trainers.kicker, trainers.title)}
        <div className="ng-trainers">
          {trainers.items.map((t, ti) => (
            <article key={ti} className="ng-trainer">
              <div className="ng-trainer__img">
                <img src={t.image.src} alt={t.image.alt} loading="lazy" />
                {t.bio && <p className="ng-trainer__bio">{t.bio}</p>}
              </div>
              <div className="ng-trainer__info">
                <h3>{t.name}</h3>
                <span>{t.specialty} · {t.experience}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Reviews />

      {/* CTA */}
      <section id="registruokis" className="ng-wrap ng-sec">
        <div className="ng-cta">
          <div className="ng-stack">
            <span className="ng-tag ng-tag--dark"><i />{cta.kicker}</span>
            <h2 className="ng-h1 ng-h1--cta">{cta.line1}{cta.line2 && <><br />{cta.line2}</>}</h2>
            <div className="ng-cta__contacts">
              <a href={phoneHref(contacts.phone)}>{contacts.phone}</a>
              <a href={`mailto:${contacts.email}`}>{contacts.email}</a>
              <span>{contacts.address}</span>
            </div>
          </div>
          <div className="ng-cta__action">
            <a href={PATHS.registration} className="ng-btn ng-btn--dark ng-btn--xl">Registruokis {arrow}</a>
          </div>
        </div>
      </section>

      </>)}

      {/* FOOTER */}
      <footer id="kontaktai" className="ng-wrap ng-footer">
        <div className="footer-grid ng-footer__grid">
          <div className="footer-brand">
            <img src={logo} alt="Me Gusta" width={87} height={56} style={{ height: 56, width: 'auto', display: 'block', marginBottom: 20, filter: 'brightness(0)' }} />
            <p>{footer.text}</p>
          </div>
          <div>
            <p className="ng-footer__title">Stiliai</p>
            {styles.items.map((s, i) => <p key={i}><a href="/#stiliai" className="footer-link">{s.name}</a></p>)}
          </div>
          <div>
            <p className="ng-footer__title">Studija</p>
            {[
              { label: 'Treneriai', href: '/#treneriai' },
              { label: 'Tvarkaraštis', href: PATHS.timetable },
              { label: 'Kainos', href: '/#kainos' },
              { label: 'Naujienos', href: PATHS.news },
              { label: 'Kalendorius', href: PATHS.calendar },
              { label: 'Kontaktai', href: PATHS.contacts },
            ].map(({ label, href }) => <p key={label}><a href={href} className="footer-link">{label}</a></p>)}
          </div>
          <div className="footer-contacts">
            <p className="ng-footer__title">Kontaktai</p>
            <p>{contacts.address}</p>
            <p><a href={phoneHref(contacts.phone)} className="footer-link">{contacts.phone}</a></p>
            <p><a href={`mailto:${contacts.email}`} className="footer-link">{contacts.email}</a></p>
          </div>
        </div>
        <div className="ng-footer__bottom">
          <span>© {new Date().getFullYear()} Me Gusta. Visos teisės saugomos.</span>
          <div className="ng-footer__socials">
            {socials.map(s => socialLinks[s.key]
              ? <a key={s.key} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" className="footer-link">{s.name}</a>
              : <span key={s.key}>{s.name}</span>)}
          </div>
          {footer.tagline && <span>{footer.tagline}</span>}
        </div>
      </footer>

      <LayoutEditor />

    </div>
  )
}
