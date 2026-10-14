import { useEffect, useSyncExternalStore } from 'react'

// Sun / moon switch. It records the visitor's choice on <html data-theme> and in localStorage.
// There can be several switches on screen (desktop header and the mobile menu), so the theme
// lives in one shared store and every switch shows the same state.
type Theme = 'light' | 'dark'
const STORAGE_KEY = 'megusta-theme'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked: fall back to the default
  }
  return 'dark'
}

let current: Theme = initialTheme()
const listeners = new Set<() => void>()
function setTheme(next: Theme) {
  if (next === current) return
  current = next
  listeners.forEach(l => l())
}
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const Sun = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </g>
  </svg>
)

const Moon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z" />
  </svg>
)

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, () => current)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  }, [theme])

  const dark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tamsi tema"
      title={dark ? 'Tamsi tema' : 'Šviesi tema'}
      className="theme-switch"
      data-theme={theme}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span className="theme-switch__icon theme-switch__icon--sun"><Sun /></span>
      <span className="theme-switch__icon theme-switch__icon--moon"><Moon /></span>
      <span className="theme-switch__knob">{dark ? <Moon /> : <Sun />}</span>
      <style>{`
        .theme-switch {
          position: relative; flex-shrink: 0; width: 64px; height: 32px; padding: 0; border-radius: 999px; cursor: pointer;
          background: linear-gradient(180deg, #0b0b0b 0%, #1d1d1d 100%); border: 1px solid #2c2c2c;
          /* recessed track: deep inner shadow, a faint lit lower edge, and a drop shadow under the pill */
          box-shadow: inset 0 3px 6px rgba(0,0,0,0.85), inset 0 -1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.5);
          transition: background-color 320ms cubic-bezier(0.23, 1, 0.32, 1), border-color 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .theme-switch[data-theme="light"] {
          background: linear-gradient(180deg, #f59ab3 0%, #FFB3C6 100%); border-color: #f7a3bb;
          box-shadow: inset 0 3px 6px rgba(120,30,60,0.45), inset 0 -1px 0 rgba(255,255,255,0.35), 0 4px 10px rgba(0,0,0,0.5);
        }
        .theme-switch:hover { border-color: #FFB3C6; }
        .theme-switch:focus-visible { outline: 2px solid #FFB3C6; outline-offset: 3px; }
        .theme-switch__icon {
          position: absolute; top: 50%; transform: translateY(-50%); display: flex; color: #6e6e6e;
          transition: color 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .theme-switch__icon--sun { left: 9px; }
        .theme-switch__icon--moon { right: 9px; }
        .theme-switch[data-theme="light"] .theme-switch__icon { color: rgba(8,8,8,0.45); }
        .theme-switch__knob {
          position: absolute; top: 2px; left: 2px; width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          /* raised knob: top highlight, darker rim at the bottom, layered drop shadows */
          background: radial-gradient(circle at 35% 28%, #ffffff 0%, #f1f1f1 45%, #d2d2d2 100%); color: #3a3a3a;
          border: 1px solid rgba(0,0,0,0.12);
          box-shadow: 0 1px 1px rgba(0,0,0,0.35), 0 3px 6px rgba(0,0,0,0.45), 0 6px 12px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.15);
          transform: translateX(32px); transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .theme-switch[data-theme="light"] .theme-switch__knob { transform: translateX(0); }
        @media (prefers-reduced-motion: reduce) { .theme-switch, .theme-switch__knob, .theme-switch__icon { transition: none; } }
      `}</style>
    </button>
  )
}
