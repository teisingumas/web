// Pill groups (header menu, tab rows, news pages): one black pill slides to the item under the pointer
// or keyboard focus and returns to the active item when the pointer leaves. The pill is the group's
// ::before, positioned by CSS variables set here; items only get a data-hot attribute for the white text.
const GROUPS = '[role="tablist"], .ng-pills, .news-pages'
// the admin keeps its own tab look
const skip = (g: Element) => !!g.closest('.adm, .adm-login')

type Group = HTMLElement & { __hover?: HTMLElement | null; __ready?: boolean }

const items = (g: Group) => Array.from(g.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.matches('a, button'))
const activeOf = (g: Group) => items(g).find(i => i.getAttribute('aria-selected') === 'true' || i.getAttribute('aria-current') === 'page') ?? null

function refresh(g: Group) {
  const target = g.__hover && !(g.__hover as HTMLButtonElement).disabled ? g.__hover : activeOf(g)
  items(g).forEach(i => { if (i === target) i.setAttribute('data-hot', ''); else i.removeAttribute('data-hot') })
  if (!target || target.offsetWidth === 0) {
    g.style.setProperty('--so', '0')
    return
  }
  g.style.setProperty('--sx', `${target.offsetLeft}px`)
  g.style.setProperty('--sy', `${target.offsetTop}px`)
  g.style.setProperty('--sw', `${target.offsetWidth}px`)
  g.style.setProperty('--sh', `${target.offsetHeight}px`)
  g.style.setProperty('--so', '1')
  if (!g.__ready) {
    g.__ready = true
    // animate only after the first placement, so the pill does not fly in from the corner
    requestAnimationFrame(() => requestAnimationFrame(() => g.setAttribute('data-slider-ready', '')))
  }
}

function refreshAll() {
  document.querySelectorAll<Group>(GROUPS).forEach(g => {
    if (skip(g)) return
    if (!g.hasAttribute('data-slider')) g.setAttribute('data-slider', '')
    refresh(g)
  })
}

function itemUnder(target: EventTarget | null): { group: Group; item: HTMLElement } | null {
  if (!(target instanceof Element)) return null
  const group = target.closest<Group>(GROUPS)
  if (!group || skip(group)) return null
  let el: Element | null = target
  while (el && el.parentElement !== group) el = el.parentElement
  return el instanceof HTMLElement && el.matches('a, button') ? { group, item: el } : null
}

export function installPillSliders() {
  let raf = 0
  const schedule = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(refreshAll)
  }
  const over = (e: Event) => {
    const hit = itemUnder(e.target)
    if (!hit) return
    hit.group.__hover = hit.item
    refresh(hit.group)
  }
  const out = (e: PointerEvent | FocusEvent) => {
    const group = e.target instanceof Element ? e.target.closest<Group>(GROUPS) : null
    if (!group || (e.relatedTarget instanceof Node && group.contains(e.relatedTarget))) return
    group.__hover = null
    refresh(group)
  }
  document.addEventListener('pointerover', over)
  document.addEventListener('pointerout', out as EventListener)
  document.addEventListener('focusin', over)
  document.addEventListener('focusout', out as EventListener)
  const mo = new MutationObserver(schedule)
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-current', 'disabled'] })
  window.addEventListener('resize', schedule)
  document.fonts?.ready.then(schedule)
  schedule()
  return () => {
    cancelAnimationFrame(raf)
    mo.disconnect()
    window.removeEventListener('resize', schedule)
    document.removeEventListener('pointerover', over)
    document.removeEventListener('pointerout', out as EventListener)
    document.removeEventListener('focusin', over)
    document.removeEventListener('focusout', out as EventListener)
  }
}
