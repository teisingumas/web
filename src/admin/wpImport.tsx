import { useState } from 'react'
import { Modal, useApi } from './context'
import { ADMIN } from './pages'
import { Spinner } from './ui'

// The 7 latest posts of megusta.lt (WordPress), copied one by one: text, date, SEO, photos, galleries, links.
const LATEST = [
  'https://megusta.lt/20-metu-kartu-su-jumis/',
  'https://megusta.lt/sokiu-pamokos-kaune/',
  'https://megusta.lt/lithuanian-open-2026/',
  'https://megusta.lt/megusta-day-camp-atmintine/',
  'https://megusta.lt/sokiu-festivalis/',
  'https://megusta.lt/is-cempionato-latvijoje/',
  'https://megusta.lt/street-art-ir-hip-hop-beginners-championships-2026/',
]

type Row = { url: string; state: 'wait' | 'run' | 'created' | 'exists' | 'error'; title?: string; id?: number; notes?: string[]; error?: string }

export default function WpImport({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const api = useApi()
  const [text, setText] = useState(LATEST.join('\n'))
  const [publish, setPublish] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const urls = [...new Set(text.split(/\s+/).map(u => u.trim()).filter(Boolean))]
    if (!urls.length) return
    setBusy(true)
    const list: Row[] = urls.map(url => ({ url, state: 'wait' }))
    setRows([...list])
    const set = (i: number, patch: Partial<Row>) => { list[i] = { ...list[i], ...patch }; setRows([...list]) }
    for (let i = 0; i < urls.length; i++) {
      set(i, { state: 'run' })
      try {
        const r = await api.importWordpress(urls[i], publish)
        set(i, { state: r.status, title: r.title, id: r.id, notes: r.notes })
      } catch (e) {
        set(i, { state: 'error', error: e instanceof Error ? e.message : 'Klaida' })
      }
    }
    setBusy(false)
    onDone()
  }

  return (
    <Modal title="Importuoti naujienas iš WordPress" onClose={busy ? () => {} : onClose} size="wide"
      footer={<>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose} disabled={busy}>Uždaryti</button>
        {!rows && <button type="button" className="adm-btn" onClick={run}>Importuoti</button>}
      </>}>
      {!rows ? (
        <div className="adm-stack">
          <p className="adm-modal__text">Kiekvienas adresas atsisiunčiamas iš megusta.lt: tekstas, publikavimo data, SEO pavadinimas ir aprašas, viršelis, visos nuotraukos (jos išsaugomos jūsų nuotraukų bibliotekoje), galerijos ir nuorodos. Naujienos adresas lieka toks pat kaip WordPress, todėl <b>megusta.lt/adresas</b> ir toliau veiks Google bei kitose svetainėse. Jau esančios naujienos nekeičiamos.</p>
          <label className="adm-label" htmlFor="wp-urls">Naujienų adresai (po vieną eilutėje)</label>
          <textarea id="wp-urls" className="adm-input" rows={9} value={text} onChange={e => setText(e.target.value)} spellCheck={false} />
          <label className="adm-check" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />
            <span>Iškart publikuoti (kitaip įrašomi kaip juodraščiai, kuriuos galėsite peržiūrėti)</span>
          </label>
        </div>
      ) : (
        <ul className="wpi">
          {rows.map(r => (
            <li key={r.url} data-state={r.state}>
              <span className="wpi__icon" aria-hidden="true">{r.state === 'run' ? <Spinner /> : r.state === 'created' ? '✓' : r.state === 'exists' ? '=' : r.state === 'error' ? '✕' : '·'}</span>
              <span className="wpi__main">
                <b>{r.title || r.url.replace('https://megusta.lt/', '')}</b>
                <small>
                  {r.state === 'wait' && 'Laukia'}{r.state === 'run' && 'Importuojama… (nuotraukų atsisiuntimas gali užtrukti)'}
                  {r.state === 'created' && 'Perkelta'}{r.state === 'exists' && 'Jau yra, praleista'}{r.state === 'error' && r.error}
                </small>
                {r.notes?.filter(n => r.state === 'created' || r.state === 'exists').map(n => <small key={n} className="wpi__note">{n}</small>)}
              </span>
              {r.id && <a className="adm-btn adm-btn--small adm-btn--ghost" href={`${ADMIN}/naujienos/${r.id}`}>Atidaryti</a>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
