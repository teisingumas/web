import { useSyncExternalStore } from 'react'

// Path-based routing. The server sends every unknown path to index.php (see public/.htaccess),
// which renders the right meta tags; this module turns the path into a route, handles links,
// and keeps the old #hash addresses working.
//   /                      home
//   /tvarkarastis          timetable
//   /registracija          registration (Informacija and Kainos are in-page tabs)
//   /naujienos, /naujienos/2 …   news list with pages
//   /kalendorius           event calendar;  /kalendorius/<slug>  one event
//   /<slug>                a news post (the same addresses the old WordPress site used)
//   /adminas               admin sign-in;  /apzvalga/…  admin dashboard

export type Page = 'home' | 'registracija' | 'tvarkarastis' | 'naujienos' | 'kalendorius' | 'event' | 'post' | 'notfound' | 'admin-login' | 'admin'
export type RegTab = 'registracija' | 'informacija' | 'kainos'
// tab: which registration tab a navigation asks for; seq changes on every navigation so a
// page can react even when the path stays the same (e.g. "Registruotis" from the Kainos tab).
export type Route = { page: Page; tab: RegTab; seq: number; slug: string; pageNum: number; adminPath: string; path: string }

export const PATHS = {
  home: '/',
  timetable: '/tvarkarastis',
  registration: '/registracija',
  news: '/naujienos',
  calendar: '/kalendorius',
  adminLogin: '/adminas',
  admin: '/apzvalga',
} as const

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const newsPagePath = (n: number) => (n > 1 ? `${PATHS.news}/${n}` : PATHS.news)

// Earlier builds gave the tabs their own paths; those addresses still open the right tab.
const OLD_TAB_PATHS: Record<string, RegTab> = {
  '/registracija/informacija': 'informacija',
  '/registracija/kainos': 'kainos',
}

// Old hash addresses from earlier builds and bookmarks.
const LEGACY_HASHES: Record<string, string> = {
  '#tvarkarastis-pilnas': PATHS.timetable,
  '#registracija': PATHS.registration,
  '#registracija-informacija': '/registracija/informacija',
  '#registracija-kainos': '/registracija/kainos',
}

let seq = 0

function parse(rawPath: string): Route {
  let decoded = rawPath
  try { decoded = decodeURIComponent(rawPath) } catch { /* keep as is */ }
  const p = decoded.replace(/\/+$/, '').toLowerCase() || '/'
  const base = { tab: 'registracija' as RegTab, seq, slug: '', pageNum: 1, adminPath: '', path: p }
  if (p === '/') return { ...base, page: 'home' }
  if (p === PATHS.timetable) return { ...base, page: 'tvarkarastis' }
  if (OLD_TAB_PATHS[p]) return { ...base, page: 'registracija', tab: OLD_TAB_PATHS[p] }
  if (p === PATHS.registration) return { ...base, page: 'registracija' }
  if (p === PATHS.news) return { ...base, page: 'naujienos' }
  const news = /^\/naujienos\/(\d{1,4})$/.exec(p)
  if (news && Number(news[1]) >= 1) return { ...base, page: 'naujienos', pageNum: Number(news[1]) }
  if (p === PATHS.calendar) return { ...base, page: 'kalendorius' }
  const event = /^\/kalendorius\/([^/]+)$/.exec(p)
  if (event) return SLUG_RE.test(event[1]) ? { ...base, page: 'event', slug: event[1] } : { ...base, page: 'notfound' }
  if (p === PATHS.adminLogin) return { ...base, page: 'admin-login' }
  if (p === PATHS.admin || p.startsWith(PATHS.admin + '/')) return { ...base, page: 'admin', adminPath: p.slice(PATHS.admin.length) || '/' }
  const slug = p.slice(1)
  if (SLUG_RE.test(slug)) return { ...base, page: 'post', slug }
  return { ...base, page: 'notfound' }
}

export const isAdminPage = (page: Page) => page === 'admin' || page === 'admin-login'

// Old tab paths are shown as plain /registracija.
function normalizeAddress() {
  if (!OLD_TAB_PATHS[window.location.pathname.replace(/\/+$/, '').toLowerCase()]) return
  try { window.history.replaceState(null, '', PATHS.registration) } catch { /* preview frames */ }
}

// Inside some embedded previews the URL cannot be changed; then the route lives in memory only.
let memoryPath: string | null = null
const listeners = new Set<() => void>()
const currentPath = () => memoryPath ?? window.location.pathname
let route = parse(currentPath())

function emit() {
  seq += 1
  route = parse(currentPath())
  listeners.forEach(l => l())
}

function scrollToHash(hash: string) {
  const el = hash.length > 1 ? document.getElementById(hash.slice(1)) : null
  if (el) el.scrollIntoView()
}

// Pages with unsaved edits (the admin forms) can stop a navigation; return false to stay.
const guards = new Set<() => boolean>()
export function addNavigationGuard(guard: () => boolean) {
  guards.add(guard)
  return () => { guards.delete(guard) }
}

// Navigate to "/path" or "/path#section" without reloading.
export function navigate(href: string, replace = false) {
  for (const guard of guards) if (!guard()) return
  const [pathAndQuery, hashPart] = href.split('#')
  const path = pathAndQuery.split('?')[0] || '/'
  const hash = hashPart ? '#' + hashPart : ''
  const next = parse(path)
  const samePage = next.path === route.path && next.tab === route.tab
  try {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', (pathAndQuery || '/') + hash)
    memoryPath = null
  } catch {
    memoryPath = path
  }
  emit()
  normalizeAddress()
  if (samePage && hash) scrollToHash(hash)
  else if (!hash) window.scrollTo({ top: 0, behavior: 'instant' })
  // a different page with a #section scrolls once it has rendered (see App)
}

export function useRoute(): Route {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => route,
  )
}

// One document-level handler: internal "/..." links navigate in place, old #hash links are
// translated, and plain #section links on an inner page lead to that section of the home page.
export function installLinkHandling() {
  const legacy = LEGACY_HASHES[window.location.hash]
  if (legacy) navigate(legacy, true)
  else normalizeAddress()

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as HTMLElement).closest('a')
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return
    const href = a.getAttribute('href')
    if (!href) return
    if (LEGACY_HASHES[href]) {
      e.preventDefault()
      navigate(LEGACY_HASHES[href])
    } else if (href.startsWith('/') && !href.startsWith('//') && !/^\/(media|api|img|assets)\//.test(href)) {
      e.preventDefault()
      navigate(href)
    } else if (href.startsWith('#') && href.length > 1 && route.page !== 'home' && !isAdminPage(route.page)) {
      e.preventDefault()
      navigate('/' + href)
    }
  }
  const onPop = () => emit()
  const onHash = () => {
    const to = LEGACY_HASHES[window.location.hash]
    if (to) navigate(to, true)
  }
  document.addEventListener('click', onClick)
  window.addEventListener('popstate', onPop)
  window.addEventListener('hashchange', onHash)
  return () => {
    document.removeEventListener('click', onClick)
    window.removeEventListener('popstate', onPop)
    window.removeEventListener('hashchange', onHash)
  }
}

// Switch the registration page's tab from a link inside it (FAQ "kainos" links).
export const TAB_EVENT = 'megusta:registration-tab'
export function showRegistrationTab(tab: RegTab) {
  window.dispatchEvent(new CustomEvent<RegTab>(TAB_EVENT, { detail: tab }))
}
