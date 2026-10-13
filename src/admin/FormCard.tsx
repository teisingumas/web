import { useCallback, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { mergeSection } from '../content'
import type { PageSeo, SectionKey } from '../content/types'
import { ApiError } from './api'
import { useApi, useConfirm, useDirty, useStore, useToast } from './context'
import { Fields, setIn, type PathArr } from './fields'
import { SCHEMA, sectionDef, validateFields, type Errors, type Field } from './schema'
import { formatSaved, Spinner } from './ui'

// One editable block with its own Save button: a page section or a page's SEO.

type Saved = { data: Record<string, unknown>; updatedAt: string | null }

/** JSON with sorted keys, so the same content compares equal whatever order the fields come in. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, (v as Record<string, unknown>)[k]]))
    : v))
}

export function FormCard({ id, title, description, fields, base, savedAt, onSave, defaultOpen, viewHref, extra }: {
  id: string
  title: string
  description?: string
  fields: Field[]
  base: Record<string, unknown>
  savedAt: string | null | undefined
  onSave: (data: Record<string, unknown>) => Promise<Saved>
  defaultOpen?: boolean
  viewHref?: string
  extra?: (data: Record<string, unknown>) => React.ReactNode
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(!!defaultOpen)
  const [data, setData] = useState(base)
  const [tried, setTried] = useState(false)
  const [serverErrors, setServerErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const dirty = useMemo(() => stableJson(data) !== stableJson(base), [data, base])
  useDirty(id, dirty)

  const set = useCallback((path: PathArr, value: unknown) => {
    setData(d => setIn(d, path, value))
    setServerErrors({})
  }, [])

  const errors = useMemo(() => (tried ? { ...validateFields(fields, data), ...serverErrors } : serverErrors), [tried, fields, data, serverErrors])

  // Bring the first mistake into view after a failed save.
  const [focusError, setFocusError] = useState(0)
  useEffect(() => {
    if (!focusError) return
    const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"] [aria-invalid="true"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.focus({ preventScroll: true })
  }, [focusError, id])

  const save = async () => {
    const found = validateFields(fields, data)
    if (Object.keys(found).length) {
      setTried(true)
      setFocusError(n => n + 1)
      toast.error('Patikrinkite pažymėtus laukus.')
      return
    }
    setSaving(true)
    try {
      const saved = await onSave(data)
      setData(saved.data)
      setTried(false)
      setServerErrors({})
      toast.success('Išsaugota. Pakeitimai jau matomi svetainėje.')
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        setServerErrors(e.fields)
        setTried(true)
        setFocusError(n => n + 1)
      }
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (await confirm({ title: 'Atšaukti pakeitimus?', text: 'Visi neišsaugoti šios skilties pakeitimai bus prarasti.', confirm: 'Atšaukti pakeitimus', cancel: 'Palikti', danger: true })) {
      setData(base)
      setTried(false)
      setServerErrors({})
    }
  }

  const bodyId = `card-${id.replace(/[^a-z0-9]+/gi, '-')}`
  return (
    <section className="adm-card" data-dirty={dirty} data-card={id}>
      <button type="button" className="adm-card__head" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(o => !o)}>
        <span style={{ minWidth: 0 }}>
          <span className="adm-card__title">{title}</span>
          {description && <span className="adm-card__desc">{description}</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {dirty && <span className="adm-badge">Neišsaugota</span>}
          <span className="adm-card__chev" aria-hidden="true" />
        </span>
      </button>
      <div id={bodyId} hidden={!open}>
        <div className="adm-card__body">
          <Fields fields={fields} value={data} path={[]} errors={errors} set={set} />
          {extra?.(data)}
        </div>
        <div className="adm-card__foot">
          <button type="button" className="adm-btn" onClick={save} disabled={saving || !dirty}>
            {saving ? <><Spinner /> Saugoma…</> : 'Išsaugoti'}
          </button>
          {dirty && !saving && <button type="button" className="adm-btn adm-btn--ghost" onClick={reset}>Atšaukti pakeitimus</button>}
          <span className="adm-card__status">
            {savedAt ? `Išsaugota ${formatSaved(savedAt)}` : 'Rodomas pradinis turinys'}
            {viewHref && <> · <a href={viewHref} target="_blank" rel="noreferrer" className="adm-link">Žiūrėti svetainėje ↗</a></>}
          </span>
        </div>
      </div>
    </section>
  )
}

export function SectionCard({ sectionKey, defaultOpen, viewHref }: { sectionKey: SectionKey; defaultOpen?: boolean; viewHref?: string }) {
  const api = useApi()
  const store = useStore()
  const def = sectionDef(sectionKey)
  const saved = store.sections[sectionKey]
  const base = useMemo(() => mergeSection(sectionKey, saved?.data) as unknown as Record<string, unknown>, [sectionKey, saved])
  return (
    <FormCard
      id={`section:${sectionKey}`} title={def.title} description={def.description} fields={def.fields} base={base}
      savedAt={saved?.updatedAt} defaultOpen={defaultOpen} viewHref={viewHref}
      onSave={async data => {
        const result = await api.saveSection(sectionKey, data)
        store.setSection(sectionKey, result)
        return result
      }}
    />
  )
}

export function SeoCard({ pageKey, path, defaultOpen = true }: { pageKey: string; path: string; defaultOpen?: boolean }) {
  const api = useApi()
  const store = useStore()
  const saved = store.seo[pageKey]
  const base = useMemo(() => ({
    title: saved?.title ?? '', description: saved?.description ?? '', keywords: saved?.keywords ?? '',
    ogImage: saved?.ogImage ?? { src: '', alt: '' }, noindex: !!saved?.noindex,
  }), [saved])
  return (
    <FormCard
      id={`seo:${pageKey}`} title="Paieškos sistemos ir socialiniai tinklai" description="Kaip puslapis atrodo Google paieškoje ir dalinantis nuoroda."
      fields={SCHEMA.seoFields} base={base} savedAt={saved?.updatedAt} defaultOpen={defaultOpen} viewHref={path}
      extra={data => <SerpPreview title={String(data.title ?? '')} description={String(data.description ?? '')} path={path} />}
      onSave={async data => {
        const result = await api.saveSeo(pageKey, data as unknown as PageSeo)
        store.setSeo(pageKey, result)
        const { updatedAt, ...rest } = result
        return { data: rest as unknown as Record<string, unknown>, updatedAt }
      }}
    />
  )
}

export function SerpPreview({ title, description, path }: { title: string; description: string; path: string }) {
  const host = window.location.host
  return (
    <div className="adm-field" style={{ marginTop: 28 }}>
      <span className="adm-label">Peržiūra Google paieškoje</span>
      <div className="adm-serp" aria-label="Google paieškos rezultato peržiūra">
        <div className="adm-serp__site">
          <span>{host}</span>
          <span className="adm-serp__url">{`https://${host}${path === '/' ? '' : path}`}</span>
        </div>
        <div className="adm-serp__title">{title || 'Puslapio pavadinimas'}</div>
        <div className="adm-serp__desc">{description || 'Čia bus rodomas puslapio aprašymas.'}</div>
      </div>
    </div>
  )
}
