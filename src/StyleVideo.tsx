import { useState } from 'react'

// Video-style player for a dance style. There is no footage yet, so it shows the photo with a slow
// camera move, a progress bar and play / pause controls; real video can replace the photo later.
// autoPlay: starts playing straight away (used when a visitor picks a style tab).
export default function StyleVideo({ src, alt, name, autoPlay }: { src: string; alt: string; name: string; autoPlay: boolean }) {
  const [playing, setPlaying] = useState(autoPlay)
  const [muted, setMuted] = useState(true)
  return (
    <div className={'sv' + (playing ? ' is-playing' : '')}>
      <img src={src} alt={alt} className="sv__img" />
      <span className="sv__shade" aria-hidden="true" />
      <span className="ng-tag-white sv__name">{name}</span>
      {playing && <span className="sv__live" aria-hidden="true"><i />Groja</span>}
      {!playing && (
        <button type="button" className="sv__big" aria-label={`Paleisti vaizdo įrašą: ${name}`} onClick={() => setPlaying(true)}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
        </button>
      )}
      <div className="sv__bar">
        <button type="button" className="sv__btn" aria-label={playing ? 'Sustabdyti' : 'Paleisti'} onClick={() => setPlaying(p => !p)}>
          {playing
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
        </button>
        <span className="sv__track" aria-hidden="true"><span className="sv__fill" /></span>
        <button type="button" className="sv__btn" aria-label={muted ? 'Įjungti garsą' : 'Išjungti garsą'} aria-pressed={!muted} onClick={() => setMuted(m => !m)}>
          {muted
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" /><path d="m22 9-6 6M16 9l6 6" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>}
        </button>
      </div>
    </div>
  )
}
