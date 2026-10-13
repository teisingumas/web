// Admin API client. Every call carries the Clerk session token; PUT/PATCH/DELETE go out as
// POST + X-HTTP-Method-Override because some shared-hosting firewalls block those methods.

import type { Img, PageSeo, SectionKey } from '../content/types'

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  data: Record<string, unknown>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
    this.data = data
  }
}

export const NETWORK_MESSAGE = 'Nėra ryšio su serveriu. Patikrinkite internetą ir bandykite dar kartą.'

export type TokenGetter = () => Promise<string | null>

export type SavedSection = { data: Record<string, unknown>; updatedAt: string | null }
export type SeoRecord = PageSeo & { updatedAt: string | null }

export type AdminPost = {
  id: number
  slug: string
  status: 'draft' | 'published'
  title: string
  excerpt: string
  bodyHtml: string
  cover: Img
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  publishedAt: string | null
  /** published, but its publishing time is still ahead */
  scheduled: boolean
  createdAt: string
  updatedAt: string
}
// publishedAt: "YYYY-MM-DDTHH:MM" in Lithuanian time, or '' for automatic
export type PostInput = Omit<AdminPost, 'id' | 'publishedAt' | 'scheduled' | 'createdAt' | 'updatedAt'> & { slugAuto?: boolean; publishedAt: string }
export type PostList = {
  items: Omit<AdminPost, 'bodyHtml'>[]
  total: number
  page: number
  pages: number
  counts: { all: number; draft: number; published: number }
}

export type MediaItem = {
  id: number
  src: string
  fileName: string
  originalName: string
  width: number
  height: number
  size: number
  alt: string
  createdAt: string
  duplicate?: boolean
}

export type SetupStatus = {
  ready: boolean
  checks: Record<'php' | 'config' | 'database' | 'clerk' | 'admins' | 'storage' | 'images', boolean>
  phpVersion: string
  configPath?: string
}

async function parse(res: Response) {
  const data = await res.json().catch(() => null) as Record<string, unknown> | null
  if (res.ok) return data
  const message = typeof data?.message === 'string' ? data.message : `Serverio klaida (${res.status}). Bandykite dar kartą.`
  throw new ApiError(res.status, typeof data?.error === 'string' ? data.error : 'http', message, (data?.fields as Record<string, string>) ?? {}, data ?? {})
}

export async function fetchStatus(): Promise<SetupStatus> {
  let res: Response
  try {
    res = await fetch('/api/status', { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(0, 'network', NETWORK_MESSAGE)
  }
  return parse(res) as Promise<SetupStatus>
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const formatMb = (bytes: number) => (bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`)

/** Lithuanian message for a file the server would reject anyway, or null. */
export function checkUpload(file: File): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return `„${file.name}“ nėra JPG, PNG ar WebP nuotrauka.`
  if (file.size > MAX_UPLOAD_BYTES) {
    return `„${file.name}“ per didelė (${formatMb(file.size)}). Didžiausias dydis — 2 MB. Sumažinkite nuotrauką, pvz. nemokamai svetainėje squoosh.app.`
  }
  return null
}

export function createApi(getToken: TokenGetter) {
  async function headers(extra: Record<string, string> = {}) {
    const token = await getToken()
    if (!token) throw new ApiError(401, 'unauthorized', 'Sesija baigėsi. Prisijunkite iš naujo.')
    return { Accept: 'application/json', Authorization: `Bearer ${token}`, ...extra }
  }

  async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const h = await headers(body === undefined ? {} : { 'Content-Type': 'application/json' })
    const init: RequestInit = { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }
    if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      init.method = 'POST'
      ;(init.headers as Record<string, string>)['X-HTTP-Method-Override'] = method
    }
    let res: Response
    try {
      res = await fetch('/api' + path, init)
    } catch {
      throw new ApiError(0, 'network', NETWORK_MESSAGE)
    }
    return parse(res) as Promise<T>
  }

  return {
    me: () => request<{ userId: string }>('GET', '/admin/me'),
    content: () => request<{ sections: Partial<Record<SectionKey, SavedSection>> }>('GET', '/admin/content'),
    saveSection: (key: SectionKey, data: unknown) => request<SavedSection>('PUT', `/admin/content/${key}`, { data }),
    seo: () => request<{ pages: Record<string, SeoRecord> }>('GET', '/admin/seo'),
    saveSeo: (page: string, seo: PageSeo) => request<SeoRecord>('PUT', `/admin/seo/${page}`, seo),
    posts: (params: { status?: string; q?: string; page?: number }) =>
      request<PostList>('GET', `/admin/posts?${new URLSearchParams({ status: params.status ?? '', q: params.q ?? '', page: String(params.page ?? 1) })}`),
    post: (id: number) => request<AdminPost>('GET', `/admin/posts/${id}`),
    createPost: (post: PostInput) => request<AdminPost>('POST', '/admin/posts', post),
    updatePost: (id: number, post: PostInput) => request<AdminPost>('PUT', `/admin/posts/${id}`, post),
    deletePost: (id: number) => request<{ ok: true }>('DELETE', `/admin/posts/${id}`),
    slugCheck: (slug: string, id?: number) =>
      request<{ ok: boolean; message: string | null }>('GET', `/admin/posts/slug-check?${new URLSearchParams({ slug, ...(id ? { id: String(id) } : {}) })}`),
    media: () => request<{ items: MediaItem[] }>('GET', '/admin/media'),
    updateMediaAlt: (id: number, alt: string) => request<MediaItem>('PATCH', `/admin/media/${id}`, { alt }),
    deleteMedia: (id: number) => request<{ ok: true }>('DELETE', `/admin/media/${id}`),

    /** Upload with progress (fetch cannot report upload progress). */
    async upload(file: File, alt = '', onProgress?: (fraction: number) => void): Promise<MediaItem> {
      const problem = checkUpload(file)
      if (problem) throw new ApiError(422, 'client', problem)
      const h = await headers()
      const form = new FormData()
      form.append('file', file)
      form.append('alt', alt)
      return new Promise<MediaItem>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/admin/media')
        for (const [k, v] of Object.entries(h)) xhr.setRequestHeader(k, v)
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total) }
        xhr.onerror = () => reject(new ApiError(0, 'network', NETWORK_MESSAGE))
        xhr.onload = () => {
          parse(new Response(xhr.responseText, { status: xhr.status })).then(d => resolve(d as MediaItem), reject)
        }
        xhr.send(form)
      })
    },
  }
}

export type Api = ReturnType<typeof createApi>
