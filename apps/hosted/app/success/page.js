import Link from 'next/link'

export default async function Success({ searchParams }) {
  const params = await searchParams

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
        <p>Stripe accepted the checkout session. Use the dashboard login with the same email to view billing and provisioning status.</p>
      </section>

      <div className="card">
        <p>Session: <code>{params?.session_id || 'unknown'}</code></p>
        <Link className="button primary" href="/login">Open dashboard</Link>
      </div>
    </main>
  )
}
