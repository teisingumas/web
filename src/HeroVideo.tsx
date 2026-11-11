import { useEffect, useRef, useState } from 'react'

// Desktop hero: the video inside a brush-stroke shape. The shape is painted in with four strokes
// (alternating left / right), the video starts once it is fully revealed, and the two badges pop in
// when the video is half way through. Reduced motion: everything is shown at once.
export default function HeroVideo({ badge, address }: { badge: string; address: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [badges, setBadges] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      setBadges(true)
    }
  }, [])

  useEffect(() => {
    const v = video.current
    if (!v || !revealed) return
    v.play().catch(() => setBadges(true))
    const onTime = () => {
      if (v.duration && v.currentTime >= v.duration / 2) {
        setBadges(true)
        v.removeEventListener('timeupdate', onTime)
      }
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [revealed])

  return (
    <div className="ng-hero__photo">
      <div className="ng-hero__brush" data-revealed={revealed}>
        <video ref={video} className="ng-hero__video" muted loop playsInline preload="auto" poster="/video/hero-poster.webp" aria-label="Me Gusta šokėjai treniruotėje">
          <source src="/video/hero.webm" type="video/webm" />
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>
        <div className="hv-wipes" aria-hidden="true">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={`hv-wipe hv-wipe--${i}`} onAnimationEnd={i === 3 ? () => setRevealed(true) : undefined} />
          ))}
        </div>
      </div>
      <span className="ng-float ng-float--top" data-show={badges}>{badge}</span>
      <span className="ng-float ng-float--bottom" data-show={badges}><i />{address}</span>
    </div>
  )
}
