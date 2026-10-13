import { section } from './content'

// Pricing block: home page section and the "Kainos" tab on the registration page (centered).
export default function Pricing({ centered = false, heading = true }: { centered?: boolean; heading?: boolean }) {
  const pricing = section('pricing')
  return (
    <>
    <div style={{ marginBottom: heading ? 64 : 40, textAlign: centered ? 'center' : undefined }}>
      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 5, color: 'var(--pink-text)', textTransform: 'uppercase', marginBottom: 12 }}>
        ◆&nbsp;&nbsp;{pricing.kicker}
      </p>
      {heading && (
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 6vw, 88px)', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', margin: 0 }}>
          {pricing.title}
        </h2>
      )}
    </div>

    <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, maxWidth: 800, margin: centered ? '0 auto' : undefined }}>
      {pricing.plans.map((plan, pi) => (
        <div
          key={pi}
          style={{
            backgroundColor: plan.highlight ? '#FFB3C6' : 'var(--surface)',
            border: '1px solid ' + (plan.highlight ? '#FFB3C6' : 'var(--line)'),
            padding: '48px 40px',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {plan.highlight && (
            <div style={{
              position: 'absolute', top: -12, left: 40,
              backgroundColor: '#080808', color: '#FFB3C6',
              padding: '4px 16px', fontSize: 10, fontWeight: 800,
              letterSpacing: 3, textTransform: 'uppercase',
              border: '1px solid #FFB3C6',
            }}>
              {pricing.badge}
            </div>
          )}
          <div>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: plan.highlight ? '#333' : 'var(--c-555555)', marginBottom: 8 }}>
              {plan.desc}
            </p>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 32, textTransform: 'uppercase', color: plan.highlight ? '#080808' : 'var(--text)', margin: '0 0 28px', letterSpacing: 2 }}>
              {plan.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 36 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 72, color: plan.highlight ? '#080808' : 'var(--text)', lineHeight: 1 }}>
                €{plan.price}
              </span>
              <span style={{ fontSize: 14, color: plan.highlight ? '#333' : 'var(--c-555555)', fontWeight: 500 }}>{plan.period}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plan.features.map((f, fi) => (
                <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: plan.highlight ? '#111' : 'var(--c-aaaaaa)', fontWeight: 400 }}>
                  <span style={{ color: plan.highlight ? '#080808' : 'var(--pink-text)', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="/registracija"
            style={{
              display: 'block', textAlign: 'center',
              padding: '16px 24px',
              backgroundColor: plan.highlight ? '#080808' : '#FFB3C6',
              color: plan.highlight ? '#FFB3C6' : '#080808',
              fontWeight: 800, fontSize: 13, letterSpacing: 2,
              textTransform: 'uppercase', textDecoration: 'none',
              transition: 'all 0.2s', marginTop: 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {plan.cta}
          </a>
        </div>
      ))}
    </div>

    {pricing.note && (
      <p style={{ textAlign: 'center', maxWidth: 800, margin: centered ? '32px auto 0' : '32px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--c-cfcfcf)', letterSpacing: 0.3 }}>
        {pricing.note}
      </p>
    )}
    </>
  )
}
