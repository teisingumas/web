import { useSyncExternalStore } from 'react'

// Path-based routing: /, /tvarkarastis, /registracija, /registracija/informacija, /registracija/kainos.
// The server sends index.html for every path (see public/.htaccess); this module turns the
// path into a route, handles links, and keeps the old #hash addresses working.

export type Page = 'home' | 'registracija' | 'tvarkarastis'
export type RegTab = 'registracija' | 'informacija' | 'kainos'
export type Route = { page: Page; tab: RegTab }

export const PATHS = {
  home: '/',
  timetable: '/tvarkarastis',
  registration: '/registracija',
  info: '/registracija/informacija',
  prices: '/registracija/kainos',
} as const

// Old hash addresses from earlier builds and bookmarks.
const LEGACY_HASHES: Record<string, string> = {
  '#tvarkarastis-pilnas': PATHS.timetable,
  '#registracija': PATHS.registration,
  '#registracija-informacija': PATHS.info,
  '#registracija-kainos': PATHS.prices,
}

function parse(path: string): Route {
  const p = path.replace(/\/+$/, '').toLowerCase() || '/'
  if (p === PATHS.timetable) return { page: 'tvarkarastis', tab: 'registracija' }
  if (p === PATHS.info) return { page: 'registracija', tab: 'informacija' }
  if (p === PATHS.prices) return { page: 'registracija', tab: 'kainos' }
  if (p === PATHS.registration) return { page: 'registracija', tab: 'registracija' }
  return { page: 'home', tab: 'registracija' }
}

// Inside some embedded previews the URL cannot be changed; then the route lives in memory only.
let memoryPath: string | null = null
const listeners = new Set<() => void>()
const currentPath = () => memoryPath ?? window.location.pathname
let route = parse(currentPath())

function emit() {
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
