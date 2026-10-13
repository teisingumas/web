// Content shapes. They mirror schema.json (the admin forms and the server validate against it).

export type Img = { src: string; alt: string; x?: number; y?: number }

export type SlotStatus = 'Renkama grupė' | 'Uždara grupė' | 'Laisvas laikas'

export type ContentMap = {
  'global.contacts': { email: string; phone: string; address: string }
  'global.socials': { facebook: string; instagram: string; tiktok: string; youtube: string }
  'global.footer': { text: string; tagline: string }
  'global.seo': { siteName: string; ogImage: Img }
  'home.hero': {
    kicker: string; line1: string; line2: string; line3: string; text: string
    primaryCta: string; secondaryCta: string; image: Img; imageLight: Img
  }
  'home.stats': { items: { num: string; label: string }[] }
  'home.styles': {
    kicker: string; title1: string; title2: string; button: string
    items: { name: string; tagline: string; description: string; image: Img; levels: string[] }[]
  }
  'home.schedule': {
    kicker: string; title: string; note: string
    days: { day: string; classes: { time: string; duration: string; style: string; age: string }[] }[]
  }
  pricing: {
    kicker: string; title: string; badge: string; note: string
    plans: { name: string; desc: string; price: string; period: string; features: string[]; highlight: boolean; cta: string }[]
  }
  'home.trainers': {
    kicker: string; title: string
    items: { name: string; specialty: string; experience: string; bio: string; color: string; image: Img }[]
  }
  'home.cta': { kicker: string; line1: string; line2: string; button: string }
  timetable: {
    kicker: string; title: string; validFrom: string; season: string; note: string; emptyText: string
    halls: { label: string; days: { day: string; slots: { status: SlotStatus; start: string; end: string; group: string; trainer: string }[] }[] }[]
  }
  registration: {
    kicker: string; intro: string; infoIntro: string; styleOptions: string[]; sourceOptions: string[]
    formNote: string; consent: string; freeNote: string; steps: string[]; hours: { days: string; hours: string }[]
  }
  'registration.faq': { groups: { title: string; items: { q: string; a: string }[] }[] }
  news: { kicker: string; title: string; intro: string; emptyText: string }
}

export type SectionKey = keyof ContentMap

export type PageSeo = { title: string; description: string; keywords: string; ogImage: Img; noindex: boolean }

// A published post as the public pages show it.
export type PostCard = { slug: string; title: string; excerpt: string; cover: Img; publishedAt: string | null }
export type Post = PostCard & { bodyHtml: string; updatedAt?: string }
export type PostPage = { items: PostCard[]; page: number; pages: number; total: number }

// What index.php puts on the page (window.__MEGUSTA__).
export type InlineData = {
  content?: Partial<Record<SectionKey, unknown>>
  titles?: Record<string, string>
  view?:
    | { type: 'news'; page: number; data: PostPage }
    | { type: 'post'; slug: string; post: Post }
    | { type: 'notfound'; path: string }
  clerkPublishableKey?: string
}

declare global {
  interface Window { __MEGUSTA__?: InlineData }
}
