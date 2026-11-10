import { section } from './content'

const Check = () => (
  <i><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
)

// Pricing block: home page section and the "Kainos" tab on the registration page (centered).
export default function Pricing({ centered = false, heading = true, header = true, marks = false }: { centered?: boolean; heading?: boolean; header?: boolean; marks?: boolean }) {
  const pricing = section('pricing')
  const cta = section('home.cta')
  return (
    <>
    {header && <div className="ng-head" style={{ textAlign: centered ? 'center' : undefined, alignItems: centered ? 'center' : undefined, marginBottom: heading ? 36 : 28 }}>
      <span className="ng-kicker">{pricing.kicker}</span>
      {heading && <h2 className="ng-h2">{pricing.title}</h2>}
    </div>}

    <div className="ng-plans pricing-grid" style={centered ? { maxWidth: 820, margin: '0 auto' } : undefined}>
      {pricing.plans.map((plan, pi) => (
        <div key={pi} className={'ng-plan' + (plan.highlight ? ' ng-plan--hot' : '')}>
          {plan.highlight && <span className="ng-plan__badge">{pricing.badge}</span>}
          <h3 className="ng-plan__name">{plan.desc}</h3>
          <div className="ng-plan__price"><b>€{plan.price}</b><span>{plan.period}{marks && ' *'}</span></div>
          <ul>
            {plan.features.map((f, fi) => <li key={fi}><Check />{f}</li>)}
          </ul>
          <a href="/registracija" className="ng-plan__cta">Rinkis</a>
        </div>
      ))}
      {!centered && (
        <div className="ng-plan ng-plan--free">
          <span className="ng-tag">Išbandyk</span>
          <p className="ng-plan__free-text">{cta.kicker}.</p>
          <a href="/registracija" className="ng-btn">Registruokis →</a>
        </div>
      )}
    </div>

    {centered && pricing.note && (
      <p className="ng-pricenote" style={centered ? { textAlign: 'center' } : undefined}>{pricing.note}</p>
    )}
    </>
  )
}
