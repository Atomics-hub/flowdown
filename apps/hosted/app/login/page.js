import Link from 'next/link'

export default async function Login({ searchParams }) {
  const params = await searchParams
  const sent = params?.sent === '1'
  const devLink = params?.dev_link || ''
  const error = params?.error || ''

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">flow<span>down</span> hosted</Link>
        <div className="nav-links">
          <Link href="/">Plans</Link>
        </div>
      </nav>

      <section className="intro">
        <h1>Open your dashboard.</h1>
        <p>Enter the email used at Stripe Checkout. The dashboard looks up billing state from Stripe.</p>
      </section>

      <section className="grid-2">
        <form className="card" action="/api/auth/request-link" method="post">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="you@company.com" />
          </div>
          <button className="button primary" type="submit">Send login link</button>
        </form>

        <div className="card">
          <h2>Status</h2>
          {sent ? <p className="notice good">Login link requested. Check your inbox.</p> : null}
          {error ? <p className="notice warn">{error}</p> : null}
          {devLink ? (
            <p className="notice">
              Development login link: <a href={devLink}>{devLink}</a>
            </p>
          ) : null}
          {!sent && !error && !devLink ? (
            <p>Magic links expire after 15 minutes. No password storage needed.</p>
          ) : null}
        </div>
      </section>
    </main>
  )
}
