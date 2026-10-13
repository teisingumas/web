import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import { useApi, useToast } from './context'
import { MediaPicker } from './MediaLibrary'

// Rich text: "mini" for short texts (FAQ answers, notes: bold, italic, links, lists) and "full"
// for news posts (headings, quotes, images). The server cleans the HTML again on save.

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
      ...(full ? [Image.configure({ allowBase64: false })] : []),
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
      {editor && <Toolbar editor={editor} full={full} onImage={() => setPickerOpen(true)} />}
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
    </div>
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

function Toolbar({ editor, full, onImage }: { editor: Editor; full: boolean; onImage: () => void }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const c = () => editor.chain().focus()
  const imageSelected = full && editor.isActive('image')
  const imageAlt = imageSelected ? String(editor.getAttributes('image').alt ?? '') : ''

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
        <span className="adm-rte__sep" aria-hidden="true" />
        <Btn label="Sąrašas" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}>•&nbsp;≡</Btn>
        <Btn label="Numeruotas sąrašas" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}>1.&nbsp;≡</Btn>
        {full && <Btn label="Citata" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}>❝</Btn>}
        <Btn label="Nuoroda" active={editor.isActive('link') || linkOpen} onClick={openLink}>🔗</Btn>
        {full && (
          <>
            <Btn label="Įterpti nuotrauką" onClick={onImage}>🖼&nbsp;Nuotrauka</Btn>
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
