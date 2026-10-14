import { lazy, Suspense, useEffect, useState } from 'react'
import type React from 'react'
import logo from './assets/logo-megusta.webp'
import { HERO_PHOTO, heroPhotoStyle } from './heroPhoto'
import LayoutEditor from './editor/LayoutEditor'
import Odometer from './Odometer'
import { heroImages, inlineData, phoneHref, section } from './content'
import Registration from './Registration'
import Pricing from './Pricing'
import Timetable from './Timetable'
import News from './News'
import Calendar from './Calendar'
import EventPage from './EventPage'
import PostPage from './PostPage'
import NotFound from './NotFound'
import ThemeSwitch from './ThemeSwitch'
import { installLinkHandling, isAdminPage, PATHS, useRoute, type Page } from './router'
import { pageTitle } from './seo'

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

// Giant outlined word behind a section (decorative). Colours come from the theme tokens.
function Backdrop({ children, className = '', style }: { children: React.ReactNode; className?: string; style: React.CSSProperties }) {
  return <div className={`backdrop ${className}`} aria-hidden="true" style={style}>{children}</div>
}

const hoverPink = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = '#FFB3C6' },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = '#ccc' },
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
  const label = { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 3, color: 'var(--text-3, var(--text-2))', textTransform: 'uppercase' as const, margin: '0 0 10px' }
  const link = { color: 'var(--text)', textDecoration: 'none', fontSize: 20, fontWeight: 500 }
  return (
    <section className="has-backdrop" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)', minHeight: '70vh' }}>
      <Backdrop style={{ bottom: '-4%', right: '-4vw', fontSize: 'clamp(90px, 22vw, 300px)', textAlign: 'right' }}>Kontaktai</Backdrop>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>◆&nbsp;&nbsp;Susisiek</p>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 56px' }}>Kontaktai</h1>
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
      <Suspense fallback={<p style={{ font: "15px 'Outfit', sans-serif", color: 'var(--text-2)', padding: 32 }}>Kraunama…</p>}>
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

  useEffect(() => {
    // news posts and the news list set their own titles
    if (SITE_PAGES.has(page) && page !== 'naujienos') document.title = pageTitle(page)
    // after switching pages, open at the top, or at the #section the link asked for
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])
  const [activeStyle, setActiveStyle] = useState(0)
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

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: "'Outfit', sans-serif", overflowX: 'clip' }}>

      {/* NAV */}
      <nav className="site-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: '1px solid #262626',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05), 0 6px 16px rgba(0,0,0,0.45), 0 18px 36px -8px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(8,8,8,0.88)',
      }}>
        <div className="wide-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 88, gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href={PATHS.home} data-edit="Logotipas" className="nav-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label="Me Gusta — į pradžią">
              <img src={logo} alt="Me Gusta" width={81} height={52} style={{ height: 52, width: 'auto', display: 'block' }} />
            </a>
            <div className="nav-contacts" data-edit="Kontaktai" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`mailto:${contacts.email}`} className="nav-contact" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', textDecoration: 'none', fontSize: 15, fontWeight: 500, letterSpacing: 0.3, transition: 'color 0.2s' }} {...hoverPink}>
                <span style={{ color: '#FFB3C6' }}><Icon name="mail" size={16} /></span>
                {contacts.email}
              </a>
              <a href={phoneHref(contacts.phone)} className="nav-contact" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ccc', textDecoration: 'none', fontSize: 15, fontWeight: 500, letterSpacing: 0.3, transition: 'color 0.2s' }} {...hoverPink}>
                <span style={{ color: '#FFB3C6' }}><Icon name="phone" size={16} /></span>
                {contacts.phone}
              </a>
            </div>
            <span className="nav-socials" aria-hidden="true" style={{ width: 1, height: 40, backgroundColor: '#2a2a2a' }} />
            <div className="nav-socials" data-edit="Soc. tinklai" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 16px)', gap: 10 }}>
              {socials.map(s => socialLinks[s.key] ? (
                <a key={s.name} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name} style={{ color: '#ccc', display: 'flex', transition: 'color 0.2s' }} {...hoverPink}>
                  <Icon name={s.icon} size={16} />
                </a>
              ) : (
                <span key={s.name} aria-hidden="true" style={{ color: '#ccc', display: 'flex' }}><Icon name={s.icon} size={16} /></span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="nav-links" data-edit="Meniu">
              {MENU_ITEMS.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-current={isCurrent(href) ? 'page' : undefined}
                  style={{ color: '#e6e6e6', textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', transition: 'color 0.2s', cursor: href ? 'pointer' : 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FFB3C6')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#e6e6e6')}
                >
                  {label}
                </a>
              ))}
              <a
                href={PATHS.registration}
                style={{
                  backgroundColor: '#FFB3C6', color: '#080808', textDecoration: 'none',
                  padding: '9px 22px', fontWeight: 700, fontSize: 13.2, letterSpacing: 1.65,
                  textTransform: 'uppercase', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFB3C6'; }}
              >
                Registruotis
              </a>
            </div>
            <div className="nav-theme"><ThemeSwitch /></div>
            <button type="button" className="menu-btn" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(o => !o)}>
              <span className="menu-btn__icon" aria-hidden="true"><i /><i /><i /></span>
              Meniu
            </button>
          </div>
        </div>

        {/* Hamburger menu (tablet and phone): theme switch first, then the links */}
        <div id="site-menu" className="menu-panel" data-open={menuOpen} inert={!menuOpen} onClick={e => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false) }}>
          <div className="wide-container menu-panel__inner">
            <div className="menu-theme">
              <span>Tema</span>
              <ThemeSwitch />
            </div>
            <ul className="menu-list">
              {MENU_ITEMS.map(({ label, href }) => (
                <li key={label}>
                  {href
                    ? <a href={href} className="menu-link" aria-current={isCurrent(href) ? 'page' : undefined}>{label}</a>
                    : <span className="menu-link menu-link--idle">{label}</span>}
                </li>
              ))}
            </ul>
            <a href={PATHS.registration} className="menu-cta">Registruotis</a>
            <div className="menu-contacts">
              <a href={`mailto:${contacts.email}`} className="menu-contact"><span style={{ color: '#FFB3C6' }}><Icon name="mail" size={16} /></span>{contacts.email}</a>
              <a href={phoneHref(contacts.phone)} className="menu-contact"><span style={{ color: '#FFB3C6' }}><Icon name="phone" size={16} /></span>{contacts.phone}</a>
            </div>
            <div className="menu-socials">
              {socials.map(s => socialLinks[s.key] ? (
                <a key={s.name} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}>
                  <Icon name={s.icon} size={18} />
                </a>
              ) : (
                <span key={s.name} aria-hidden="true" style={{ display: 'flex' }}><Icon name={s.icon} size={18} /></span>
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
      <section id="hero" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* bg image */}
        <div
          data-edit-photo className="hero-photo hero-photo-in" aria-hidden="true"
          style={{ position: 'absolute', inset: 0, ...heroPhotoStyle(heroFocus), '--hero-img-dark': `url(${JSON.stringify(heroImg.dark.src)})`, '--hero-img-light': `url(${JSON.stringify(heroImg.light.src)})`, '--hero-mobile-pos': heroMobilePos } as React.CSSProperties}
        />
        {/* gradient overlay */}
        <div className="hero-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(100deg, rgb(var(--bg-rgb)) 30%, rgba(var(--bg-rgb), 0.6) 50%, transparent 75%)',
        }} aria-hidden="true" />
        {/* accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', backgroundColor: '#FFB3C6' }} aria-hidden="true" />

        <div className="hero-content" style={{ position: 'relative', paddingTop: 144, paddingBottom: 80, width: '100%' }}>
          <div style={{ maxWidth: 720 }}>
            <p data-edit="Hero: Kaunas · Nuo 2006" className="hero-in hero-in-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 5, color: 'var(--pink-text)', marginBottom: 24, textTransform: 'uppercase' }}>
              ◆&nbsp;&nbsp;{hero.kicker}
            </p>
            <h1 data-edit="Hero: antraštė" style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 'clamp(72px, 10vw, 140px)',
              lineHeight: 0.92, textTransform: 'uppercase',
              color: 'var(--text)', margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}>
              <span className="hero-in hero-in-2">{hero.line1}</span><br />
              <span className="hero-in hero-in-3" style={{ color: 'var(--pink-text)', WebkitTextStroke: '0px' }}><span className="hero-shake">{hero.line2}</span></span>
              {hero.line3 && <><br /><span className="hero-in hero-in-4">{hero.line3}</span></>}
            </h1>
            <p data-edit="Hero: aprašymas" className="hero-in hero-in-5" style={{ fontSize: 18, color: 'var(--c-aaaaaa)', lineHeight: 1.6, maxWidth: 480, marginBottom: 48, fontWeight: 300 }}>
              {hero.text}
            </p>
            <div data-edit="Hero: mygtukai" className="hero-in hero-in-6 hero-btns" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a
                href="#stiliai"
                className="hero-btn"
                style={{
                  backgroundColor: '#FFB3C6', color: '#080808',
                  padding: '16px 40px', fontWeight: 800, fontSize: 14,
                  letterSpacing: 2, textTransform: 'uppercase',
                  textDecoration: 'none', display: 'inline-block',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--btn-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFB3C6'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {hero.primaryCta}
              </a>
              <a
                href="#tvarkarastis"
                className="hero-btn"
                style={{
                  border: '1px solid var(--line-strong)', color: 'var(--text)',
                  padding: '16px 40px', fontWeight: 600, fontSize: 14,
                  letterSpacing: 2, textTransform: 'uppercase',
                  textDecoration: 'none', display: 'inline-block',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFB3C6'; e.currentTarget.style.color = 'var(--pink-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--text)'; }}
              >
                {hero.secondaryCta}
              </a>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div data-edit="Slinkti" className="hero-fade-in" style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 3, color: 'var(--c-9a9a9a)', textTransform: 'uppercase' }}>Slinkti</span>
          <div style={{ width: 1, height: 48, backgroundColor: 'var(--c-555555)', position: 'relative', overflow: 'hidden' }}>
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
          {stats.items.map((stat, i) => (
            <div
              key={i}
              style={{
                padding: '40px 24px',
                borderRight: i < stats.items.length - 1 ? '1px solid rgba(0,0,0,0.12)' : 'none',
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
      <section id="stiliai" className="has-backdrop" style={{ padding: '120px 0', backgroundColor: 'var(--bg)' }}>
        <Backdrop style={{ top: '6%', right: '-7vw', fontSize: 'clamp(84px, 18vw, 250px)', textAlign: 'right' }}>Gatvės<br />šokiai</Backdrop>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;{styles.kicker}
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
              {styles.title1}{styles.title2 && <><br /><span style={{ color: 'var(--pink-text)' }}>{styles.title2}</span></>}
            </h2>
          </div>

          {/* Tab row */}
          <div role="tablist" aria-label="Šokių stiliai" className="style-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 0, flexWrap: 'wrap' }}>
            {styles.items.map((s, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={current === s}
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
            border: '1px solid var(--line)', borderTop: 'none',
          }}>
            {/* Image */}
            <div style={{ position: 'relative', overflow: 'hidden', minHeight: 480, backgroundColor: 'var(--surface-2)' }}>
              <img
                src={current.image.src}
                alt={current.image.alt}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  position: 'absolute', inset: 0,
                  transition: 'opacity 0.4s',
                }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #FFB3C622 0%, transparent 60%)',
              }} />
              <div style={{
                position: 'absolute', bottom: 24, left: 24,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 'clamp(36px, 4vw, 56px)',
                color: '#FFB3C6', textTransform: 'uppercase', lineHeight: 1,
                letterSpacing: 1,
              }}>
                {current.name}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '56px 48px', backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, letterSpacing: 3, color: 'var(--pink-text)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 20 }}>
                  {current.tagline}
                </p>
                <p style={{ fontSize: 17, color: 'var(--c-cccccc)', lineHeight: 1.75, fontWeight: 300, marginBottom: 40 }}>
                  {current.description}
                </p>
                <div style={{ marginBottom: 40 }}>
                  <p style={{ fontSize: 11, letterSpacing: 3, color: 'var(--c-555555)', textTransform: 'uppercase', marginBottom: 12 }}>Lygiai</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {current.levels.map((l, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '6px 16px', fontSize: 12, fontWeight: 600,
                          letterSpacing: 1.5, textTransform: 'uppercase',
                          border: '1px solid color-mix(in srgb, var(--pink-text) 27%, transparent)',
                          color: 'var(--pink-text)',
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
                  backgroundColor: '#FFB3C6', color: '#080808',
                  fontWeight: 800, fontSize: 13, letterSpacing: 2,
                  textTransform: 'uppercase', textDecoration: 'none',
                  alignSelf: 'flex-start', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {styles.button}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="tvarkarastis" className="has-backdrop" style={{ padding: '120px 0', backgroundColor: 'var(--bg-alt)', borderTop: '1px solid var(--c-111111)' }}>
        <Backdrop style={{ bottom: '-3%', left: '-3vw', fontSize: 'clamp(92px, 22vw, 300px)' }}>Breikas</Backdrop>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;{schedule.kicker}
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
              {schedule.title}
            </h2>
          </div>

          {/* Day tabs */}
          <div role="tablist" aria-label="Savaitės dienos" className="day-tabs" style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
            {schedule.days.map((d, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={scheduleDay === d}
                className="day-tab"
                onClick={() => setActiveDay(i)}
                style={{
                  padding: '12px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                <span>{d.day}</span>
              </button>
            ))}
          </div>

          {/* Classes for active day */}
          <div style={{ border: '1px solid var(--line)' }}>
            <div className="sched-head" style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 110px 110px',
              padding: '12px 24px',
              borderBottom: '1px solid var(--line)',
              backgroundColor: 'var(--surface)',
            }}>
              {['Laikas', 'Stilius', 'Trukmė', 'Amžius'].map(h => (
                <span key={h} style={{ fontSize: 10, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>{h}</span>
              ))}
            </div>
            {scheduleDay?.classes.map((cls, i) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 110px 110px',
                  padding: '20px 24px',
                  borderBottom: i < scheduleDay.classes.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  alignItems: 'center',
                  // every second row slightly lighter for easier reading across
                  backgroundColor: i % 2 === 1 ? 'var(--zebra)' : 'transparent',
                }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: 'var(--pink-text)', letterSpacing: 1 }}>
                  {cls.time.split(':')[0]}<span className="time-colon">:</span>{cls.time.split(':')[1]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--pink-text)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{cls.style}</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 400 }}>{cls.duration}</span>
                <span style={{
                  fontSize: 11, letterSpacing: 1.5, fontWeight: 600,
                  color: 'var(--pink-text)', textTransform: 'uppercase',
                  // equal space on every side; the right side is 1.5px less to
                  // offset the letter-spacing after the last character
                  padding: '10px 8.5px 10px 10px', lineHeight: 1, border: '1px solid color-mix(in srgb, var(--pink-text) 40%, transparent)',
                  display: 'inline-block', justifySelf: 'start',
                }}>
                  {cls.age}
                </span>
              </div>
            ))}
          </div>

          {schedule.note && (
            <div className="rich-note" style={{ marginTop: 20, fontSize: 13, color: 'var(--c-9a9a9a)', fontWeight: 400 }} dangerouslySetInnerHTML={{ __html: schedule.note }} />
          )}
        </div>
      </section>

      {/* PRICING */}
      <section id="kainos" className="has-backdrop" style={{ padding: '120px 0', backgroundColor: 'var(--bg)', borderTop: '1px solid var(--c-111111)' }}>
        <Backdrop className="backdrop--pink" style={{ top: '5%', right: '-6vw', fontSize: 'clamp(88px, 19.5vw, 270px)', textAlign: 'right' }}>Pop<br />dance</Backdrop>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <Pricing />
        </div>
      </section>

      {/* TRAINERS */}
      <section id="treneriai" className="has-backdrop" style={{ padding: '120px 0', backgroundColor: 'var(--bg-alt)', borderTop: '1px solid var(--c-111111)' }}>
        <Backdrop style={{ top: '4%', left: '-5vw', fontSize: 'clamp(84px, 18vw, 250px)' }}>Lady<br />class</Backdrop>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
              ◆&nbsp;&nbsp;{trainers.kicker}
            </p>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
              {trainers.title}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
            {trainers.items.map((t, ti) => (
              <div
                key={ti}
                style={{
                  position: 'relative', overflow: 'hidden',
                  backgroundColor: 'var(--surface-2)',
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
                    src={t.image.src}
                    alt={t.image.alt}
                    loading="lazy"
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
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: 'var(--text)', margin: '0 0 4px', letterSpacing: 0.5 }}>
                    {t.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: t.color === '#FFB3C6' ? 'var(--pink-text)' : t.color, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{t.specialty}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-555555)', fontWeight: 500, letterSpacing: 1 }}>{t.experience}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section data-reveal className="has-backdrop" style={{ backgroundColor: '#FFB3C6', padding: '80px 24px', textAlign: 'center' }}>
        <Backdrop className="backdrop--cta" style={{ top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', fontSize: 'clamp(190px, 40vw, 520px)', textAlign: 'center' }}>Šok</Backdrop>
        <p className="reveal reveal-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: '#333', textTransform: 'uppercase', marginBottom: 16 }}>
          <span className="cta-shake">◆&nbsp;&nbsp;{cta.kicker}</span>
        </p>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 7vw, 100px)', textTransform: 'uppercase', color: '#080808', lineHeight: 0.95, margin: '0 0 40px', letterSpacing: '-0.01em' }}>
          <span className="reveal reveal-2" style={{ display: 'inline-block' }}>{cta.line1}</span>
          {cta.line2 && <><br /><span className="reveal reveal-3" style={{ display: 'inline-block' }}>{cta.line2}</span></>}
        </h2>
        <div className="reveal reveal-4">
        <a
          href={PATHS.registration}
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
          {cta.button}
        </a>
        </div>
      </section>

      </>)}

      {/* FOOTER */}
      <footer id="kontaktai" style={{ backgroundColor: '#050505', borderTop: '1px solid #1c1c1c', padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div className="footer-brand">
              <img src={logo} alt="Me Gusta" width={87} height={56} style={{ height: 56, width: 'auto', display: 'block', marginBottom: 20 }} />
              <p style={{ fontSize: 14, color: '#8c8c8c', lineHeight: 1.7, maxWidth: 260 }}>
                {footer.text}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#6e6e6e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Stiliai</p>
              {styles.items.map((s, i) => (
                <p key={i} style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>{s.name}</p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#6e6e6e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Studija</p>
              {[
                { label: 'Apie mus' },
                { label: 'Treneriai', href: '/#treneriai' },
                { label: 'Tvarkaraštis', href: PATHS.timetable },
                { label: 'Kainos', href: '/#kainos' },
                { label: 'Naujienos', href: PATHS.news },
                { label: 'Kalendorius', href: PATHS.calendar },
                { label: 'Kontaktai', href: PATHS.contacts },
              ].map(({ label, href }: { label: string; href?: string }) => (
                <p key={label} style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>
                  {href ? <a href={href} className="footer-link">{label}</a> : label}
                </p>
              ))}
            </div>
            <div className="footer-contacts">
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#6e6e6e', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>Kontaktai</p>
              <p style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>{contacts.address}</p>
              <p style={{ fontSize: 14, marginBottom: 8 }}><a href={phoneHref(contacts.phone)} style={{ color: '#8c8c8c', textDecoration: 'none' }}>{contacts.phone}</a></p>
              <p style={{ fontSize: 14, marginBottom: 16 }}><a href={`mailto:${contacts.email}`} style={{ color: '#8c8c8c', textDecoration: 'none' }}>{contacts.email}</a></p>
              <div style={{ display: 'flex', gap: 12 }}>
                {socials.map(s => socialLinks[s.key]
                  ? <a key={s.key} href={socialLinks[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="footer-social">{s.short}</a>
                  : <span key={s.key} aria-hidden="true" className="footer-social">{s.short}</span>)}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1c1c1c', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 12, color: '#6e6e6e' }}>© {new Date().getFullYear()} Me Gusta. Visos teisės saugomos.</span>
            {footer.tagline && <span style={{ fontSize: 12, color: '#6e6e6e' }}>{footer.tagline}</span>}
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
          .hero-photo { background-position: 0 0, var(--hero-mobile-pos, 75% 50%) !important; }
        }
        /* Giant outlined words behind sections (decorative); pale strokes in light, faint in dark */
        .has-backdrop { position: relative; overflow: hidden; isolation: isolate; }
        .has-backdrop > *:not(.backdrop) { position: relative; z-index: 1; }
        .backdrop {
          position: absolute; z-index: 0; pointer-events: none; user-select: none;
          font-family: 'Barlow Condensed', sans-serif; font-weight: 900; text-transform: uppercase; line-height: 0.8;
          white-space: nowrap; letter-spacing: 0.01em; color: transparent; -webkit-text-stroke: 2px var(--outline);
        }
        .backdrop--pink { -webkit-text-stroke-color: var(--outline-pink); }
        .backdrop--cta { -webkit-text-stroke: 3px rgba(255,255,255,0.8); opacity: 0.4; }
        @media (max-width: 700px) { .backdrop { -webkit-text-stroke-width: 1.5px; } .backdrop--cta { -webkit-text-stroke-width: 2px; } }
        .rich-note p { margin: 0; }
        .rich-note a { color: var(--pink-text); text-decoration: underline; text-underline-offset: 3px; }
        .footer-link { color: #8c8c8c; text-decoration: none; transition: color 0.2s; }
        .footer-link:hover { color: #FFB3C6; }
        .footer-social {
          width: 36px; height: 36px; border: 1px solid #333; display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: #8c8c8c; letter-spacing: 0.5px; text-decoration: none; transition: color 0.2s, border-color 0.2s;
        }
        .footer-social:hover { color: #FFB3C6; border-color: #FFB3C6; }
        @media (max-width: 640px) {
          .nav-socials { display: none !important; }
          nav .wide-container > div:first-child { gap: 16px !important; }
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
        .style-tab { color: var(--c-707070); transition: color 180ms cubic-bezier(0.23, 1, 0.32, 1); }
        .style-tab:hover, .style-tab:focus-visible { color: var(--c-b0b0b0); }
        .style-tab[aria-selected="true"] { color: var(--pink-text); }
        .style-tab::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px;
          background: #FFB3C6; transform: scaleX(0); transform-origin: center;
          transition: transform 260ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .style-tab:hover::after, .style-tab:focus-visible::after, .style-tab[aria-selected="true"]::after { transform: scaleX(1); }
        /* Day tabs: hover fills the tab with pink from left to right, like the active one. */
        .day-tab {
          position: relative; overflow: hidden;
          background: var(--surface-2); border: 1px solid var(--c-1e1e1e); color: var(--text-3);
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
        /* Scroll-in intro (CTA banner): rise + fade in reading order once in view. */
        .reveal { opacity: 0; transform: translateY(32px); }
        [data-reveal].in-view .reveal { animation: heroIn 900ms cubic-bezier(0.23, 1, 0.32, 1) both; }
        [data-reveal].in-view .reveal-1 { animation-delay: 0ms; }
        [data-reveal].in-view .reveal-2 { animation-delay: 120ms; }
        [data-reveal].in-view .reveal-3 { animation-delay: 240ms; }
        [data-reveal].in-view .reveal-4 { animation-delay: 400ms; }
        /* "Pirmoji treniruotė nemokama": shake 0.5s after it appears, then every 2s. */
        .cta-shake { display: inline-block; }
        [data-reveal].in-view .cta-shake { animation: heroShake 2s ease-in-out 0.5s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; }
          [data-reveal].in-view .reveal, [data-reveal].in-view .cta-shake { animation: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-photo-in, .hero-in, .hero-fade-in, .hero-shake { animation: none; }
          .style-tab::after { transition: none; }
        }
        @keyframes scrollLine {
          0% { top: -40%; }
          100% { top: 140%; }
        }
        @media (max-width: 900px) {
          .hero-overlay {
            background: linear-gradient(180deg, rgba(var(--bg-rgb), 0.55) 0%, rgba(var(--bg-rgb), 0.8) 60%, rgba(var(--bg-rgb), 0.9) 100%) !important;
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

        }
        @media (max-width: 600px) {
          section > div > div[style*="grid-template-columns: repeat(4"],
          section > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: repeat(2"], .pricing-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
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
          .sched-head > span {
            letter-spacing: 1px !important;
          }
        }

        /* ===== Tablet and phone ===== */

        /* Hamburger menu: below 1280px the full menu no longer fits the header. */
        .menu-btn { display: none; align-items: center; gap: 9px; padding: 9px 14px; background: transparent; color: #f0f0f0; border: 1px solid #333; cursor: pointer; font: 700 12px 'Outfit', sans-serif; letter-spacing: 1.5px; text-transform: uppercase; transition: border-color 0.2s, color 0.2s; }
        .menu-btn:hover, .menu-btn[aria-expanded="true"] { border-color: #FFB3C6; color: #FFB3C6; }
        .menu-btn:focus-visible { outline: 2px solid #FFB3C6; outline-offset: 3px; }
        .menu-btn__icon { position: relative; display: block; width: 16px; height: 12px; }
        .menu-btn__icon i { position: absolute; left: 0; right: 0; height: 2px; border-radius: 1px; background: currentColor; transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), top 0.25s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.15s; }
        .menu-btn__icon i:nth-child(1) { top: 0; }
        .menu-btn__icon i:nth-child(2) { top: 5px; }
        .menu-btn__icon i:nth-child(3) { top: 10px; }
        .menu-btn[aria-expanded="true"] .menu-btn__icon i:nth-child(1) { top: 5px; transform: rotate(45deg); }
        .menu-btn[aria-expanded="true"] .menu-btn__icon i:nth-child(2) { opacity: 0; }
        .menu-btn[aria-expanded="true"] .menu-btn__icon i:nth-child(3) { top: 5px; transform: rotate(-45deg); }
        .menu-panel { display: none; }
        .menu-theme { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; border-bottom: 1px solid #1a1a1a; font: 700 12px 'Outfit', sans-serif; letter-spacing: 1.5px; text-transform: uppercase; color: #8a8a8a; }
        .menu-list { list-style: none; margin: 0; padding: 0; }
        .menu-link { display: flex; align-items: center; min-height: 54px; border-bottom: 1px solid #1a1a1a; color: #d0d0d0; text-decoration: none; font: 600 15px 'Outfit', sans-serif; letter-spacing: 2px; text-transform: uppercase; transition: color 0.2s; }
        a.menu-link:hover, a.menu-link[aria-current="page"] { color: #FFB3C6; }
        .menu-link--idle { color: #8a8a8a; cursor: default; }
        .menu-cta { display: block; margin-top: 22px; padding: 16px 24px; text-align: center; background: #FFB3C6; color: #080808; text-decoration: none; font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; }
        .menu-contacts { display: none; flex-direction: column; gap: 10px; margin-top: 22px; }
        .menu-contact { display: flex; align-items: center; gap: 10px; color: #d0d0d0; text-decoration: none; font-size: 14px; }
        .menu-socials { display: none; gap: 18px; margin-top: 22px; }
        .menu-socials a { display: flex; color: #c8c8c8; }
        .menu-socials a:hover { color: #FFB3C6; }
        @media (max-width: 1279px) {
          .nav-links, .nav-theme { display: none !important; }
          .menu-btn { display: inline-flex; }
          .menu-panel {
            display: block; position: absolute; top: 100%; left: 0; right: 0;
            background: #0a0a0a; border-bottom: 1px solid #1a1a1a; box-shadow: 0 24px 40px rgba(0, 0, 0, 0.55);
            max-height: calc(100vh - 88px); max-height: calc(100dvh - 88px); overflow-y: auto;
            opacity: 0; transform: translateY(-8px); visibility: hidden;
            transition: opacity 0.2s, transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), visibility 0s linear 0.25s;
          }
          .menu-panel[data-open="true"] { opacity: 1; transform: none; visibility: visible; transition-delay: 0s; }
          .menu-panel__inner { padding-bottom: 28px; }
          /* hero: the scroll hint needs its own room under the buttons */
          .hero-content { padding-bottom: 150px !important; }
          /* hero buttons: equal width */
          .hero-btns { display: inline-grid !important; grid-auto-flow: column; grid-auto-columns: 1fr; }
          .hero-btn { text-align: center; }
        }
        @media (max-width: 640px) {
          .menu-socials { display: flex; }
        }
        @media (max-width: 560px) {
          .hero-btns { display: grid !important; grid-auto-flow: row; grid-template-columns: 1fr; width: 100%; max-width: 340px; gap: 12px !important; }
        }
        /* Tabs: 2 x 2 with equal widths */
        @media (max-width: 700px) {
          .style-tabs { display: grid !important; grid-template-columns: 1fr 1fr; border-bottom: none !important; }
          .style-tab { padding: 16px 8px !important; text-align: center; box-shadow: inset 0 -1px 0 var(--line); }
          .day-tabs { display: grid !important; grid-template-columns: 1fr 1fr; gap: 4px !important; }
          .day-tab { padding: 14px 8px !important; text-align: center; }
        }
        /* Footer: Stiliai and Studija side by side, Kontaktai below them */
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 36px 24px !important; }
          .footer-brand, .footer-contacts { grid-column: 1 / -1; }
        }
        /* Small phones: a tighter header */
        @media (max-width: 420px) {
          .site-header .wide-container { gap: 12px !important; }
          .site-header .nav-logo img { height: 40px !important; }
          .nav-contacts { gap: 4px !important; }
          .nav-contact { font-size: 12px !important; gap: 6px !important; }
          .menu-btn { padding: 8px 12px; gap: 7px; }
          .day-tab { letter-spacing: 1px !important; font-size: 13px !important; }
        }
        @media (max-width: 340px) {
          .nav-contacts { display: none !important; }
          .menu-contacts { display: flex; }
        }
        @media (prefers-reduced-motion: reduce) {
          .menu-panel, .menu-btn__icon i { transition: none; }
        }
      `}</style>
    </div>
  )
}
