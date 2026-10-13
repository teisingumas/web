import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { useConfirm } from './context'
import ImageInput from './ImageInput'
import RichEditor from './RichEditor'
import { emptyValue, hasErrorsUnder, optionsOf, type Errors, type Field, type ListField, type TagsField, type TextField } from './schema'

// Form fields drawn from schema.json. Values are updated through set(path, value) on the whole
// form, so async updates (an upload finishing) never overwrite edits made meanwhile.

export type PathArr = (string | number)[]
export type Setter = (path: PathArr, value: unknown) => void

export function setIn<T>(obj: T, path: PathArr, value: unknown): T {
  if (path.length === 0) return value as T
  const [head, ...rest] = path
  if (Array.isArray(obj)) {
    const copy = [...obj]
    copy[head as number] = setIn(copy[head as number], rest, value)
    return copy as T
  }
  const base = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>
  return { ...base, [head]: setIn(base[head as string], rest, value) } as T
}

const fieldId = (path: string) => 'f-' + path.replace(/[^a-zA-Z0-9]+/g, '-')

type Props<F extends Field = Field> = { field: F; value: unknown; path: PathArr; errors: Errors; set: Setter }

export function Fields({ fields, value, path, errors, set }: { fields: Field[]; value: Record<string, unknown>; path: PathArr; errors: Errors; set: Setter }) {
  return (
    <div className="adm-fields">
      {fields.map(f => <FieldView key={f.key} field={f} value={value?.[f.key]} path={[...path, f.key]} errors={errors} set={set} />)}
    </div>
  )
}

function FieldView(props: Props) {
  const { field } = props
  switch (field.type) {
    case 'text':
    case 'textarea': return <TextInput {...props} field={field} />
    case 'richtext': return <RichTextInput {...props} field={field} />
    case 'checkbox': return <CheckboxInput {...props} field={field} />
    case 'select': return <SelectInput {...props} field={field} />
    case 'image': return <ImageInput field={field} value={props.value as never} path={props.path} errors={props.errors} set={props.set} />
    case 'tags': return <TagsInput {...props} field={field} />
    case 'list': return field.layout === 'rows' ? <RowsInput {...props} field={field} /> : <CardsInput {...props} field={field} />
  }
}

export function Label({ htmlFor, field, count }: { htmlFor?: string; field: Field; count?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="adm-label">
      <span>{field.label}{field.required && <span className="adm-req"> *</span>}</span>
      {count}
    </label>
  )
}

export function Counter({ length, max, recommended }: { length: number; max?: number; recommended?: number }) {
  if (!max) return null
  return (
    <span className="adm-count" data-over={length > max} data-warn={!!recommended && length > recommended && length <= max}>
      {length}/{recommended && length <= recommended ? recommended : max}
    </span>
  )
}

export function FieldMessages({ id, help, error }: { id: string; help?: string; error?: string }) {
  return (
    <>
      {error && <p id={`${id}-error`} className="adm-error">{error}</p>}
      {help && <p id={`${id}-help`} className="adm-help">{help}</p>}
    </>
  )
}

const describedBy = (id: string, help?: string, error?: string) => [error && `${id}-error`, help && `${id}-help`].filter(Boolean).join(' ') || undefined

function TextInput({ field, value, path, errors, set }: Props<TextField>) {
  const p = path.join('.')
  const id = fieldId(p)
  const text = typeof value === 'string' ? value : ''
  const error = errors[p]
  const common = {
    id, className: 'adm-input', value: text, placeholder: field.placeholder,
    'aria-invalid': !!error, 'aria-describedby': describedBy(id, field.help, error),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(path, e.target.value),
  }
  return (
    <div className="adm-field">
      <Label htmlFor={id} field={field} count={<Counter length={text.trim().length} max={field.max} recommended={field.recommended} />} />
      {field.type === 'textarea'
        ? <textarea {...common} rows={field.rows ?? 3} />
        : <input {...common} type={field.format === 'email' ? 'email' : field.format === 'url' ? 'url' : field.format === 'phone' ? 'tel' : 'text'}
            inputMode={field.format === 'time' || field.format === 'price' || field.format === 'date' ? 'decimal' : undefined} />}
      <FieldMessages id={id} help={field.help} error={error} />
    </div>
  )
}

function RichTextInput({ field, value, path, errors, set }: Props<Extract<Field, { type: 'richtext' }>>) {
  const p = path.join('.')
  const id = fieldId(p)
  const error = errors[p]
  return (
    <div className="adm-field">
      <Label htmlFor={id} field={field} />
      <RichEditor id={id} variant="mini" value={typeof value === 'string' ? value : ''} onChange={html => set(path, html)} invalid={!!error} describedBy={describedBy(id, field.help, error)} />
      <FieldMessages id={id} help={field.help} error={error} />
    </div>
  )
}

function CheckboxInput({ field, value, path, errors, set }: Props<Extract<Field, { type: 'checkbox' }>>) {
  const p = path.join('.')
  const id = fieldId(p)
  return (
    <div className="adm-field">
      <label className="adm-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={e => set(path, e.target.checked)} aria-describedby={describedBy(id, field.help)} />
        <span>{field.label}</span>
      </label>
      <FieldMessages id={id} help={field.help} error={errors[p]} />
    </div>
  )
}

function SelectInput({ field, value, path, errors, set }: Props<Extract<Field, { type: 'select' }>>) {
  const p = path.join('.')
  const id = fieldId(p)
  const error = errors[p]
  return (
    <div className="adm-field">
      <Label htmlFor={id} field={field} />
      <select id={id} className="adm-input" value={typeof value === 'string' ? value : ''} aria-invalid={!!error} onChange={e => set(path, e.target.value)}>
        {!field.required && <option value="">—</option>}
        {optionsOf(field).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <FieldMessages id={id} help={field.help} error={error} />
    </div>
  )
}

// Stable keys for list items, so editors inside items keep their state when items move.
let keySeq = 0
function useItemKeys(length: number) {
  const keys = useRef<number[]>([])
  if (keys.current.length !== length) {
    keys.current = keys.current.slice(0, length)
    while (keys.current.length < length) keys.current.push(++keySeq)
  }
  return {
    keys: keys.current,
    move: (from: number, to: number) => { const k = [...keys.current]; [k[from], k[to]] = [k[to], k[from]]; keys.current = k },
    remove: (i: number) => { keys.current = keys.current.filter((_, j) => j !== i) },
    add: () => { const k = ++keySeq; keys.current = [...keys.current, k]; return k },
  }
}

function TagsInput({ field, value, path, errors, set }: Props<TagsField>) {
  const p = path.join('.')
  const id = fieldId(p)
  const items = Array.isArray(value) ? (value as string[]) : []
  const { keys, remove, add } = useItemKeys(items.length)
  const refs = useRef<Record<number, HTMLInputElement | null>>({})
  const [focusKey, setFocusKey] = useState<number | null>(null)
  useEffect(() => {
    if (focusKey !== null) refs.current[focusKey]?.focus()
  }, [focusKey])
  const atMax = !!field.maxItems && items.length >= field.maxItems
  const addItem = () => { const k = add(); set(path, [...items, '']); setFocusKey(k) }
  return (
    <fieldset className="adm-field" style={{ border: 'none', margin: 0, padding: 0 }} aria-describedby={describedBy(id, field.help, errors[p])}>
      <legend className="adm-label" style={{ padding: 0, marginBottom: 8, width: '100%' }}>
        <span>{field.label}{field.required && <span className="adm-req"> *</span>}</span>
        {field.maxItems && <span className="adm-count">{items.length}/{field.maxItems}</span>}
      </legend>
      <div className="adm-tags">
        {items.map((item, i) => {
          const itemError = errors[`${p}.${i}`]
          return (
            <div key={keys[i]}>
              <div className="adm-tag">
                <input
                  ref={el => { refs.current[keys[i]] = el }}
                  className="adm-input" value={item} placeholder={field.placeholder} aria-label={`${field.label}: ${i + 1}`} aria-invalid={!!itemError}
                  onChange={e => set([...path, i], e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (i === items.length - 1 && !atMax) addItem() } }}
                />
                <button type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={`Pašalinti „${item || i + 1}“`} onClick={() => { remove(i); set(path, items.filter((_, j) => j !== i)) }}>×</button>
              </div>
              {itemError && <p className="adm-error" style={{ marginTop: 4 }}>{itemError}</p>}
            </div>
          )
        })}
        <button type="button" className="adm-add" disabled={atMax} onClick={addItem}>+ Pridėti {field.itemName ?? 'eilutę'}</button>
      </div>
      <FieldMessages id={id} help={field.help} error={errors[p]} />
    </fieldset>
  )
}

function itemLabel(field: ListField, item: Record<string, unknown> | undefined) {
  const v = field.itemTitle ? item?.[field.itemTitle] : undefined
  return typeof v === 'string' ? v.trim() : ''
}

function ListActions({ field, items, i, path, set, keys, onRemoved }: {
  field: ListField; items: Record<string, unknown>[]; i: number; path: PathArr; set: Setter
  keys: ReturnType<typeof useItemKeys>; onRemoved?: () => void
}) {
  const confirm = useConfirm()
  const label = itemLabel(field, items[i]) || `${i + 1}`
  const move = (to: number) => {
    const next = [...items]
    ;[next[i], next[to]] = [next[to], next[i]]
    keys.move(i, to)
    set(path, next)
  }
  return (
    <>
      <button type="button" className="adm-icon-btn" aria-label={`Perkelti „${label}“ aukštyn`} title="Aukštyn" disabled={i === 0} onClick={() => move(i - 1)}>↑</button>
      <button type="button" className="adm-icon-btn" aria-label={`Perkelti „${label}“ žemyn`} title="Žemyn" disabled={i === items.length - 1} onClick={() => move(i + 1)}>↓</button>
      <button
        type="button" className="adm-icon-btn adm-icon-btn--danger" aria-label={`Ištrinti „${label}“`} title="Ištrinti"
        disabled={!!field.min && items.length <= field.min}
        onClick={async () => {
          const ok = await confirm({ title: 'Ištrinti?', text: <>Ištrinti „{label}“? Pakeitimas įsigalios, kai paspausite „Išsaugoti“.</>, confirm: 'Ištrinti', danger: true })
          if (!ok) return
          keys.remove(i)
          set(path, items.filter((_, j) => j !== i))
          onRemoved?.()
        }}
      >×</button>
    </>
  )
}

const columnFor = (f: Field) => {
  if (f.type === 'text' && (f.format === 'time' || f.format === 'stat' || f.format === 'price')) return '96px'
  if (f.type === 'select') return 'minmax(130px, 1fr)'
  if (f.type === 'text' && f.max && f.max <= 20) return 'minmax(90px, 0.8fr)'
  return 'minmax(0, 1.6fr)'
}

// Compact rows: timetable slots, classes, stats, opening hours.
function RowsInput({ field, value, path, errors, set }: Props<ListField>) {
  const p = path.join('.')
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const keys = useItemKeys(items.length)
  const cols = field.fields.map(columnFor).join(' ')
  const atMax = !!field.max && items.length >= field.max
  return (
    <div className="adm-field">
      <span className="adm-label"><span>{field.label}{field.required && <span className="adm-req"> *</span>}</span>{field.max && <span className="adm-count">{items.length}/{field.max}</span>}</span>
      <div className="adm-rows" style={{ '--row-cols': cols } as React.CSSProperties}>
        {items.length > 0 && (
          <div className="adm-row adm-row--head" aria-hidden="true">
            {field.fields.map(f => <span key={f.key} className="adm-row__head">{f.label}</span>)}
            <span style={{ width: 104 }} />
          </div>
        )}
        {items.map((item, i) => (
          <div key={keys.keys[i]} className="adm-row" role="group" aria-label={`${field.label}: ${i + 1}`}>
            {field.fields.map(f => {
              const fp = `${p}.${i}.${f.key}`
              const error = errors[fp]
              const v = item?.[f.key]
              return (
                <div key={f.key} className="adm-row__cell" data-label={f.label}>
                  {f.type === 'select' ? (
                    <select className="adm-input" aria-label={f.label} aria-invalid={!!error} value={typeof v === 'string' ? v : ''} onChange={e => set([...path, i, f.key], e.target.value)}>
                      {optionsOf(f).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input className="adm-input" aria-label={f.label} aria-invalid={!!error} value={typeof v === 'string' ? v : ''}
                      placeholder={f.placeholder} onChange={e => set([...path, i, f.key], e.target.value)}
                      inputMode={f.type === 'text' && (f.format === 'time' || f.format === 'price') ? 'decimal' : undefined} />
                  )}
                  {error && <p className="adm-error">{error}</p>}
                </div>
              )
            })}
            <div className="adm-row__actions"><ListActions field={field} items={items} i={i} path={path} set={set} keys={keys} /></div>
          </div>
        ))}
        <button type="button" className="adm-add" disabled={atMax} onClick={() => { keys.add(); set(path, [...items, emptyValue(field.fields)]) }}>
          + Pridėti {field.itemName}
        </button>
      </div>
      <FieldMessages id={fieldId(p)} help={field.help} error={errors[p]} />
    </div>
  )
}

// Collapsible cards: trainers, styles, FAQ questions, halls, days.
function CardsInput({ field, value, path, errors, set }: Props<ListField>) {
  const p = path.join('.')
  const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const keys = useItemKeys(items.length)
  const [open, setOpen] = useState<Set<number>>(() => new Set())
  const atMax = !!field.max && items.length >= field.max

  // After a save attempt, open the items that have mistakes.
  useEffect(() => {
    const withErrors = keys.keys.filter((_, i) => hasErrorsUnder(errors, `${p}.${i}`))
    if (withErrors.length) setOpen(o => new Set([...o, ...withErrors]))
  }, [errors])

  const toggle = (k: number) => setOpen(o => {
    const n = new Set(o)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    return n
  })

  return (
    <div className="adm-field">
      <span className="adm-label"><span>{field.label}{field.required && <span className="adm-req"> *</span>}</span>{field.max && <span className="adm-count">{items.length}/{field.max}</span>}</span>
      <div className="adm-list">
        {items.map((item, i) => {
          const k = keys.keys[i]
          const isOpen = open.has(k)
          const label = itemLabel(field, item)
          const bodyId = `${fieldId(p)}-${k}`
          return (
            <div key={k} className="adm-item" data-error={hasErrorsUnder(errors, `${p}.${i}`)}>
              <div className="adm-item__head">
                <button type="button" className="adm-item__toggle" aria-expanded={isOpen} aria-controls={bodyId} onClick={() => toggle(k)}>
                  <span className="adm-item__num">{i + 1}</span>
                  <span className={`adm-item__name${label ? '' : ' adm-item__name--empty'}`}>{label || 'Be pavadinimo'}</span>
                  <span className="adm-card__chev" aria-hidden="true" style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(225deg)' : undefined }} />
                </button>
                <ListActions field={field} items={items} i={i} path={path} set={set} keys={keys} />
              </div>
              {isOpen && (
                <div className="adm-item__body" id={bodyId}>
                  <Fields fields={field.fields} value={item} path={[...path, i]} errors={errors} set={set} />
                </div>
              )}
            </div>
          )
        })}
        <button type="button" className="adm-add" disabled={atMax} onClick={() => {
          const k = keys.add()
          set(path, [...items, emptyValue(field.fields)])
          setOpen(o => new Set([...o, k]))
        }}>
          + Pridėti {field.itemName}
        </button>
      </div>
      <FieldMessages id={fieldId(p)} help={field.help} error={errors[p]} />
    </div>
  )
}
