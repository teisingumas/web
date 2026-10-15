import { cloneElement, useEffect, useState } from 'react'
import type React from 'react'
import { phoneHref, section } from './content'
import { showRegistrationTab, TAB_EVENT, type RegTab, type Route } from './router'
import Pricing from './Pricing'

// Where submissions are POSTed as JSON (e.g. a Formspree / Web3Forms / own API URL).
// Until it is set, the form validates and shows the thank-you screen but sends nothing.
const ENDPOINT = import.meta.env.VITE_REGISTRATION_ENDPOINT as string | undefined

const PINK = '#FFB3C6'
// pink for text and small marks: darker in the light theme so it reads on white
const PINK_TEXT = 'var(--pink-text)'
const ERROR = '#ff8a8a'
const display = "'Archivo', sans-serif"
const mapsUrl = (address: string) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address)

// Horizontal three-stripe flags (Poland has two), drawn instead of emoji, which Windows does not render.
const COUNTRIES = [
  { code: 'LT', dial: '+370', digits: [8, 8], stripes: ['#FDB913', '#006A44', '#C1272D'] },
  { code: 'LV', dial: '+371', digits: [8, 8], stripes: ['#9E3039', '#FFFFFF', '#9E3039'] },
  { code: 'EE', dial: '+372', digits: [7, 8], stripes: ['#0072CE', '#000000', '#FFFFFF'] },
  { code: 'PL', dial: '+48', digits: [9, 9], stripes: ['#FFFFFF', '#DC143C'] },
  { code: 'DE', dial: '+49', digits: [10, 11], stripes: ['#000000', '#DD0000', '#FFCE00'] },
] as const

type Phone = { country: (typeof COUNTRIES)[number]['code']; number: string }

type Form = {
  email: string
  birthDate: string
  dancer: string
  styles: string[]
  phone: Phone
  parentPhone: Phone
  district: string
  experience: string
  source: string
  consent: boolean
}

const EMPTY: Form = {
  email: '', birthDate: '', dancer: '', styles: [],
  phone: { country: 'LT', number: '' }, parentPhone: { country: 'LT', number: '' },
  district: '', experience: '', source: '', consent: false,
}

// Digits only, shown as YYYY.MM.DD while typing.
function formatBirthDate(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('.')
}

function birthDateError(value: string) {
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(value)
  if (!m) return 'Įrašykite datą skaičiais, pvz. 2010.10.10.'
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return 'Tokios datos nėra. Patikrinkite mėnesį ir dieną.'
  if (date > new Date() || y < 1930) return 'Patikrinkite gimimo metus.'
  return undefined
}

function phoneError(p: Phone, required: boolean) {
  if (!p.number) return required ? 'Įrašykite telefono numerį.' : undefined
  const [min, max] = COUNTRIES.find(c => c.code === p.country)!.digits
  if (p.number.length < min || p.number.length > max) return `Numeris turi būti ${min === max ? min : `${min}–${max}`} skaitmenų be šalies kodo.`
  return undefined
}

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Įrašykite el. pašto adresą, pvz. vardas@pastas.com.'
  e.birthDate = birthDateError(f.birthDate)
  if (f.dancer.trim().split(/\s+/).length < 2) e.dancer = 'Įrašykite šokėjo vardą ir pavardę.'
  e.phone = phoneError(f.phone, true)
  e.parentPhone = phoneError(f.parentPhone, false)
  if (!f.district.trim()) e.district = 'Įrašykite mikrorajoną.'
  if (!f.source) e.source = 'Pasirinkite, iš kur sužinojote.'
  if (!f.consent) e.consent = 'Be sutikimo negalėsime užregistruoti.'
  for (const k of Object.keys(e) as (keyof Form)[]) if (!e[k]) delete e[k]
  return e
}

const fullPhone = (p: Phone) => (p.number ? `${COUNTRIES.find(c => c.code === p.country)!.dial} ${p.number}` : '')

// In-page tabs (no addresses of their own). Links inside the page switch tabs with
// showRegistrationTab(); navigating to /registracija opens the tab the link asked for.
const TABS = [
  { id: 'registracija', label: 'Registracija' },
  { id: 'informacija', label: 'Informacija' },
  { id: 'kainos', label: 'Kainos' },
] as const

export default function Registration({ route }: { route: Route }) {
  const [tab, setTab] = useState<RegTab>(route.tab)
  const reg = section('registration')
  const contacts = section('global.contacts')
  const phoneLink = phoneHref(contacts.phone)

  // a new navigation (e.g. "Rinktis Standart" on the Kainos tab) opens the tab it asked for
  useEffect(() => {
    setTab(route.tab)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route.seq, route.tab])

  useEffect(() => {
    const onTab = (e: Event) => {
      setTab((e as CustomEvent<RegTab>).detail)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener(TAB_EVENT, onTab)
    return () => window.removeEventListener(TAB_EVENT, onTab)
  }, [])

  const [form, setForm] = useState<Form>(EMPTY)
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // the thank-you box replaces the form, so bring it into view under the fixed header
  useEffect(() => {
    if (status === 'sent') window.scrollTo(0, 0)
  }, [status])

  const errors = touched ? validate(form) : {}
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const errs = validate(form)
    if (Object.keys(errs).length) {
      document.getElementById(`reg-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    if (!ENDPOINT) {
      setStatus('sent')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, styles: form.styles.join(', '), phone: fullPhone(form.phone), parentPhone: fullPhone(form.parentPhone) }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="registracija" style={{ padding: '168px 0 120px', backgroundColor: 'var(--bg)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: PINK_TEXT, textTransform: 'uppercase', marginBottom: 12 }}>
            ◆&nbsp;&nbsp;{reg.kicker}
          </p>
          <h1 className="sr-only">Registracija</h1>
          <nav role="tablist" aria-label="Registracijos skiltys" className="page-tabs">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="page-tab" onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          {tab === 'registracija' && (
            <div className="reg-intro" style={{ marginTop: 24, fontSize: 17, color: 'var(--c-b0b0b0)', lineHeight: 1.6, maxWidth: 560, fontWeight: 300 }} dangerouslySetInnerHTML={{ __html: reg.intro }} />
          )}
          {tab === 'informacija' && (
            <p style={{ marginTop: 24, fontSize: 17, color: 'var(--c-b0b0b0)', lineHeight: 1.6, maxWidth: 560, fontWeight: 300 }}>
              {reg.infoIntro} Parašykite <a href={`mailto:${contacts.email}`} className="faq-link">{contacts.email}</a> arba skambinkite <a href={phoneLink} className="faq-link">{contacts.phone}</a>.
            </p>
          )}
        </div>

        {tab === 'kainos' ? <Pricing centered heading={false} /> : (
        <div className="reg-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 40, alignItems: 'start' }}>
          {tab === 'informacija' ? <Faq /> : status === 'sent' ? (
            <div role="status" style={{ border: `1px solid ${PINK}`, padding: '48px 40px', backgroundColor: 'var(--surface)' }}>
              <p style={{ fontFamily: display, fontWeight: 900, fontSize: 40, textTransform: 'uppercase', color: PINK_TEXT, margin: '0 0 16px' }}>Ačiū!</p>
              <p style={{ fontSize: 17, color: 'var(--c-d0d0d0)', lineHeight: 1.6, margin: '0 0 24px' }}>
                Registracija gauta: <b style={{ color: 'var(--text)' }}>{form.dancer}</b>.
                Artimiausiu metu informaciją apie pirmąją pamoką atsiųsime el. paštu {form.email}.
              </p>
              {!ENDPOINT && (
                <p style={{ fontSize: 13, color: 'var(--c-9a9a9a)', lineHeight: 1.6, margin: '0 0 24px', borderLeft: '1px solid var(--line-strong)', paddingLeft: 12 }}>
                  Peržiūros versija: forma dar neprijungta, todėl duomenys niekur neišsiųsti.
                </p>
              )}
              <button type="button" className="reg-btn reg-btn--ghost" onClick={() => { setForm(EMPTY); setTouched(false); setStatus('idle') }}>
                Registruoti dar vieną šokėją
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div className="reg-grid reg-grid--3">
                <Field id="reg-email" label="El. paštas" required error={errors.email}>
                  <input id="reg-email" className="reg-input" type="email" autoComplete="email" placeholder="vardas@pastas.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>
                <Field id="reg-birthDate" label="Šokėjo gimimo data" required error={errors.birthDate}>
                  <input
                    id="reg-birthDate" className="reg-input" inputMode="numeric" autoComplete="off" placeholder="2010.10.10" maxLength={10}
                    value={form.birthDate} onChange={e => set('birthDate', formatBirthDate(e.target.value))}
                  />
                </Field>
                <Field id="reg-dancer" label="Šokėjo vardas ir pavardė" required error={errors.dancer}>
                  <input id="reg-dancer" className="reg-input" autoComplete="off" placeholder="Vardenis Pavardenis" value={form.dancer} onChange={e => set('dancer', e.target.value)} />
                </Field>
              </div>

              <fieldset className="reg-fieldset">
                <legend className="reg-label">Pasirink norimą šokių stilių</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reg.styleOptions.map((s, i) => (
                    <label key={s} className="reg-check">
                      <input
                        id={i === 0 ? 'reg-styles' : undefined} type="checkbox" checked={form.styles.includes(s)}
                        onChange={e => set('styles', e.target.checked ? [...form.styles, s] : form.styles.filter(x => x !== s))}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="reg-grid">
                <PhoneField id="reg-phone" label="Šokėjo tel. numeris" required value={form.phone} error={errors.phone} onChange={v => set('phone', v)} />
                <PhoneField id="reg-parentPhone" label="Tėvų tel. numeris" value={form.parentPhone} error={errors.parentPhone} onChange={v => set('parentPhone', v)} />
              </div>

              <Field id="reg-district" label="Iš kokio mikrorajono esate?" required error={errors.district}>
                <input id="reg-district" className="reg-input" placeholder="Žaliakalnis" value={form.district} onChange={e => set('district', e.target.value)} />
              </Field>

              <Field id="reg-experience" label="Jei turite šokio patirties, pasidalinkite kur ir kiek laiko šokote?">
                <input id="reg-experience" className="reg-input" value={form.experience} onChange={e => set('experience', e.target.value)} />
              </Field>

              <fieldset className="reg-fieldset">
                <legend className="reg-label">Apie Me Gusta sužinojau<span className="reg-req"> *</span></legend>
                <div className="reg-grid" role="radiogroup" style={{ rowGap: 10 }}>
                  {reg.sourceOptions.map((s, i) => (
                    <label key={s} className="reg-check">
                      <input id={i === 0 ? 'reg-source' : undefined} type="radio" name="source" checked={form.source === s} onChange={() => set('source', s)} />
                      {s}
                    </label>
                  ))}
                </div>
                {errors.source && <span style={{ color: ERROR, fontSize: 13, marginTop: 8, display: 'block' }}>{errors.source}</span>}
              </fieldset>

              {reg.formNote && (
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, maxWidth: 640 }}>
                  {reg.formNote}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <label htmlFor="reg-consent" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, cursor: 'pointer' }}>
                  <input id="reg-consent" type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: PINK, flexShrink: 0 }} />
                  <span>
                    {reg.consent}
                    {errors.consent && <span style={{ display: 'block', color: ERROR, fontSize: 13, marginTop: 6 }}>{errors.consent}</span>}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <button type="submit" className="reg-btn" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Siunčiama…' : 'Registruotis →'}
                  </button>
                  {reg.freeNote && <span style={{ fontSize: 14, color: 'var(--c-9a9a9a)' }}>{reg.freeNote}</span>}
                </div>
                {status === 'error' && (
                  <p role="alert" style={{ color: ERROR, fontSize: 14, margin: 0 }}>
                    Nepavyko išsiųsti registracijos. Bandykite dar kartą arba parašykite {contacts.email}.
                  </p>
                )}
              </div>
            </form>
          )}

          <aside className="reg-aside" style={{ border: '1px solid var(--line)', backgroundColor: 'var(--surface)', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <p style={{ fontFamily: display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text)', margin: '0 0 16px' }}>Kas toliau</p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reg.steps.map((t, i) => (
                  <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: display, fontWeight: 900, fontSize: 20, color: PINK_TEXT, lineHeight: 1.2 }}>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
            {reg.hours.length > 0 && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
              <p style={{ fontSize: 11, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>Studijos darbo laikas</p>
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 20, rowGap: 8, margin: 0, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                {reg.hours.map(({ days, hours }, i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <dt style={{ color: PINK_TEXT, fontFamily: display, fontWeight: 800, fontSize: 17, letterSpacing: 1 }}>{days}</dt>
                    <dd style={{ margin: 0, color: 'var(--text)' }}>{hours}</dd>
                  </div>
                ))}
              </dl>
            </div>}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
              <p style={{ fontSize: 11, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Turite klausimų?</p>
              {/* Icons: Material Symbols "call", "mail", "location_on" (Google Fonts, Apache 2.0) */}
              <a href={phoneLink} className="reg-maps">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fill={PINK_TEXT} d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.98.98 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                </svg>
                {contacts.phone}
              </a>
              <a href={`mailto:${contacts.email}`} className="reg-maps">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fill={PINK_TEXT} d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                {contacts.email}
              </a>
              <a href={mapsUrl(contacts.address)} target="_blank" rel="noopener noreferrer" className="reg-maps" aria-label={`${contacts.address} (atidaryti Google Maps)`}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path fill={PINK_TEXT} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
                {contacts.address}
              </a>
            </div>
          </aside>
        </div>
        )}
      </div>

      <style>{`
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        /* Page tabs: the active one is heading-sized with a pink underline; the rest are smaller and light up on hover. */
        .page-tabs { display: flex; align-items: flex-end; flex-wrap: wrap; column-gap: 40px; row-gap: 8px; border-bottom: 1px solid var(--c-1f1f1f); }
        .page-tab {
          position: relative; padding: 0 0 12px; text-decoration: none; background: none; border: none; cursor: pointer;
          font-family: ${display}; font-weight: 900; text-transform: uppercase; line-height: 0.95;
          font-size: clamp(22px, 2.6vw, 36px); color: var(--c-6e6e6e);
          transition: font-size 320ms cubic-bezier(0.23, 1, 0.32, 1), color 200ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .page-tab:hover, .page-tab:focus-visible { color: ${PINK_TEXT}; }
        .page-tab[aria-selected="true"] { font-size: clamp(40px, 4.2vw, 60px); color: var(--text); }
        .page-tab::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: ${PINK};
          transform: scaleX(0); transform-origin: left center; transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .page-tab[aria-selected="true"]::after { transform: scaleX(1); }
        .page-tab:focus-visible { outline: none; }
        .reg-maps { display: inline-flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; transition: color 160ms; }
        .reg-maps:hover { color: ${PINK_TEXT}; }
        .reg-intro p { margin: 0; }
        .reg-intro strong { color: ${PINK_TEXT}; font-weight: 500; }
        .reg-intro a, .faq-a a { color: ${PINK_TEXT}; text-decoration: underline; text-underline-offset: 3px; }
        .faq-a a:hover { color: var(--c-ffffff); }
        .faq-a strong { color: var(--text); font-weight: 600; }
        .faq-a ul, .faq-a ol { margin: 0 0 12px; padding-left: 22px; color: var(--c-a8a8a8); font-size: 15px; line-height: 1.7; }
        .faq-link { color: ${PINK_TEXT}; text-decoration: underline; text-underline-offset: 3px; }
        .faq-link:hover { color: var(--c-ffffff); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 24px;
          background: none; border: none; cursor: pointer; text-align: left; padding: 22px 4px;
          font-family: 'Manrope', sans-serif; font-size: 17px; font-weight: 600; color: var(--text); line-height: 1.4;
        }
        .faq-q:hover { color: ${PINK_TEXT}; }
        .faq-q:focus-visible { outline: 2px solid ${PINK}; outline-offset: 2px; }
        .faq-plus { position: relative; width: 18px; height: 18px; flex-shrink: 0; transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1); }
        .faq-plus::before, .faq-plus::after { content: ''; position: absolute; left: 50%; top: 50%; background: ${PINK_TEXT}; transform: translate(-50%, -50%); }
        .faq-plus::before { width: 18px; height: 2px; }
        .faq-plus::after { width: 2px; height: 18px; }
        .faq-q[aria-expanded="true"] .faq-plus { transform: rotate(45deg); }
        .faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms cubic-bezier(0.23, 1, 0.32, 1); }
        .faq-a[data-open="true"] { grid-template-rows: 1fr; }
        .faq-a > div { overflow: hidden; }
        .faq-a p { margin: 0 0 12px; font-size: 15px; color: var(--c-a8a8a8); line-height: 1.7; max-width: 720px; }
        .faq-a > div > div { padding: 0 4px 14px; }
        @media (prefers-reduced-motion: reduce) {
          .page-tab, .page-tab::after, .faq-plus, .faq-a { transition: none; }
        }
        .reg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
        .reg-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .reg-fieldset { border: none; margin: 0; padding: 0; min-width: 0; }
        .reg-label { font-size: 14px; font-weight: 600; color: var(--c-d0d0d0); padding: 0; margin-bottom: 10px; }
        .reg-req { color: ${PINK_TEXT}; }
        .reg-input {
          width: 100%; min-height: 48px; padding: 0 14px;
          background: var(--surface); border: 1px solid var(--c-262626); color: var(--text);
          font-family: 'Manrope', sans-serif; font-size: 15px; border-radius: 0;
          color-scheme: var(--scheme); transition: border-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .reg-input::placeholder { color: var(--placeholder); }
        .reg-input:hover { border-color: var(--c-3a3a3a); }
        .reg-input:focus { outline: none; border-color: ${PINK}; }
        .reg-input[aria-invalid="true"] { border-color: ${ERROR}; }
        .reg-phone { display: flex; align-items: stretch; background: var(--surface); border: 1px solid var(--c-262626); transition: border-color 160ms; }
        .reg-phone:hover { border-color: var(--c-3a3a3a); }
        .reg-phone:focus-within { border-color: ${PINK}; }
        .reg-phone[data-invalid="true"] { border-color: ${ERROR}; }
        .reg-phone .reg-input { border: none; min-height: 46px; padding-left: 6px; }
        .reg-country { position: relative; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 14px; border-right: 1px solid var(--c-262626); color: var(--text); font-size: 15px; }
        .reg-country select { position: absolute; inset: 0; opacity: 0; cursor: pointer; color-scheme: var(--scheme); }
        .reg-check { display: flex; align-items: center; gap: 12px; font-size: 15px; color: var(--text-2); cursor: pointer; }
        .reg-check input, #reg-consent { width: 18px; height: 18px; margin: 0; accent-color: ${PINK}; color-scheme: var(--scheme); flex-shrink: 0; cursor: pointer; }
        .reg-check:hover { color: var(--text); }
        /* "Apie Me Gusta sužinojau" stays a single choice but looks like the style checkboxes. */
        .reg-check input[type="radio"] {
          appearance: none; -webkit-appearance: none; border-radius: 3px;
          border: 1px solid var(--c-6e6e6e); background: var(--line); display: inline-grid; place-content: center;
        }
        .reg-check input[type="radio"]:hover { border-color: var(--c-9a9a9a); }
        .reg-check input[type="radio"]:checked {
          border-color: ${PINK}; background: ${PINK} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='%23080808' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 14px no-repeat;
        }
        .reg-check input[type="radio"]:focus-visible { outline: 2px solid ${PINK}; outline-offset: 2px; }
        .reg-aside { position: sticky; top: 113px; }
        .reg-btn {
          background: ${PINK}; color: #080808; border: 1px solid ${PINK}; cursor: pointer;
          padding: 18px 44px; font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 14px;
          letter-spacing: 2px; text-transform: uppercase; transition: background-color 160ms, transform 160ms;
        }
        .reg-btn:hover { background: var(--btn-hover); transform: translateY(-2px); }
        .reg-btn:disabled { opacity: 0.6; cursor: wait; transform: none; }
        .reg-btn--ghost { background: transparent; color: ${PINK_TEXT}; }
        .reg-btn--ghost:hover { background: ${PINK}; color: #080808; }
        .reg-btn:focus-visible { outline: 2px solid ${PINK}; outline-offset: 3px; }
        @media (max-width: 1100px) { .reg-grid--3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 900px) {
          .reg-layout { grid-template-columns: 1fr !important; }
          .reg-aside { position: static; }
        }
        @media (max-width: 600px) { .reg-grid, .reg-grid--3 { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}

function Field({ id, label, required, error, children }: {
  id: string; label: string; required?: boolean; error?: string; children: React.ReactElement<{ 'aria-invalid'?: boolean; 'aria-describedby'?: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <label htmlFor={id} className="reg-label">
        {label}{required && <span className="reg-req"> *</span>}
      </label>
      {cloneElement(children, { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && <span id={`${id}-error`} style={{ color: ERROR, fontSize: 13, marginTop: 8 }}>{error}</span>}
    </div>
  )
}

function Flag({ stripes }: { stripes: readonly string[] }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', width: 22, height: 15, flexShrink: 0, outline: '1px solid rgba(255,255,255,0.15)' }}>
      {stripes.map((c, i) => <span key={i} style={{ flex: 1, backgroundColor: c }} />)}
    </span>
  )
}

// Digits only; drops a pasted country code (+370 / 00370) or the Lithuanian trunk 8.
function nationalDigits(raw: string, country: (typeof COUNTRIES)[number]) {
  let d = raw.replace(/\D/g, '')
  const dial = country.dial.slice(1)
  if (d.startsWith('00' + dial)) d = d.slice(2 + dial.length)
  else if (d.startsWith(dial) && d.length > country.digits[1]) d = d.slice(dial.length)
  else if (country.code === 'LT' && d.startsWith('8') && d.length === 9) d = d.slice(1)
  return d.slice(0, 11)
}

function PhoneField({ id, label, required, value, error, onChange }: {
  id: string; label: string; required?: boolean; value: Phone; error?: string; onChange: (v: Phone) => void
}) {
  const country = COUNTRIES.find(c => c.code === value.country)!
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <label htmlFor={id} className="reg-label">
        {label}{required && <span className="reg-req"> *</span>}
      </label>
      <div className="reg-phone" data-invalid={!!error}>
        <span className="reg-country">
          <Flag stripes={country.stripes} />
          <span aria-hidden="true" style={{ fontSize: 10, color: 'var(--c-9a9a9a)' }}>▼</span>
          <select
            aria-label={`${label}: šalies kodas`} value={value.country}
            onChange={e => onChange({ ...value, country: e.target.value as Phone['country'] })}
          >
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.dial}</option>)}
          </select>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, color: 'var(--text)', fontSize: 15 }}>{country.dial}</span>
        <input
          id={id} className="reg-input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="000 00000"
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          value={value.number} onChange={e => onChange({ ...value, number: nationalDigits(e.target.value, country) })}
        />
      </div>
      {error && <span id={`${id}-error`} style={{ color: ERROR, fontSize: 13, marginTop: 8 }}>{error}</span>}
    </div>
  )
}

function Faq() {
  const faq = section('registration.faq')
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  // "#kainos" links in the answers open the Kainos tab on this page.
  const onAnswerClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (a?.getAttribute('href') === '#kainos') {
      e.preventDefault()
      showRegistrationTab('kainos')
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56, minWidth: 0 }}>
      {faq.groups.map((group, gi) => (
        <section key={gi} aria-labelledby={`faq-g${gi}`}>
          <h2 id={`faq-g${gi}`} style={{ fontFamily: display, fontWeight: 900, fontSize: 30, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text)', margin: '0 0 8px' }}>
            {group.title}
          </h2>
          <div style={{ borderTop: '1px solid var(--line)' }}>
            {group.items.map((item, ii) => {
              const id = `faq-${gi}-${ii}`
              const isOpen = open.has(id)
              return (
                <div key={id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <button type="button" className="faq-q" aria-expanded={isOpen} aria-controls={`${id}-a`} id={`${id}-q`} onClick={() => toggle(id)}>
                    <span>{item.q}</span>
                    <span className="faq-plus" aria-hidden="true" />
                  </button>
                  <div className="faq-a" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} data-open={isOpen} inert={!isOpen}>
                    <div><div onClick={onAnswerClick} dangerouslySetInnerHTML={{ __html: item.a }} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
