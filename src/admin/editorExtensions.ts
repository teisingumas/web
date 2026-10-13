import { Extension, Node, mergeAttributes } from '@tiptap/core'

// Extra blocks for the news editor: text alignment, a YouTube video and an image gallery.
// What they write is rebuilt by server/lib/sanitize.php, so only these shapes reach the site.

// --- text alignment -----------------------------------------------------------------------------

export type Align = 'left' | 'center' | 'right' | 'justify'
const ALIGNS: Align[] = ['left', 'center', 'right', 'justify']

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: { setTextAlign: (align: Align) => ReturnType }
    youtube: { setYoutube: (id: string) => ReturnType }
    gallery: { insertGallery: (images: { src: string; alt: string }[]) => ReturnType }
  }
}

export const TextAlign = Extension.create({
  name: 'textAlign',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'blockquote'],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el: HTMLElement) => {
            const v = el.style.textAlign as Align
            return v && v !== 'left' && ALIGNS.includes(v) ? v : null
          },
          renderHTML: (attrs: Record<string, unknown>) => (attrs.textAlign ? { style: `text-align:${attrs.textAlign}` } : {}),
        },
      },
    }]
  },
  addCommands() {
    return {
      // "left" is the default and is stored as no value
      setTextAlign: align => ({ commands }) =>
        ['paragraph', 'heading', 'blockquote'].map(type => commands.updateAttributes(type, { textAlign: align === 'left' ? null : align })).some(Boolean),
    }
  },
})

// --- YouTube ------------------------------------------------------------------------------------

/** The 11-character video id from a YouTube address (watch, youtu.be, embed, shorts, live), or null. */
export function youtubeId(raw: string): string | null {
  const text = raw.trim()
  if (/^[\w-]{11}$/.test(text)) return text
  let url: URL
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`) } catch { return null }
  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null
}

export const Youtube = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { id: { default: '' } }
  },
  parseHTML() {
    return [{ tag: 'div[data-youtube]', getAttrs: el => ({ id: (el as HTMLElement).getAttribute('data-youtube') ?? '' }) }]
  },
  renderHTML({ node }) {
    const id = String(node.attrs.id)
    return ['div', mergeAttributes({ class: 'yt-embed', 'data-youtube': id }),
      ['iframe', {
        src: `https://www.youtube-nocookie.com/embed/${id}`, title: 'YouTube vaizdo įrašas', loading: 'lazy',
        allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen', allowfullscreen: 'true',
        referrerpolicy: 'strict-origin-when-cross-origin',
      }]]
  },
  addCommands() {
    return {
      setYoutube: id => ({ commands }) => commands.insertContent({ type: this.name, attrs: { id } }),
    }
  },
})

// --- gallery ------------------------------------------------------------------------------------

export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image+',
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-gallery]' }]
  },
  renderHTML() {
    return ['div', { class: 'gallery', 'data-gallery': '' }, 0]
  },
  addCommands() {
    return {
      insertGallery: images => ({ commands }) => commands.insertContent({
        type: this.name,
        content: images.map(i => ({ type: 'image', attrs: { src: i.src, alt: i.alt } })),
      }),
    }
  },
})
