import Link from 'next/link'

export default async function Success({ searchParams }) {
  const params = await searchParams
  const sessionId = params?.session_id || ''

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">flow<span>down</span> hosted</Link>
        <div className="nav-links">
          <Link href="/login">Dashboard</Link>
        </div>
      </nav>

      <section className="intro">
        <h1>Checkout complete.</h1>
        <p>Your subscription is active in Stripe. Open the dashboard to see billing status and any automatically provisioned access.</p>
      </section>

      <div className="card">
        <p>Session: <code>{sessionId || 'unknown'}</code></p>
        {sessionId ? (
          <Link className="button primary" href={`/api/auth/checkout-session?session_id=${encodeURIComponent(sessionId)}`}>Open dashboard</Link>
        ) : (
          <Link className="button primary" href="/login">Open dashboard</Link>
        )}
      </div>
    </main>
  )
}
