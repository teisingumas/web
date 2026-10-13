import { useSyncExternalStore } from 'react'

// Path-based routing: /, /tvarkarastis, /registracija. The registration page's Informacija and
// Kainos tabs are plain in-page tabs without addresses of their own.
// The server sends index.html for every path (see public/.htaccess); this module turns the
// path into a route, handles links, and keeps the old #hash addresses working.

export type Page = 'home' | 'registracija' | 'tvarkarastis'
export type RegTab = 'registracija' | 'informacija' | 'kainos'
// tab: which registration tab a navigation asks for; seq changes on every navigation so a
// page can react even when the path stays the same (e.g. "Registruotis" from the Kainos tab).
export type Route = { page: Page; tab: RegTab; seq: number }

export const PATHS = {
  home: '/',
  timetable: '/tvarkarastis',
  registration: '/registracija',
} as const

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

function parse(path: string): Route {
  const p = path.replace(/\/+$/, '').toLowerCase() || '/'
  if (p === PATHS.timetable) return { page: 'tvarkarastis', tab: 'registracija', seq }
  if (OLD_TAB_PATHS[p]) return { page: 'registracija', tab: OLD_TAB_PATHS[p], seq }
  if (p === PATHS.registration) return { page: 'registracija', tab: 'registracija', seq }
  return { page: 'home', tab: 'registracija', seq }
}

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

// Navigate to "/path" or "/path#section" without reloading.
export function navigate(href: string, replace = false) {
  const [path, hashPart] = href.split('#')
  const hash = hashPart ? '#' + hashPart : ''
  const samePage = parse(path || '/').page === route.page && parse(path || '/').tab === route.tab
  try {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', (path || '/') + hash)
    memoryPath = null
  } catch {
    memoryPath = path || '/'
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
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault()
      navigate(href)
    } else if (href.startsWith('#') && href.length > 1 && route.page !== 'home') {
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
