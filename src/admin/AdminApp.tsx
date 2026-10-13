import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { ClerkProvider, SignIn, useAuth, useClerk, useUser } from '@clerk/react'
import logo from '../assets/logo-megusta.webp'
import { inlineData } from '../content'
import { navigate, PATHS, type Route } from '../router'
import ThemeSwitch from '../ThemeSwitch'
import { ApiError, createApi, fetchStatus, type Api, type SavedSection, type SeoRecord, type SetupStatus, type TokenGetter } from './api'
import { clerkAppearance, clerkLocalization } from './clerkTheme'
import { ConfirmProvider, DirtyProvider, SessionProvider, StoreProvider, ToastProvider, useSession } from './context'
import MediaLibraryPage from './MediaLibrary'
import { AdminNotFound, Dashboard, PageEditor, Settings } from './pages'
import { NewsAdmin, PostEditor } from './posts'
import { ErrorState, Icons, LoadingCards, Spinner } from './ui'
import './admin.css'

// /adminas: Clerk sign-in (and a setup checklist until the server is configured).
// /apzvalga/…: the dashboard. The server checks every request again (server/lib/auth.php).

const publishableKey = inlineData.clerkPublishableKey || (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) || ''
// Local development only: a token signed with your own test key (see README). Never set in production.
const devToken = import.meta.env.DEV ? (import.meta.env.VITE_DEV_ADMIN_TOKEN as string | undefined) : undefined

export default function AdminApp({ route }: { route: Route }) {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  if (devToken) {
    return <Admin route={route} signedIn getToken={async () => devToken} userLabel="Kūrėjo režimas" signOut={() => navigate(PATHS.home)} />
  }
  if (!publishableKey) return <LoginScreen><SetupCheck forceShow /></LoginScreen>
  return (
    <ClerkProvider
      publishableKey={publishableKey} appearance={clerkAppearance} localization={clerkLocalization}
      routerPush={to => navigate(to)} routerReplace={to => navigate(to, true)} afterSignOutUrl={PATHS.adminLogin}
    >
      <ClerkAdmin route={route} />
    </ClerkProvider>
  )
}

function ClerkAdmin({ route }: { route: Route }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const clerk = useClerk()
  if (!isLoaded) return <FullScreenLoading />
  return (
    <Admin
      route={route} signedIn={!!isSignedIn} getToken={() => getToken()}
      userLabel={user?.primaryEmailAddress?.emailAddress ?? ''}
      signOut={() => clerk.signOut({ redirectUrl: PATHS.adminLogin })}
    />
  )
}

function Admin({ route, signedIn, getToken, userLabel, signOut }: { route: Route; signedIn: boolean; getToken: TokenGetter; userLabel: string; signOut: () => void }) {
  // getToken from Clerk changes identity between renders; the API object must not.
  const [tokenGetter] = useState(() => ({ current: getToken }))
  tokenGetter.current = getToken
  const api = useMemo(() => createApi(() => tokenGetter.current()), [tokenGetter])
  const session = useMemo(() => ({ api, userLabel, signOut }), [api, userLabel, signOut])

  useEffect(() => {
    if (!signedIn && route.page === 'admin') navigate(PATHS.adminLogin, true)
  }, [signedIn, route.page])

  if (route.page === 'admin-login') {
    return (
      <LoginScreen>
        {signedIn ? <SignedInCheck api={api} signOut={signOut} /> : (
          <>
            <SetupCheck />
            {!devToken && <SignIn routing="hash" forceRedirectUrl={PATHS.admin} />}
          </>
        )}
      </LoginScreen>
    )
  }
  if (!signedIn) return <FullScreenLoading />
  return (
    <SessionProvider value={session}>
      <ToastProvider>
        <ConfirmProvider>
          <DirtyProvider>
            <Shell route={route} />
          </DirtyProvider>
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  )
}

function FullScreenLoading() {
  return (
    <div className="adm-login" aria-busy="true">
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-2)' }}><Spinner /> Kraunama…</span>
    </div>
  )
}

function LoginScreen({ children }: { children: React.ReactNode }) {
  useEffect(() => { document.title = 'Turinio valdymas — Me Gusta' }, [])
  return (
    <main className="adm-login">
      <div className="adm-login__box">
        <div className="adm-login__brand">
          <a href={PATHS.home} aria-label="Į svetainę"><img src={logo} alt="Me Gusta" width={87} height={56} /></a>
          <div>
            <p className="adm-kicker">◆&nbsp;&nbsp;Me Gusta</p>
            <h1 className="adm-h1" style={{ fontSize: 44 }}>Turinio valdymas</h1>
          </div>
        </div>
        {children}
      </div>
    </main>
  )
}

const CHECKS: { key: keyof SetupStatus['checks']; title: string; fix: string }[] = [
  { key: 'php', title: 'PHP 8.1 ar naujesnė', fix: 'hPanel → Advanced → PHP Configuration: pasirinkite 8.2 ar naujesnę versiją.' },
  { key: 'config', title: 'Nustatymų failas megusta-config.php', fix: 'Sukurkite failą pagal instrukciją (docs/CMS.md, 3 žingsnis).' },
  { key: 'database', title: 'Duomenų bazė', fix: 'Patikrinkite duomenų bazės pavadinimą, vartotoją ir slaptažodį nustatymų faile.' },
  { key: 'clerk', title: 'Clerk raktas', fix: 'Įrašykite clerk_publishable_key (prasideda pk_) į nustatymų failą.' },
  { key: 'admins', title: 'Leidžiama paskyra', fix: 'Prisijunkite žemiau: puslapis parodys jūsų ID, kurį reikia įrašyti į admin_user_ids.' },
  { key: 'storage', title: 'Nuotraukų aplankas', fix: 'Serveris negali rašyti į aplanką megusta-data. Patikrinkite teises (755).' },
  { key: 'images', title: 'Nuotraukų apdorojimas (GD)', fix: 'hPanel → PHP Configuration → Extensions: įjunkite gd ir fileinfo.' },
]

function SetupCheck({ forceShow }: { forceShow?: boolean }) {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetchStatus().then(setStatus).catch(e => setError(e instanceof ApiError && e.status === 404
      ? 'Serverio dalis nerasta (/api). Ar svetainė įkelta su PHP failais?'
      : e.message))
  }, [])
  if (error) return <div className="adm-state adm-state--error" role="alert"><p>Nepavyko patikrinti serverio nustatymų.</p><p>{error}</p></div>
  if (!status) return forceShow ? <LoadingCards count={1} /> : null
  if (status.ready && !forceShow) return null
  return (
    <div className="adm-state" style={{ gap: 20 }}>
      <p style={{ color: 'var(--text)', fontWeight: 600 }}>Turinio valdymas dar nebaigtas nustatyti.</p>
      <ul className="adm-checks">
        {CHECKS.map(c => {
          const ok = status.checks[c.key]
          return (
            <li key={c.key}>
              <span className={ok ? 'adm-checks__ok' : 'adm-checks__bad'} aria-label={ok ? 'Gerai' : 'Trūksta'}>{ok ? '✓' : '✗'}</span>
              <span><strong>{c.title}</strong>{!ok && c.fix}</span>
            </li>
          )
        })}
      </ul>
      {status.configPath && <p style={{ fontSize: 13 }}>Nustatymų failo vieta serveryje: <span className="adm-code">{status.configPath}</span></p>}
    </div>
  )
}

// Signed in: is this account allowed? Then continue to the dashboard.
function SignedInCheck({ api, signOut }: { api: Api; signOut: () => void }) {
  const [state, setState] = useState<{ status: 'checking' } | { status: 'denied'; userId: string } | { status: 'error'; message: string }>({ status: 'checking' })
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    setState({ status: 'checking' })
    api.me()
      .then(() => navigate(PATHS.admin, true))
      .catch(e => {
        if (e instanceof ApiError && e.code === 'not_allowed') setState({ status: 'denied', userId: String(e.data.userId ?? '') })
        else setState({ status: 'error', message: e.message })
      })
  }, [api, attempt])

  if (state.status === 'checking') return <span style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-2)' }}><Spinner /> Tikrinama prieiga…</span>
  if (state.status === 'error') {
    return (
      <div className="adm-state adm-state--error" role="alert">
        <p>Nepavyko patikrinti prieigos.</p><p>{state.message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="adm-btn adm-btn--small" onClick={() => setAttempt(a => a + 1)}>Bandyti dar kartą</button>
          <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={signOut}>Atsijungti</button>
        </div>
      </div>
    )
  }
  return (
    <div className="adm-state" role="alert">
      <p style={{ color: 'var(--text)', fontWeight: 600 }}>Ši paskyra neturi prieigos prie turinio valdymo.</p>
      <p>Jei tai kliento paskyra, įrašykite šį ID į <span className="adm-code">megusta-config.php</span> (admin_user_ids) ir atnaujinkite puslapį:</p>
      <p style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="adm-code" style={{ fontSize: 15 }}>{state.userId}</span>
        <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => navigator.clipboard?.writeText(state.userId).then(() => setCopied(true))}>
          {copied ? 'Nukopijuota ✓' : 'Kopijuoti'}
        </button>
      </p>
      <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={signOut}>Atsijungti</button>
    </div>
  )
}

// --- the dashboard shell ------------------------------------------------------------------------

const NAV = [
  { group: null, items: [{ path: '', label: 'Apžvalga', icon: Icons.home }] },
  {
    group: 'Puslapiai',
    items: [
      { path: '/pagrindinis', label: 'Pagrindinis', icon: Icons.page },
      { path: '/tvarkarastis', label: 'Tvarkaraštis', icon: Icons.clock },
      { path: '/registracija', label: 'Registracija', icon: Icons.form },
    ],
  },
  {
    group: 'Turinys',
    items: [
      { path: '/naujienos', label: 'Naujienos', icon: Icons.news },
      { path: '/nuotraukos', label: 'Nuotraukos', icon: Icons.image },
      { path: '/bendri', label: 'Bendri nustatymai', icon: Icons.settings },
    ],
  },
]

function Shell({ route }: { route: Route }) {
  const { api, userLabel, signOut } = useSession()
  const [data, setData] = useState<{ sections: Partial<Record<string, SavedSection>>; seo: Record<string, SeoRecord> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([api.me(), api.content(), api.seo()])
      .then(([, content, seo]) => { if (!cancelled) setData({ sections: content.sections, seo: seo.pages }) })
      .catch(e => {
        if (cancelled) return
        if (e instanceof ApiError && (e.code === 'not_allowed' || e.status === 401)) navigate(PATHS.adminLogin, true)
        else setError(e.message)
      })
    return () => { cancelled = true }
  }, [api, attempt])

  useEffect(() => { setMenuOpen(false) }, [route.adminPath])
  useEffect(() => { document.title = 'Turinio valdymas — Me Gusta' }, [route.adminPath])

  const sub = route.adminPath === '/' ? '' : route.adminPath
  const isActive = (path: string) => (path === '' ? sub === '' : sub === path || sub.startsWith(path + '/'))

  const sidebar = (
    <aside className="adm-side" data-open={menuOpen} aria-label="Meniu">
      <a href={PATHS.admin} className="adm-side__logo">
        <img src={logo} alt="Me Gusta" width={69} height={44} />
        <span>Turinio<br />valdymas</span>
      </a>
      <nav className="adm-nav">
        {NAV.map((g, gi) => (
          <div key={gi} style={{ display: 'contents' }}>
            {g.group && <span className="adm-nav__group">{g.group}</span>}
            {g.items.map(item => (
              <a key={item.path} href={PATHS.admin + item.path} aria-current={isActive(item.path) ? 'page' : undefined}>
                {item.icon}{item.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="adm-side__foot">
        <a className="adm-side__link" href="/" target="_blank" rel="noreferrer">Atidaryti svetainę ↗</a>
        {userLabel && <span className="adm-side__user">{userLabel}</span>}
        <button type="button" className="adm-side__link" onClick={signOut}>Atsijungti</button>
        <ThemeSwitch />
      </div>
    </aside>
  )

  return (
    <div className="adm">
      <div className="adm-topbar">
        <a href={PATHS.admin}><img src={logo} alt="Me Gusta" width={56} height={36} /></a>
        <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" style={{ color: '#f0f0f0' }} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>Meniu</button>
      </div>
      {sidebar}
      <div className="adm-scrim" data-open={menuOpen} onClick={() => setMenuOpen(false)} />
      <main className="adm-main">
        <div className="adm-content">
          {error ? <ErrorState message={error} onRetry={() => setAttempt(a => a + 1)} />
            : !data ? <LoadingCards count={4} />
            : (
              <StoreProvider initial={data}>
                <AdminPage sub={sub} />
              </StoreProvider>
            )}
        </div>
      </main>
    </div>
  )
}

function AdminPage({ sub }: { sub: string }) {
  if (sub === '') return <Dashboard />
  if (sub === '/pagrindinis') return <PageEditor key="home" pageKey="home" />
  if (sub === '/tvarkarastis') return <PageEditor key="tvarkarastis" pageKey="tvarkarastis" />
  if (sub === '/registracija') return <PageEditor key="registracija" pageKey="registracija" />
  if (sub === '/bendri') return <Settings />
  if (sub === '/nuotraukos') return <MediaLibraryPage />
  if (sub === '/naujienos') return <NewsAdmin />
  if (sub === '/naujienos/naujas') return <PostEditor id="new" />
  const m = /^\/naujienos\/(\d+)$/.exec(sub)
  if (m) return <PostEditor id={Number(m[1])} />
  return <AdminNotFound />
}
