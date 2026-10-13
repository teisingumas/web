// Typed access to src/content/schema.json plus the same validation the server runs
// (server/lib/schema.php), so mistakes are shown before saving. The server stays the judge.

import rawSchema from '../content/schema.json'
import type { SectionKey } from '../content/types'

export type Option = { value: string; label: string }

type Base = { key: string; label: string; required?: boolean; help?: string; placeholder?: string }
export type TextField = Base & { type: 'text' | 'textarea'; max?: number; recommended?: number; rows?: number; format?: Format }
export type RichTextField = Base & { type: 'richtext'; max?: number }
export type CheckboxField = Base & { type: 'checkbox' }
export type SelectField = Base & { type: 'select'; options: string | Option[] }
export type ImageField = Base & { type: 'image'; focus?: boolean; alt?: 'required' | 'optional' | 'none' }
export type TagsField = Base & { type: 'tags'; itemName?: string; max?: number; minItems?: number; maxItems?: number }
export type ListField = Base & {
  type: 'list'; fields: Field[]; itemName: string; itemTitle?: string; layout?: 'rows'; min?: number; max?: number
  check?: { type: 'timeOrder'; start: string; end: string }
}
export type Field = TextField | RichTextField | CheckboxField | SelectField | ImageField | TagsField | ListField
export type Format = 'email' | 'phone' | 'url' | 'time' | 'date' | 'price' | 'stat'

export type SectionDef = { title: string; description?: string; fields: Field[] }
export type PageDef = { key: string; label: string; path: string; admin: string; sections: SectionKey[]; seo: { title: string; description: string; keywords: string } }

export const SCHEMA = rawSchema as unknown as {
  reservedSlugs: string[]
  seoFields: Field[]
  pages: PageDef[]
  settingsSections: SectionKey[]
  sections: Record<SectionKey, SectionDef>
  options: Record<string, Option[]>
}

export const sectionDef = (key: SectionKey) => SCHEMA.sections[key]
export const pageDef = (key: string) => SCHEMA.pages.find(p => p.key === key)!
export const optionsOf = (f: SelectField): Option[] => (typeof f.options === 'string' ? SCHEMA.options[f.options] ?? [] : f.options)

export type Errors = Record<string, string>

const tooLong = (max: number, len: number) => `Ne daugiau kaip ${max} ženklų (dabar ${len}).`

export function htmlText(html: string) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html.replace(/<\/(p|li|h2|h3)>|<br>/g, ' ')
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function checkFormat(format: Format, s: string): string | null {
  switch (format) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? null : 'Įrašykite el. pašto adresą, pvz. vardas@pastas.lt.'
    case 'phone': {
      const digits = s.replace(/\D/g, '').length
      return /^\+?[\d\s()-]+$/.test(s) && digits >= 7 && digits <= 15 ? null : 'Įrašykite telefono numerį, pvz. +370 600 00000.'
    }
    case 'url': return /^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i.test(s) ? null : 'Įrašykite pilną nuorodą, prasidedančią https://'
    case 'time': {
      const m = /^(\d{1,2})[:.](\d{2})$/.exec(s)
      return m && Number(m[1]) <= 23 && Number(m[2]) <= 59 ? null : 'Laikas formatu VV:MM, pvz. 17:30.'
    }
    case 'date': {
      const m = /^(\d{4})[.-](\d{2})[.-](\d{2})$/.exec(s)
      const d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return d && d.getDate() === Number(m![3]) && d.getMonth() === Number(m![2]) - 1 ? null : 'Data formatu MMMM.MM.DD, pvz. 2026.09.02.'
    }
    case 'price': return /^\d{1,5}([.,]\d{1,2})?$/.test(s) ? null : 'Įrašykite kainą skaičiais, pvz. 55 arba 55,50.'
    case 'stat': return /^\d{1,5}[+%]?$/.test(s) ? null : 'Skaičius, gale gali būti + arba %, pvz. 650+.'
  }
}

const normTime = (s: string) => {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(s)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s
}

export function validateFields(fields: Field[], data: Record<string, unknown> | undefined, prefix = '', errors: Errors = {}): Errors {
  for (const f of fields) validateField(f, data?.[f.key], prefix + f.key, errors)
  return errors
}

function validateField(f: Field, value: unknown, path: string, errors: Errors) {
  switch (f.type) {
    case 'text':
    case 'textarea': {
      const s = typeof value === 'string' ? value.trim() : ''
      if (!s) { if (f.required) errors[path] = 'Šis laukas privalomas.'; return }
      if (f.max && s.length > f.max) errors[path] = tooLong(f.max, s.length)
      else if (f.format) { const m = checkFormat(f.format, s); if (m) errors[path] = m }
      return
    }
    case 'richtext': {
      const len = htmlText(typeof value === 'string' ? value : '').length
      if (!len) { if (f.required) errors[path] = 'Šis laukas privalomas.'; return }
      if (f.max && len > f.max) errors[path] = tooLong(f.max, len)
      return
    }
    case 'select': {
      const s = typeof value === 'string' ? value : ''
      if (!s) { if (f.required) errors[path] = 'Pasirinkite reikšmę.'; return }
      if (!optionsOf(f).some(o => o.value === s)) errors[path] = 'Pasirinkite reikšmę iš sąrašo.'
      return
    }
    case 'image': {
      const img = (value ?? {}) as { src?: string; alt?: string }
      const alt = (img.alt ?? '').trim()
      if (!img.src) { if (f.required) errors[`${path}.src`] = 'Įkelkite nuotrauką.'; return }
      if (alt.length > 160) errors[`${path}.alt`] = tooLong(160, alt.length)
      else if ((f.alt ?? 'required') === 'required' && alt.length < 3) errors[`${path}.alt`] = 'Trumpai aprašykite, kas nuotraukoje (alt tekstas).'
      return
    }
    case 'tags': {
      const items = (Array.isArray(value) ? value : []).map(v => String(v ?? '').trim()).filter(Boolean)
      items.forEach((s, i) => { if (f.max && s.length > f.max) errors[`${path}.${i}`] = tooLong(f.max, s.length) })
      if (f.minItems && items.length < f.minItems) errors[path] = `Reikia bent ${f.minItems}.`
      if (f.maxItems && items.length > f.maxItems) errors[path] = `Ne daugiau kaip ${f.maxItems}.`
      return
    }
    case 'list': {
      const items = Array.isArray(value) ? value as Record<string, unknown>[] : []
      if (f.min && items.length < f.min) errors[path] = `Reikia bent ${f.min}.`
      if (f.max && items.length > f.max) errors[path] = `Ne daugiau kaip ${f.max}.`
      items.forEach((item, i) => {
        validateFields(f.fields, item, `${path}.${i}.`, errors)
        if (f.check?.type === 'timeOrder') {
          const start = normTime(String(item[f.check.start] ?? '').trim())
          const end = normTime(String(item[f.check.end] ?? '').trim())
          const endPath = `${path}.${i}.${f.check.end}`
          if (start && end && !errors[endPath] && end <= start) errors[endPath] = 'Pabaiga turi būti vėliau nei pradžia.'
        }
      })
    }
  }
}

/** An empty value for a new list item. */
export function emptyValue(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    out[f.key] = f.type === 'checkbox' ? false
      : f.type === 'image' ? { src: '', alt: '' }
      : f.type === 'tags' || f.type === 'list' ? []
      : f.type === 'select' ? (optionsOf(f)[0]?.value ?? '')
      : ''
  }
  return out
}

/** Error messages under a path (for list items: does anything inside have an error?). */
export const hasErrorsUnder = (errors: Errors, path: string) => Object.keys(errors).some(k => k === path || k.startsWith(path + '.'))
