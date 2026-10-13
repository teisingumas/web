import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import type { SectionKey } from '../content/types'
import { addNavigationGuard } from '../router'
import type { Api, SavedSection, SeoRecord } from './api'

// --- API + signed-in user -------------------------------------------------------------------

type Session = { api: Api; userLabel: string; signOut: () => void }
const SessionContext = createContext<Session | null>(null)
export const SessionProvider = SessionContext.Provider
export function useSession() {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession outside SessionProvider')
  return s
}
export const useApi = () => useSession().api

// --- toasts ----------------------------------------------------------------------------------

type Toast = { id: number; kind: 'success' | 'error'; text: string }
type Toaster = { success: (text: string) => void; error: (text: string) => void }
const ToastContext = createContext<Toaster>({ success: () => {}, error: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), [])
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = nextId.current++
    setToasts(t => [...t.slice(-3), { id, kind, text }])
    window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000)
  }, [dismiss])
  const value = useMemo(() => ({ success: (t: string) => push('success', t), error: (t: string) => push('error', t) }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`adm-toast${t.kind === 'error' ? ' adm-toast--error' : ''}`} role={t.kind === 'error' ? 'alert' : undefined}>
            <span>{t.text}</span>
            <button type="button" aria-label="Uždaryti" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// --- confirm dialog ----------------------------------------------------------------------------

type ConfirmOptions = { title: string; text?: React.ReactNode; confirm?: string; cancel?: string; danger?: boolean }
const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const ask = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...o, resolve })), [])
  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && (
        <Modal title={pending.title} onClose={() => close(false)}
          footer={<>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => close(false)}>{pending.cancel ?? 'Atšaukti'}</button>
            <button type="button" className={`adm-btn${pending.danger ? ' adm-btn--danger' : ''}`} onClick={() => close(true)} autoFocus>{pending.confirm ?? 'Taip'}</button>
          </>}>
          {pending.text && <div className="adm-modal__text">{pending.text}</div>}
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function Modal({ title, onClose, children, footer, size }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; size?: 'wide' | 'full'
}) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [])
  return (
    <div className="adm-modal" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} className={`adm-modal__panel${size ? ` adm-modal__panel--${size}` : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="adm-modal__head">
          <h2 className="adm-h2" style={{ fontSize: 22 }}>{title}</h2>
          <button type="button" className="adm-icon-btn" aria-label="Uždaryti" onClick={onClose}>×</button>
        </div>
        <div className="adm-modal__body">{children}</div>
        {footer && <div className="adm-modal__foot">{footer}</div>}
      </div>
    </div>
  )
}

// --- unsaved changes -------------------------------------------------------------------------
// Forms report whether they have unsaved edits; leaving the page then asks first.

const DirtyContext = createContext<(id: string, dirty: boolean) => void>(() => {})

export function DirtyProvider({ children }: { children: React.ReactNode }) {
  const dirty = useRef(new Set<string>())
  const report = useCallback((id: string, isDirty: boolean) => {
    if (isDirty) dirty.current.add(id)
    else dirty.current.delete(id)
  }, [])
  useEffect(() => {
    const removeGuard = addNavigationGuard(() => {
      if (dirty.current.size === 0) return true
      const ok = window.confirm('Turite neišsaugotų pakeitimų. Išeiti jų neišsaugojus?')
      if (ok) dirty.current.clear()
      return ok
    })
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size === 0) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      removeGuard()
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])
  return <DirtyContext.Provider value={report}>{children}</DirtyContext.Provider>
}

/** Reports unsaved edits; returns markClean() for navigating away right after a save. */
export function useDirty(id: string, isDirty: boolean) {
  const report = useContext(DirtyContext)
  useEffect(() => {
    report(id, isDirty)
  }, [id, isDirty, report])
  useEffect(() => () => report(id, false), [id, report])
  return useCallback(() => report(id, false), [id, report])
}

// --- saved content + SEO (loaded once, updated after each save) ---------------------------------

type Store = {
  sections: Partial<Record<SectionKey, SavedSection>>
  seo: Record<string, SeoRecord>
  setSection: (key: SectionKey, saved: SavedSection) => void
  setSeo: (page: string, saved: SeoRecord) => void
}
const StoreContext = createContext<Store | null>(null)
export function useStore() {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function StoreProvider({ initial, children }: { initial: Pick<Store, 'sections' | 'seo'>; children: React.ReactNode }) {
  const [sections, setSections] = useState(initial.sections)
  const [seo, setSeoState] = useState(initial.seo)
  const value = useMemo<Store>(() => ({
    sections,
    seo,
    setSection: (key, saved) => setSections(s => ({ ...s, [key]: saved })),
    setSeo: (page, saved) => setSeoState(s => ({ ...s, [page]: saved })),
  }), [sections, seo])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
