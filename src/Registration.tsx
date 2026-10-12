import { cloneElement, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { CONTACT, DANCE_STYLES, PLANS, SCHEDULE_DAYS } from './data'

// Where submissions are POSTed as JSON (e.g. a Formspree / Web3Forms / own API URL).
// Until it is set, the form validates and shows the summary but sends nothing.
const ENDPOINT = import.meta.env.VITE_REGISTRATION_ENDPOINT as string | undefined

const PINK = '#FFB3C6'
const ERROR = '#ff8a8a'
const display = "'Barlow Condensed', sans-serif"

type Group = { id: string; style: string; age: string; time: string; days: string[] }

// One entry per class (style + age + time), with the days it runs on.
function buildGroups(): Group[] {
  const map = new Map<string, Group>()
  for (const day of SCHEDULE_DAYS) {
    for (const c of day.classes) {
      const id = `${c.style}|${c.age}|${c.time}`
      const g = map.get(id) ?? { id, style: c.style, age: c.age, time: c.time, days: [] }
      g.days.push(day.full)
      map.set(id, g)
    }
  }
  return [...map.values()].sort((a, b) => a.time.localeCompare(b.time))
}

const groupLabel = (g: Group) =>
  `${g.age} · ${g.days.map((d, i) => (i === 0 ? d : d.toLowerCase())).join(' ir ')} ${g.time}`

type Form = {
  dancer: string
  birthDate: string
  style: string
  group: string
  style2: string
  group2: string
  plan: string
  parent: string
  phone: string
  email: string
  comment: string
  consent: boolean
}

const EMPTY: Form = {
  dancer: '', birthDate: '', style: '', group: '', style2: '', group2: '',
  plan: 'Standart', parent: '', phone: '', email: '', comment: '', consent: false,
}

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.dancer.trim().split(/\s+/).length < 2) e.dancer = 'Įrašykite šokėjo vardą ir pavardę.'
  if (!f.birthDate) e.birthDate = 'Pasirinkite gimimo datą.'
  if (!f.style) e.style = 'Pasirinkite šokių stilių.'
  if (!f.group) e.group = 'Pasirinkite grupę.'
  if (f.plan === 'Intensive') {
    if (!f.style2) e.style2 = 'Intensive narystei pasirinkite antrą stilių.'
    else if (!f.group2) e.group2 = 'Pasirinkite antro stiliaus grupę.'
    else if (f.group2 === f.group) e.group2 = 'Antra grupė turi skirtis nuo pirmos.'
  }
  if (!/^\+?[\d\s()-]{8,}$/.test(f.phone.trim())) e.phone = 'Įrašykite telefono numerį, pvz. +370 600 00000.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Įrašykite el. pašto adresą, pvz. vardas@pastas.lt.'
  if (!f.consent) e.consent = 'Be sutikimo negalėsime užregistruoti.'
  return e
}

function planFromHash() {
  const plan = window.location.hash.replace('#registracija-', '')
  return PLANS.find(p => p.name.toLowerCase() === plan)?.name
}

export default function Registration() {
  const groups = useMemo(buildGroups, [])
  const [form, setForm] = useState<Form>(() => ({ ...EMPTY, plan: planFromHash() ?? EMPTY.plan }))
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const onHash = () => {
      const plan = planFromHash()
      if (plan) setForm(f => ({ ...f, plan }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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
        body: JSON.stringify({
          ...form,
          group: groupLabel(groups.find(g => g.id === form.group)!),
          group2: form.group2 ? groupLabel(groups.find(g => g.id === form.group2)!) : '',
        }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const plan = PLANS.find(p => p.name === form.plan)!

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
            Užpildykite formą ir susisieksime su jumis per 1 darbo dieną, kad suderintume pirmąją, nemokamą treniruotę.
          </p>
        </div>

        <div className="reg-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 40, alignItems: 'start' }}>
          {status === 'sent' ? (
            <div role="status" style={{ border: `1px solid ${PINK}`, padding: '48px 40px', backgroundColor: '#0d0d0d' }}>
              <p style={{ fontFamily: display, fontWeight: 900, fontSize: 40, textTransform: 'uppercase', color: PINK, margin: '0 0 16px' }}>Ačiū!</p>
              <p style={{ fontSize: 17, color: '#d0d0d0', lineHeight: 1.6, margin: '0 0 24px' }}>
                Registracija gauta: <b style={{ color: '#f0f0f0' }}>{form.dancer}</b>, {form.style}, {groupLabel(groups.find(g => g.id === form.group)!)}.
                Susisieksime telefonu {form.phone} arba el. paštu {form.email}.
              </p>
              {!ENDPOINT && (
                <p style={{ fontSize: 13, color: '#9a9a9a', lineHeight: 1.6, margin: '0 0 24px', borderLeft: `1px solid #333`, paddingLeft: 12 }}>
                  Peržiūros versija: forma dar neprijungta, todėl duomenys niekur neišsiųsti.
                </p>
              )}
              <button type="button" className="reg-btn reg-btn--ghost" onClick={() => { setForm(EMPTY); setTouched(false); setStatus('idle') }}>
                Registruoti dar vieną šokėją
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              <Fieldset title="Šokėjas">
                <div className="reg-grid">
                  <Field id="reg-dancer" label="Vardas, pavardė" error={errors.dancer}>
                    <input id="reg-dancer" className="reg-input" autoComplete="off" value={form.dancer} onChange={e => set('dancer', e.target.value)} />
                  </Field>
                  <Field id="reg-birthDate" label="Gimimo data" error={errors.birthDate}>
                    <input id="reg-birthDate" className="reg-input" type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
                  </Field>
                </div>
              </Fieldset>

              <Fieldset title="Narystė">
                <div className="reg-grid" role="radiogroup" aria-label="Narystė">
                  {PLANS.map(p => (
                    <label key={p.name} className="reg-plan" data-checked={form.plan === p.name}>
                      <input type="radio" name="plan" value={p.name} checked={form.plan === p.name} onChange={() => set('plan', p.name)} />
                      <span style={{ fontFamily: display, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: 1 }}>{p.name}</span>
                      <span style={{ fontFamily: display, fontWeight: 900, fontSize: 36, lineHeight: 1 }}>€{p.price}<span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 500, fontSize: 13, marginLeft: 4 }}>/mėn</span></span>
                      <span style={{ fontSize: 13, opacity: 0.8 }}>{p.features.slice(0, 2).join(' · ')}</span>
                    </label>
                  ))}
                </div>
              </Fieldset>

              <Fieldset title={form.plan === 'Intensive' ? 'Pirmas stilius ir grupė' : 'Stilius ir grupė'}>
                <StylePicker
                  prefix="reg-style" value={form.style} error={errors.style}
                  onChange={v => setForm(f => ({ ...f, style: v, group: '' }))}
                />
                <GroupSelect id="reg-group" groups={groups} style={form.style} value={form.group} error={errors.group} onChange={v => set('group', v)} />
              </Fieldset>

              {form.plan === 'Intensive' && (
                <Fieldset title="Antras stilius ir grupė">
                  <StylePicker
                    prefix="reg-style2" value={form.style2} error={errors.style2}
                    onChange={v => setForm(f => ({ ...f, style2: v, group2: '' }))}
                  />
                  <GroupSelect id="reg-group2" groups={groups} style={form.style2} value={form.group2} error={errors.group2} onChange={v => set('group2', v)} />
                </Fieldset>
              )}

              <Fieldset title="Kontaktai">
                <div className="reg-grid">
                  <Field id="reg-parent" label="Tėvų / globėjų vardas, pavardė" hint="Jei šokėjas nepilnametis" error={errors.parent}>
                    <input id="reg-parent" className="reg-input" autoComplete="name" value={form.parent} onChange={e => set('parent', e.target.value)} />
                  </Field>
                  <Field id="reg-phone" label="Telefonas" error={errors.phone}>
                    <input id="reg-phone" className="reg-input" type="tel" autoComplete="tel" placeholder="+370" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </Field>
                  <Field id="reg-email" label="El. paštas" error={errors.email}>
                    <input id="reg-email" className="reg-input" type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </Field>
                  <Field id="reg-comment" label="Komentaras" hint="Neprivaloma" wide>
                    <textarea id="reg-comment" className="reg-input" rows={4} value={form.comment} onChange={e => set('comment', e.target.value)} style={{ resize: 'vertical', paddingTop: 12 }} />
                  </Field>
                </div>
              </Fieldset>

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
                  <span style={{ fontSize: 14, color: '#9a9a9a' }}>
                    {plan.name}: <b style={{ color: '#f0f0f0' }}>€{plan.price}/mėn</b>, pirmoji treniruotė nemokama
                  </span>
                </div>
                {status === 'error' && (
                  <p role="alert" style={{ color: ERROR, fontSize: 14, margin: 0 }}>
                    Nepavyko išsiųsti registracijos. Bandykite dar kartą arba parašykite {CONTACT.email}.
                  </p>
                )}
              </div>
            </form>
          )}

          <aside style={{ border: '1px solid #1a1a1a', backgroundColor: '#0d0d0d', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <p style={{ fontFamily: display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', letterSpacing: 1, color: '#f0f0f0', margin: '0 0 16px' }}>Kas toliau</p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Užpildote registracijos formą.',
                  'Per 1 darbo dieną susisiekiame ir suderiname laiką.',
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
        .reg-input {
          width: 100%; min-height: 48px; padding: 0 14px;
          background: #0d0d0d; border: 1px solid #262626; color: #f0f0f0;
          font-family: 'Outfit', sans-serif; font-size: 15px; border-radius: 0;
          color-scheme: dark; transition: border-color 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .reg-input:hover { border-color: #3a3a3a; }
        .reg-input:focus { outline: none; border-color: ${PINK}; }
        .reg-input[aria-invalid="true"] { border-color: ${ERROR}; }
        .reg-chip {
          padding: 10px 18px; background: #111; border: 1px solid #262626; color: #b0b0b0; cursor: pointer;
          font-family: ${display}; font-weight: 800; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
          transition: color 160ms, border-color 160ms, background-color 160ms;
        }
        .reg-chip:hover { border-color: ${PINK}; color: #f0f0f0; }
        .reg-chip[aria-checked="true"] { background: ${PINK}; border-color: ${PINK}; color: #080808; }
        .reg-plan {
          position: relative; display: flex; flex-direction: column; gap: 10px; padding: 24px;
          border: 1px solid #262626; background: #0d0d0d; color: #f0f0f0; cursor: pointer;
          transition: border-color 160ms, background-color 160ms, color 160ms;
        }
        .reg-plan:hover { border-color: ${PINK}; }
        .reg-plan[data-checked="true"] { background: ${PINK}; border-color: ${PINK}; color: #080808; }
        .reg-plan input { position: absolute; opacity: 0; pointer-events: none; }
        .reg-plan:has(input:focus-visible) { outline: 2px solid ${PINK}; outline-offset: 3px; }
        .reg-btn {
          background: ${PINK}; color: #080808; border: 1px solid ${PINK}; cursor: pointer;
          padding: 18px 44px; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 14px;
          letter-spacing: 2px; text-transform: uppercase; transition: background-color 160ms, transform 160ms;
        }
        .reg-btn:hover { background: #fff; transform: translateY(-2px); }
        .reg-btn:disabled { opacity: 0.6; cursor: wait; transform: none; }
        .reg-btn--ghost { background: transparent; color: ${PINK}; }
        .reg-btn--ghost:hover { background: ${PINK}; color: #080808; }
        .reg-chip:focus-visible, .reg-btn:focus-visible { outline: 2px solid ${PINK}; outline-offset: 3px; }
        @media (max-width: 900px) { .reg-layout { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .reg-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  )
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      <legend style={{ fontFamily: display, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: 1, color: '#f0f0f0', padding: 0, marginBottom: 20 }}>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({ id, label, hint, error, wide, children }: {
  id: string; label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactElement<{ 'aria-invalid'?: boolean; 'aria-describedby'?: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: wide ? '1 / -1' : undefined, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 11, letterSpacing: 2, color: '#9a9a9a', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}{hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: '#6e6e6e', marginLeft: 8 }}>{hint}</span>}
      </label>
      <InvalidMark error={error} id={id}>{children}</InvalidMark>
      {error && <span id={`${id}-error`} style={{ color: ERROR, fontSize: 13 }}>{error}</span>}
    </div>
  )
}

function InvalidMark({ error, id, children }: { error?: string; id: string; children: React.ReactElement<{ 'aria-invalid'?: boolean; 'aria-describedby'?: string }> }) {
  return cloneElement(children, { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined })
}

function StylePicker({ prefix, value, error, onChange }: { prefix: string; value: string; error?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span id={`${prefix}-label`} style={{ fontSize: 11, letterSpacing: 2, color: '#9a9a9a', textTransform: 'uppercase', fontWeight: 700 }}>Šokių stilius</span>
      <div role="radiogroup" aria-labelledby={`${prefix}-label`} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DANCE_STYLES.map((s, i) => (
          <button
            key={s.id} id={i === 0 ? prefix : undefined} type="button" role="radio" aria-checked={value === s.name}
            className="reg-chip" onClick={() => onChange(s.name)}
          >
            {s.name}
          </button>
        ))}
      </div>
      {error && <span style={{ color: ERROR, fontSize: 13 }}>{error}</span>}
    </div>
  )
}

function GroupSelect({ id, groups, style, value, error, onChange }: {
  id: string; groups: Group[]; style: string; value: string; error?: string; onChange: (v: string) => void
}) {
  const options = groups.filter(g => g.style === style)
  return (
    <Field id={id} label="Grupė (amžius, dienos, laikas)" error={error}>
      <select id={id} className="reg-input" value={value} disabled={!style} onChange={e => onChange(e.target.value)}>
        <option value="">{style ? 'Pasirinkite grupę' : 'Pirmiausia pasirinkite stilių'}</option>
        {options.map(g => <option key={g.id} value={g.id}>{groupLabel(g)}</option>)}
      </select>
    </Field>
  )
}
