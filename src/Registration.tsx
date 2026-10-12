import { cloneElement, useEffect, useState } from 'react'
import type React from 'react'
import { CONTACT } from './data'

// Where submissions are POSTed as JSON (e.g. a Formspree / Web3Forms / own API URL).
// Until it is set, the form validates and shows the thank-you screen but sends nothing.
const ENDPOINT = import.meta.env.VITE_REGISTRATION_ENDPOINT as string | undefined

const PINK = '#FFB3C6'
const ERROR = '#ff8a8a'
const display = "'Barlow Condensed', sans-serif"

const STYLE_OPTIONS = [
  'Gatvės šokiai (nuo 4m. iki neribojamo amžiaus)',
  'Pop Dance (nuo 8m. iki 15m.)',
  'Lady Class (nuo 16m.)',
  'Breakdance (nuo 7m.)',
]

// Row-major, so the two columns read like the studio's paper form.
const SOURCE_OPTIONS = ['Iš pažįstamų', 'Renginyje', 'Google', 'Facebook', 'Instagram', 'Tik Tok', 'Kitur']

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

export default function Registration() {
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
    <section id="registracija" style={{ padding: '168px 0 120px', backgroundColor: '#080808' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontFamily: display, fontWeight: 700, fontSize: 12, letterSpacing: 5, color: PINK, textTransform: 'uppercase', marginBottom: 12 }}>
            ◆&nbsp;&nbsp;Pirmoji treniruotė nemokama
          </p>
          <h1 style={{ fontFamily: display, fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: '#f0f0f0', margin: 0 }}>
            Registracija
          </h1>
          <p style={{ marginTop: 20, fontSize: 17, color: '#b0b0b0', lineHeight: 1.6, maxWidth: 560, fontWeight: 300 }}>
            Užpildykite formą, o mes el. paštu atsiųsime visą informaciją apie pirmąją, nemokamą šokių pamoką.
          </p>
        </div>

        <div className="reg-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 40, alignItems: 'start' }}>
          {status === 'sent' ? (
            <div role="status" style={{ border: `1px solid ${PINK}`, padding: '48px 40px', backgroundColor: '#0d0d0d' }}>
              <p style={{ fontFamily: display, fontWeight: 900, fontSize: 40, textTransform: 'uppercase', color: PINK, margin: '0 0 16px' }}>Ačiū!</p>
              <p style={{ fontSize: 17, color: '#d0d0d0', lineHeight: 1.6, margin: '0 0 24px' }}>
                Registracija gauta: <b style={{ color: '#f0f0f0' }}>{form.dancer}</b>.
                Artimiausiu metu informaciją apie pirmąją pamoką atsiųsime el. paštu {form.email}.
              </p>
              {!ENDPOINT && (
                <p style={{ fontSize: 13, color: '#9a9a9a', lineHeight: 1.6, margin: '0 0 24px', borderLeft: '1px solid #333', paddingLeft: 12 }}>
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
                  {STYLE_OPTIONS.map((s, i) => (
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
                  {SOURCE_OPTIONS.map((s, i) => (
                    <label key={s} className="reg-check">
                      <input id={i === 0 ? 'reg-source' : undefined} type="radio" name="source" checked={form.source === s} onChange={() => set('source', s)} />
                      {s}
                    </label>
                  ))}
                </div>
                {errors.source && <span style={{ color: ERROR, fontSize: 13, marginTop: 8, display: 'block' }}>{errors.source}</span>}
              </fieldset>

              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.5, maxWidth: 640 }}>
                Užsiregistravus, artimiausiu metu el. paštu išsiųsime Jums visą reikalingą informaciją apie pirmąją šokių pamoką.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <label htmlFor="reg-consent" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, color: '#c4c4c4', lineHeight: 1.5, cursor: 'pointer' }}>
                  <input id="reg-consent" type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, accentColor: PINK, flexShrink: 0 }} />
                  <span>
                    Sutinku, kad mano pateikti duomenys būtų naudojami registracijai tvarkyti ir susisiekti dėl treniruočių.
                    {errors.consent && <span style={{ display: 'block', color: ERROR, fontSize: 13, marginTop: 6 }}>{errors.consent}</span>}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <button type="submit" className="reg-btn" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Siunčiama…' : 'Registruotis →'}
                  </button>
                  <span style={{ fontSize: 14, color: '#9a9a9a' }}>Pirmoji treniruotė nemokama</span>
                </div>
                {status === 'error' && (
                  <p role="alert" style={{ color: ERROR, fontSize: 14, margin: 0 }}>
                    Nepavyko išsiųsti registracijos. Bandykite dar kartą arba parašykite {CONTACT.email}.
                  </p>
                )}
              </div>
            </form>
          )}

          <aside className="reg-aside" style={{ border: '1px solid #1a1a1a', backgroundColor: '#0d0d0d', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <p style={{ fontFamily: display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 1, color: '#f0f0f0', margin: '0 0 16px' }}>Kas toliau</p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Užpildote registracijos formą.',
                  'El. paštu atsiunčiame visą informaciją apie pirmąją pamoką.',
                  'Atvykstate į pirmąją treniruotę, ji nemokama.',
                ].map((t, i) => (
                  <li key={t} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, fontSize: 15, color: '#c4c4c4', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: display, fontWeight: 900, fontSize: 20, color: PINK, lineHeight: 1.2 }}>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
              <p style={{ fontSize: 11, letterSpacing: 3, color: '#8a8a8a', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Turite klausimų?</p>
              <a href={CONTACT.phoneHref} style={{ color: '#f0f0f0', textDecoration: 'none' }}>{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`} style={{ color: '#f0f0f0', textDecoration: 'none' }}>{CONTACT.email}</a>
              <span style={{ color: '#9a9a9a' }}>Savanorių pr. 271, Kaunas</span>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .reg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
        .reg-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .reg-fieldset { border: none; margin: 0; padding: 0; min-width: 0; }
        .reg-label { font-size: 14px; font-weight: 600; color: #d0d0d0; padding: 0; margin-bottom: 10px; }
        .reg-req { color: ${PINK}; }
        .reg-input {
          width: 100%; min-height: 48px; padding: 0 14px;
          background: #0d0d0d; border: 1px solid #262626; color: #f0f0f0;
          font-family: 'Outfit', sans-serif; font-size: 15px; border-radius: 0;
          color-scheme: dark; transition: border-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .reg-input::placeholder { color: #5e5e5e; }
        .reg-input:hover { border-color: #3a3a3a; }
        .reg-input:focus { outline: none; border-color: ${PINK}; }
        .reg-input[aria-invalid="true"] { border-color: ${ERROR}; }
        .reg-phone { display: flex; align-items: stretch; background: #0d0d0d; border: 1px solid #262626; transition: border-color 160ms; }
        .reg-phone:hover { border-color: #3a3a3a; }
        .reg-phone:focus-within { border-color: ${PINK}; }
        .reg-phone[data-invalid="true"] { border-color: ${ERROR}; }
        .reg-phone .reg-input { border: none; min-height: 46px; padding-left: 6px; }
        .reg-country { position: relative; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 14px; border-right: 1px solid #262626; color: #f0f0f0; font-size: 15px; }
        .reg-country select { position: absolute; inset: 0; opacity: 0; cursor: pointer; color-scheme: dark; }
        .reg-check { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #c4c4c4; cursor: pointer; }
        .reg-check input, #reg-consent { width: 18px; height: 18px; margin: 0; accent-color: ${PINK}; color-scheme: dark; flex-shrink: 0; cursor: pointer; }
        .reg-check:hover { color: #f0f0f0; }
        .reg-aside { position: sticky; top: 113px; }
        .reg-btn {
          background: ${PINK}; color: #080808; border: 1px solid ${PINK}; cursor: pointer;
          padding: 18px 44px; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 14px;
          letter-spacing: 2px; text-transform: uppercase; transition: background-color 160ms, transform 160ms;
        }
        .reg-btn:hover { background: #fff; transform: translateY(-2px); }
        .reg-btn:disabled { opacity: 0.6; cursor: wait; transform: none; }
        .reg-btn--ghost { background: transparent; color: ${PINK}; }
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
          <span aria-hidden="true" style={{ fontSize: 10, color: '#9a9a9a' }}>▼</span>
          <select
            aria-label={`${label}: šalies kodas`} value={value.country}
            onChange={e => onChange({ ...value, country: e.target.value as Phone['country'] })}
          >
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.dial}</option>)}
          </select>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, color: '#f0f0f0', fontSize: 15 }}>{country.dial}</span>
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
