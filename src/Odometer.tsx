import { useEffect, useRef, useState } from 'react'

// Odometer-style number: every digit rolls up from 0 to its value. A column
// travels as many steps as a real odometer would (650 -> units roll 650 times),
// capped so it stays readable, and all columns finish together. So small
// numbers roll slowly and large ones fast, within the same duration.
const DURATION = 1800
const MAX_STEPS = 40
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

export default function Odometer({ value }: { value: string }) {
  const digits = value.replace(/\D/g, '')
  const suffix = value.slice(digits.length)
  const n = Number(digits)
  const ref = useRef<HTMLSpanElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setStarted(true)
      return
    }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        // next frame so the 0 position is painted before the transition starts
        requestAnimationFrame(() => setStarted(true))
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span ref={ref} aria-label={value} style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>
      {[...digits].map((d, i) => {
        const place = digits.length - 1 - i
        const odometerSteps = Math.floor(n / 10 ** place)
        const target = Number(d)
        // keep the landing digit, drop whole turns beyond the cap
        const steps = odometerSteps <= MAX_STEPS ? odometerSteps : MAX_STEPS - ((MAX_STEPS - target) % 10)
        return (
          <span key={i} aria-hidden="true" style={{ display: 'inline-block', height: '1em', overflow: 'hidden', lineHeight: 1 }}>
            <span
              style={{
                display: 'flex', flexDirection: 'column',
                transform: started ? `translateY(-${steps}em)` : 'none',
                transition: started ? `transform ${DURATION}ms ${EASE}` : 'none',
              }}
            >
              {Array.from({ length: steps + 1 }, (_, k) => (
                <span key={k} style={{ height: '1em', lineHeight: 1 }}>{k % 10}</span>
              ))}
            </span>
          </span>
        )
      })}
      {suffix && <span aria-hidden="true">{suffix}</span>}
    </span>
  )
}
