import { useEffect, useState } from 'react'

// Sun / moon switch in the header. It records the visitor's choice on <html data-theme>
// and in localStorage; the site itself is dark-only until a light palette is designed.
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
  const [theme, setTheme] = useState<Theme>(initialTheme)

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
          background: #161616; border: 1px solid #2c2c2c;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
          transition: background-color 320ms cubic-bezier(0.23, 1, 0.32, 1), border-color 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .theme-switch[data-theme="light"] { background: #FFB3C6; border-color: #FFB3C6; box-shadow: inset 0 2px 4px rgba(120,40,60,0.35); }
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
          background: linear-gradient(180deg, #ffffff 0%, #e6e6e6 100%); color: #080808;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(0,0,0,0.08);
          transform: translateX(32px); transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .theme-switch[data-theme="dark"] .theme-switch__knob { color: #c2185b; }
        .theme-switch[data-theme="light"] .theme-switch__knob { transform: translateX(0); color: #e08a00; }
        @media (max-width: 480px) { .theme-switch { transform: scale(0.85); transform-origin: right center; } }
        @media (prefers-reduced-motion: reduce) { .theme-switch, .theme-switch__knob, .theme-switch__icon { transition: none; } }
      `}</style>
    </button>
  )
}
