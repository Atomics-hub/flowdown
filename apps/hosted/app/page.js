import Link from 'next/link'
import { allPlans } from '@/lib/plans'

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">flow<span>down</span> hosted</Link>
        <div className="nav-links">
          <a href="https://atomics-hub.github.io/flowdown/">Demo</a>
          <Link href="/login">Dashboard</Link>
        </div>
      </nav>

      <section className="intro">
        <div className="kicker">579 monthly npm downloads before launch</div>
        <h1>Hosted plans for teams using Flowdown in production.</h1>
        <p>
          The renderer stays MIT. Paid plans are for private model support, hosted previews,
          billing, and server-side rendering for chat transcripts.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <div className="card-row">
            <h2>Open Source</h2>
            <span className="label">MIT</span>
          </div>
          <div className="price">Free</div>
          <p>The package for apps that render streamed markdown in the browser.</p>
          <ul className="list">
            <li>Core and React packages</li>
            <li>Viewport virtualization</li>
            <li>Static HTML rendering</li>
          </ul>
          <a className="button" href="https://www.npmjs.com/package/@a5omic/flowdown">Install package</a>
        </article>

        {allPlans().map((plan) => (
          <article className="card strong" key={plan.id}>
            <div className="card-row">
              <h2>{plan.name}</h2>
              <span className="label">{plan.audience}</span>
            </div>
            <div className="price">{plan.price}</div>
            <p>{plan.description}</p>
            <ul className="list">
              {plan.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            <form action="/api/billing/checkout" method="post">
              <input type="hidden" name="plan" value={plan.id} />
              <div className="field">
                <label htmlFor={`${plan.id}-email`}>Work email</label>
                <input id={`${plan.id}-email`} name="email" type="email" required placeholder="you@company.com" />
              </div>
              <button className="button primary" type="submit">Start checkout</button>
            </form>
          </article>
        ))}
      </section>
    </main>
  )
}
