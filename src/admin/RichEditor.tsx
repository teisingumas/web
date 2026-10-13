import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import { useApi, useToast } from './context'
import { Gallery, TextAlign, Youtube, youtubeId, type Align } from './editorExtensions'
import { MediaMultiPicker, MediaPicker } from './MediaLibrary'

// Rich text: "mini" for short texts (FAQ answers, notes: bold, italic, links, lists) and "full"
// for news posts (headings, quotes, alignment, images, galleries, YouTube videos). The server cleans the HTML again on save.

type Props = {
  id: string
  variant: 'mini' | 'full'
  value: string
  onChange: (html: string) => void
  invalid?: boolean
  describedBy?: string
  label?: string
  placeholder?: string
}

function normalizeUrl(raw: string) {
  const url = raw.trim()
  if (!url) return ''
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) return url
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return 'mailto:' + url
  return 'https://' + url
}

export default function RichEditor({ id, variant, value, onChange, invalid, describedBy, label, placeholder }: Props) {
  const api = useApi()
  const toast = useToast()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const lastHtml = useRef(value)
  const [uploading, setUploading] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [galleryPicker, setGalleryPicker] = useState<'new' | 'add' | null>(null)
  const full = variant === 'full'
  const editorRef = useRef<Editor | null>(null)

  // Files dropped or pasted into a post: upload, then insert where they landed.
  const uploadInto = (files: File[], pos?: number) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!full || images.length === 0) return false
    for (const file of images) {
      setUploading(n => n + 1)
      api.upload(file)
        .then(item => {
          const ed = editorRef.current
          if (!ed) return
          const chain = ed.chain().focus()
          if (pos !== undefined) chain.insertContentAt(pos, { type: 'image', attrs: { src: item.src, alt: item.alt } })
          else chain.setImage({ src: item.src, alt: item.alt })
          chain.run()
          toast.success('Nuotrauka įkelta. Pažymėkite ją ir įrašykite alt tekstą.')
        })
        .catch(err => toast.error(err.message))
        .finally(() => setUploading(n => n - 1))
    }
    return true
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: full ? { levels: [2, 3] } : false,
        blockquote: full ? {} : false,
        horizontalRule: full ? {} : false,
        strike: full ? {} : false,
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      ...(full ? [Image.configure({ allowBase64: false }), TextAlign, Youtube, Gallery] : []),
      Placeholder.configure({ placeholder: placeholder ?? (full ? 'Rašykite naujienos tekstą…' : 'Rašykite tekstą…') }),
    ],
    content: value || '',
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(label ? { 'aria-label': label } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (!files.length) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        return uploadInto(files, pos)
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? [])
        if (!files.length) return false
        return uploadInto(files)
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML()
      lastHtml.current = html
      onChangeRef.current(html)
    },
  })
  editorRef.current = editor

  // A value set from outside (form reset, loaded post) replaces the editor content.
  useEffect(() => {
    if (!editor || value === lastHtml.current) return
    lastHtml.current = value
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  // aria-invalid on the editable area
  useEffect(() => {
    editor?.view.dom.setAttribute('aria-invalid', String(!!invalid))
  }, [editor, invalid])

  return (
    <div className={`adm-rte${full ? ' adm-rte--full' : ''}`} aria-invalid={invalid}>
      {editor && <Toolbar editor={editor} full={full} onImage={() => setPickerOpen(true)} onGallery={mode => setGalleryPicker(mode)} />}
      <EditorContent editor={editor} />
      {uploading > 0 && <div className="adm-rte__uploading"><span className="adm-spinner" /> Įkeliama nuotrauka…</div>}
      {pickerOpen && (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onSelect={item => {
            editor?.chain().focus().setImage({ src: item.src, alt: item.alt }).run()
            setPickerOpen(false)
          }}
        />
      )}
      {galleryPicker && (
        <MediaMultiPicker
          title={galleryPicker === 'add' ? 'Pridėti nuotraukų į galeriją' : 'Galerijos nuotraukos'}
          confirmLabel={galleryPicker === 'add' ? 'Pridėti' : 'Įterpti galeriją'}
          onClose={() => setGalleryPicker(null)}
          onDone={items => {
            const images = items.map(i => ({ src: i.src, alt: i.alt }))
            const end = galleryPicker === 'add' && editor ? galleryEnd(editor) : null
            if (end !== null) editor?.chain().focus().insertContentAt(end, images.map(i => ({ type: 'image', attrs: i }))).run()
            else editor?.chain().focus().insertGallery(images).run()
            setGalleryPicker(null)
          }}
        />
      )}
    </div>
  )
}

/** Position at the end of the gallery the cursor is in, or null. */
function galleryEnd(editor: Editor): number | null {
  const { $from } = editor.state.selection
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === 'gallery') return $from.end(d)
  return null
}

const ALIGN_PATHS: Record<Align, string> = {
  left: 'M3 5h18M3 10h12M3 15h18M3 20h12',
  center: 'M3 5h18M6 10h12M3 15h18M6 20h12',
  right: 'M3 5h18M9 10h12M3 15h18M9 20h12',
  justify: 'M3 5h18M3 10h18M3 15h18M3 20h18',
}
const ALIGN_LABELS: Record<Align, string> = { left: 'Lygiuoti kairėje', center: 'Centruoti', right: 'Lygiuoti dešinėje', justify: 'Lygiuoti abiejuose kraštuose' }

function AlignIcon({ align }: { align: Align }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d={ALIGN_PATHS[align]} />
    </svg>
  )
}

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="adm-rte__btn" aria-label={label} title={label} aria-pressed={active} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  )
}

function Toolbar({ editor, full, onImage, onGallery }: { editor: Editor; full: boolean; onImage: () => void; onGallery: (mode: 'new' | 'add') => void }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')
  const c = () => editor.chain().focus()
  const imageSelected = full && editor.isActive('image')
  const imageAlt = imageSelected ? String(editor.getAttributes('image').alt ?? '') : ''
  const videoSelected = full && editor.isActive('youtube')
  const inGallery = full && galleryEnd(editor) !== null
  const alignOf = (a: Align) => {
    const cur = (['paragraph', 'heading', 'blockquote'].map(t => editor.getAttributes(t).textAlign).find(Boolean) as Align | undefined) ?? 'left'
    return cur === a
  }

  const applyVideo = () => {
    const id = youtubeId(videoUrl)
    if (!id) { setVideoError('Nepavyko atpažinti YouTube nuorodos. Įklijuokite adresą, pvz. https://www.youtube.com/watch?v=…'); return }
    c().setYoutube(id).run()
    setVideoOpen(false); setVideoUrl(''); setVideoError('')
  }

  const openLink = () => {
    setUrl(String(editor.getAttributes('link').href ?? ''))
    setLinkOpen(true)
  }
  const applyLink = () => {
    const href = normalizeUrl(url)
    if (!href) {
      c().extendMarkRange('link').unsetLink().run()
    } else if (editor.state.selection.empty && !editor.isActive('link')) {
      c().insertContent({ type: 'text', text: url.trim(), marks: [{ type: 'link', attrs: { href } }] }).run()
    } else {
      c().extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
  }

  return (
    <>
      <div className={`adm-rte__bar${full ? ' adm-rte__bar--sticky' : ''}`} role="toolbar" aria-label="Teksto formatavimas">
        {full && (
          <>
            <Btn label="Pastraipa" active={editor.isActive('paragraph')} onClick={() => c().setParagraph().run()}>¶</Btn>
            <Btn label="Antraštė H2" active={editor.isActive('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</Btn>
            <Btn label="Paantraštė H3" active={editor.isActive('heading', { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</Btn>
            <span className="adm-rte__sep" aria-hidden="true" />
          </>
        )}
        <Btn label="Paryškinti" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><b>B</b></Btn>
        <Btn label="Pasvirasis" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><i>I</i></Btn>
        {full && <Btn label="Pabraukti" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><u>U</u></Btn>}
        {full && (
          <>
            <span className="adm-rte__sep" aria-hidden="true" />
            {(['left', 'center', 'right', 'justify'] as Align[]).map(a => (
              <Btn key={a} label={ALIGN_LABELS[a]} active={alignOf(a)} onClick={() => c().setTextAlign(a).run()}><AlignIcon align={a} /></Btn>
            ))}
          </>
        )}
        <span className="adm-rte__sep" aria-hidden="true" />
        <Btn label="Sąrašas" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}>•&nbsp;≡</Btn>
        <Btn label="Numeruotas sąrašas" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}>1.&nbsp;≡</Btn>
        {full && <Btn label="Citata" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}>❝</Btn>}
        <Btn label="Nuoroda" active={editor.isActive('link') || linkOpen} onClick={openLink}>🔗</Btn>
        {full && (
          <>
            <Btn label="Įterpti nuotrauką" onClick={onImage}>🖼&nbsp;Nuotrauka</Btn>
            <Btn label="Įterpti nuotraukų galeriją" active={inGallery} onClick={() => onGallery('new')}>▦&nbsp;Galerija</Btn>
            <Btn label="Įterpti YouTube vaizdo įrašą" active={videoOpen || videoSelected} onClick={() => { setVideoError(''); setVideoOpen(o => !o) }}>▶&nbsp;YouTube</Btn>
            <Btn label="Skiriamoji linija" onClick={() => c().setHorizontalRule().run()}>―</Btn>
          </>
        )}
        <span className="adm-rte__sep" aria-hidden="true" />
        <Btn label="Atšaukti" disabled={!editor.can().undo()} onClick={() => c().undo().run()}>↶</Btn>
        <Btn label="Grąžinti" disabled={!editor.can().redo()} onClick={() => c().redo().run()}>↷</Btn>
      </div>
      {linkOpen && (
        <div className="adm-rte__link">
          <input
            className="adm-input" autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… arba /tvarkarastis"
            aria-label="Nuorodos adresas"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink() }
              if (e.key === 'Escape') setLinkOpen(false)
            }}
          />
          <button type="button" className="adm-btn adm-btn--small" onClick={applyLink}>Taikyti</button>
          {editor.isActive('link') && (
            <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => { c().extendMarkRange('link').unsetLink().run(); setLinkOpen(false) }}>Pašalinti</button>
          )}
          <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setLinkOpen(false)}>Atšaukti</button>
        </div>
      )}
      {videoOpen && (
        <div className="adm-rte__link">
          <input
            className="adm-input" autoFocus value={videoUrl} onChange={e => { setVideoUrl(e.target.value); setVideoError('') }}
            placeholder="YouTube nuoroda, pvz. https://www.youtube.com/watch?v=…" aria-label="YouTube nuoroda" aria-invalid={!!videoError}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); applyVideo() }
              if (e.key === 'Escape') setVideoOpen(false)
            }}
          />
          <button type="button" className="adm-btn adm-btn--small" onClick={applyVideo}>Įterpti vaizdo įrašą</button>
          <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => setVideoOpen(false)}>Atšaukti</button>
          {videoError && <p className="adm-error" style={{ flexBasis: '100%', margin: 0 }}>{videoError}</p>}
          <p className="adm-help" style={{ flexBasis: '100%', margin: 0 }}>Vaizdo įrašas rodomas iki 1200 px pločio ir prisitaiko prie telefono ekrano.</p>
        </div>
      )}
      {videoSelected && (
        <div className="adm-rte__link">
          <span className="adm-help" style={{ alignSelf: 'center', margin: 0, flex: 1 }}>Pažymėtas YouTube vaizdo įrašas.</span>
          <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => c().deleteSelection().run()}>Pašalinti vaizdo įrašą</button>
        </div>
      )}
      {inGallery && (
        <div className="adm-rte__link">
          <span className="adm-help" style={{ alignSelf: 'center', margin: 0, flex: 1 }}>Galerija: paspaudus nuotrauką galite įrašyti jos alt tekstą arba ją pašalinti.</span>
          <button type="button" className="adm-btn adm-btn--small" onClick={() => onGallery('add')}>+ Pridėti nuotraukų</button>
          <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => {
            const { $from } = editor.state.selection
            for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === 'gallery') {
              editor.chain().focus().deleteRange({ from: $from.before(d), to: $from.after(d) }).run()
              return
            }
          }}>Pašalinti galeriją</button>
        </div>
      )}
      {imageSelected && (
        <div className="adm-rte__link">
          <input
            className="adm-input" value={imageAlt} aria-label="Pažymėtos nuotraukos alt tekstas"
            placeholder="Alt tekstas: trumpai aprašykite, kas nuotraukoje"
            onChange={e => editor.chain().updateAttributes('image', { alt: e.target.value }).run()}
          />
          <button type="button" className="adm-btn adm-btn--small adm-btn--danger" onClick={() => c().deleteSelection().run()}>Pašalinti nuotrauką</button>
        </div>
      )}
    </>
  )
}
