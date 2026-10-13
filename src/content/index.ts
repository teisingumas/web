import { DEFAULTS } from './defaults'
import type { ContentMap, Img, SectionKey } from './types'

export type { ContentMap, SectionKey } from './types'
export { DEFAULTS } from './defaults'

// index.php puts the saved content on the page (window.__MEGUSTA__), so edits show up on the
// next page load without a rebuild. A section that was never saved keeps its default; a saved
// one is laid over the default so fields added later still have values.
const inline = typeof window !== 'undefined' ? window.__MEGUSTA__ : undefined

export function mergeSection<K extends SectionKey>(key: K, saved: unknown): ContentMap[K] {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return DEFAULTS[key]
  return { ...DEFAULTS[key], ...(saved as Partial<ContentMap[K]>) }
}

const content = {} as ContentMap
for (const key of Object.keys(DEFAULTS) as SectionKey[]) {
  ;(content as Record<SectionKey, unknown>)[key] = mergeSection(key, inline?.content?.[key])
}

export function section<K extends SectionKey>(key: K): ContentMap[K] {
  return content[key]
}

export const inlineData = inline ?? {}

export function phoneHref(phone: string) {
  return 'tel:' + phone.replace(/[^\d+]/g, '')
}

// Show the light-theme hero photo only when one is set.
export function heroImages(hero: ContentMap['home.hero']): { dark: Img; light: Img } {
  return { dark: hero.image, light: hero.imageLight?.src ? hero.imageLight : hero.image }
}
