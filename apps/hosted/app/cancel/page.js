import Link from 'next/link'

export default function Cancel() {
  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">flow<span>down</span> hosted</Link>
      </nav>
      <section className="intro">
        <h1>Checkout canceled.</h1>
        <p>No subscription was created.</p>
      </section>
      <Link className="button" href="/">Back to plans</Link>
    </main>
  )
}
