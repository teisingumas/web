import { useEffect, useState } from 'react'
import type { PostList } from './api'
import { useApi } from './context'
import { SectionCard, SeoCard } from './FormCard'
import { pageDef, SCHEMA } from './schema'
import { ErrorState, formatDateTime, PageHeader, Skeleton, Tabs } from './ui'

export const ADMIN = '/apzvalga'

const PAGE_INTROS: Record<string, string> = {
  home: 'Pirmasis ekranas, stiliai, savaitės tvarkaraštis, kainos, treneriai ir kvietimas registruotis.',
  tvarkarastis: 'Salių tvarkaraščiai: kiekviena salė yra atskiras skirtukas su dienomis ir laikais.',
  registracija: 'Registracijos puslapio tekstai, formos pasirinkimai ir D.U.K.',
}

export function PageEditor({ pageKey }: { pageKey: string }) {
  const page = pageDef(pageKey)
  const [tab, setTab] = useState<'content' | 'seo'>('content')
  return (
    <>
      <PageHeader
        kicker="Puslapis" title={page.label} lead={PAGE_INTROS[pageKey]}
        actions={<a href={page.path} target="_blank" rel="noreferrer" className="adm-btn adm-btn--ghost">Atidaryti puslapį ↗</a>}
      />
      <Tabs label="Puslapio skiltys" value={tab} onChange={setTab} tabs={[{ id: 'content', label: 'Turinys' }, { id: 'seo', label: 'SEO' }]} />
      {/* both stay mounted so switching tabs keeps unsaved edits */}
      <div className="adm-stack" hidden={tab !== 'content'}>
        {pageKey === 'registracija' && (
          <p className="adm-note">Skirtuko „Kainos“ planai ir kainos redaguojami puslapyje <a className="adm-link" href={`${ADMIN}/pagrindinis`}>Pagrindinis → Kainos</a>.</p>
        )}
        {page.sections.map(key => <SectionCard key={key} sectionKey={key} defaultOpen={page.sections.length === 1} viewHref={page.path} />)}
      </div>
      <div hidden={tab !== 'seo'}>
        <SeoCard pageKey={pageKey} path={page.path} />
      </div>
    </>
  )
}

export function Settings() {
  return (
    <>
      <PageHeader kicker="Visa svetainė" title="Bendri nustatymai" lead="Kontaktai, socialiniai tinklai, apatinė svetainės dalis ir numatytieji SEO nustatymai." />
      <div className="adm-stack">
        {SCHEMA.settingsSections.map(key => <SectionCard key={key} sectionKey={key} viewHref="/" />)}
      </div>
    </>
  )
}

export function Dashboard() {
  const api = useApi()
  const [posts, setPosts] = useState<PostList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setError(null)
    api.posts({ page: 1 }).then(setPosts).catch(e => setError(e.message))
  }, [api, attempt])

  return (
    <>
      <PageHeader
        kicker="Sveiki sugrįžę" title="Apžvalga"
        lead="Čia keičiate svetainės tekstus, nuotraukas, tvarkaraštį ir naujienas. Išsaugoti pakeitimai svetainėje matomi iš karto: tereikia atnaujinti puslapį."
        actions={<a href={`${ADMIN}/naujienos/naujas`} className="adm-btn">+ Nauja naujiena</a>}
      />
      <div className="adm-tiles">
        <div className="adm-tile">
          <span className="adm-tile__title">Naujienos</span>
          {error ? <ErrorState message={error} onRetry={() => setAttempt(a => a + 1)} />
            : !posts ? <Skeleton style={{ height: 44, width: 120 }} />
            : (
              <div style={{ display: 'flex', gap: 28 }}>
                <div><div className="adm-stat">{posts.counts.published}</div><p className="adm-tile__text">publikuota</p></div>
                <div><div className="adm-stat" style={{ color: 'var(--text-2)' }}>{posts.counts.draft}</div><p className="adm-tile__text">juodraščiai</p></div>
              </div>
            )}
          <a href={`${ADMIN}/naujienos`} className="adm-tile__more">Visos naujienos →</a>
        </div>
        {(['home', 'tvarkarastis', 'registracija'] as const).map(key => {
          const page = pageDef(key)
          return (
            <a key={key} href={`${ADMIN}/${page.admin}`} className="adm-tile">
              <span className="adm-tile__title">{page.label}</span>
              <p className="adm-tile__text">{PAGE_INTROS[key]}</p>
              <span className="adm-tile__more">Redaguoti →</span>
            </a>
          )
        })}
        <a href={`${ADMIN}/nuotraukos`} className="adm-tile">
          <span className="adm-tile__title">Nuotraukos</span>
          <p className="adm-tile__text">Visų įkeltų nuotraukų biblioteka ir jų alt tekstai.</p>
          <span className="adm-tile__more">Atidaryti →</span>
        </a>
        <a href={`${ADMIN}/bendri`} className="adm-tile">
          <span className="adm-tile__title">Bendri nustatymai</span>
          <p className="adm-tile__text">Kontaktai, socialiniai tinklai, apačia ir numatytasis SEO.</p>
          <span className="adm-tile__more">Redaguoti →</span>
        </a>
      </div>

      {posts && posts.items.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 className="adm-h2" style={{ marginBottom: 12 }}>Paskutinės redaguotos naujienos</h2>
          <div className="adm-recent">
            {posts.items.slice(0, 5).map(p => (
              <a key={p.id} href={`${ADMIN}/naujienos/${p.id}`}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || 'Be pavadinimo'}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                  <span className={`adm-chip adm-chip--${p.status}`}>{p.status === 'published' ? 'Publikuota' : 'Juodraštis'}</span>
                  <span className="adm-table__date">{formatDateTime(p.updatedAt)}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

export function AdminNotFound() {
  return (
    <>
      <PageHeader kicker="Klaida 404" title="Puslapis nerastas" />
      <a href={ADMIN} className="adm-btn">Į apžvalgą</a>
    </>
  )
}
