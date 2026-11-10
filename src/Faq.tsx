import { useState } from 'react'
import type React from 'react'

export type FaqGroup = { title: string; items: { q: string; a: string }[] }

// D.U.K. accordion: one white rounded card per question. Used on /kainos and in the registration "Informacija" tab.
export default function Faq({ groups, idPrefix = 'faq', onAnswerClick }: { groups: FaqGroup[]; idPrefix?: string; onAnswerClick?: (e: React.MouseEvent) => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  return (
    <div className="dq">
      {groups.map((group, gi) => (
        <section key={gi} aria-labelledby={`${idPrefix}-g${gi}`}>
          <h2 id={`${idPrefix}-g${gi}`} className="dq__title">{group.title}</h2>
          <div className="dq__list">
            {group.items.map((item, ii) => {
              const id = `${idPrefix}-${gi}-${ii}`
              const isOpen = open.has(id)
              return (
                <div key={id} className="dq__item" data-open={isOpen}>
                  <button type="button" className="dq__q" aria-expanded={isOpen} aria-controls={`${id}-a`} id={`${id}-q`} onClick={() => toggle(id)}>
                    <span>{item.q}</span>
                    <span className="dq__plus" aria-hidden="true" />
                  </button>
                  <div className="dq__a" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} data-open={isOpen} inert={!isOpen}>
                    <div><div className="dq__body" onClick={onAnswerClick} dangerouslySetInnerHTML={{ __html: item.a }} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
