import type { EventDetail, EventsData, Post, PostPage } from './content/types'

// Read-only calls for the public pages. The first page load usually has the data inline
// (index.php), so these run only when the visitor moves between pages in the app.

export const NEWS_PER_PAGE = 6

export class NotFoundError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new NotFoundError()
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchNewsPage = (page: number) => getJson<PostPage>(`/api/public/posts?page=${page}`)
export const fetchPost = (slug: string) => getJson<Post>(`/api/public/posts/${encodeURIComponent(slug)}`)

export const fetchEvents = () => getJson<EventsData>('/api/public/events')
export const fetchEvent = (slug: string) => getJson<EventDetail>(`/api/public/events/${encodeURIComponent(slug)}`)

const dateFormat = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Vilnius' })

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFormat.format(d)
}
