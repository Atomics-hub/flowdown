import Link from 'next/link'
import { redirect } from 'next/navigation'
import { billingForEmail, formatUnixDate } from '@/lib/billing'
import { getSession } from '@/lib/auth'
import { maskApiKey } from '@/lib/tenants'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const billing = await billingForEmail(session.email)
  const renderSubscriptions = billing.subscriptions.filter((subscription) => subscription.renderApiKey)
  const proSubscriptions = billing.subscriptions.filter((subscription) => subscription.plan?.id === 'pro' && subscription.accessActive)

  return (
    <main className="shell">
      <nav className="nav">
        <Link className="brand" href="/">flow<span>down</span> hosted</Link>
        <div className="nav-links">
          <form action="/api/auth/logout" method="post">
            <button className="link-button" type="submit">Log out</button>
          </form>
        </div>
      </nav>

      <section className="intro">
        <div className="kicker">{session.email}</div>
        <h1>Dashboard</h1>
        <p>Billing state comes from Stripe. Cloud Render API keys are generated automatically for active Cloud Render subscriptions.</p>
      </section>

      <section className="stack">
        {!billing.configured ? (
          <div className="notice warn">Stripe is not configured in this environment.</div>
        ) : null}

        <div className="card">
          <div className="card-row">
            <h2>Subscriptions</h2>
            {billing.customers[0] ? (
              <form action="/api/billing/portal" method="post">
                <button className="link-button" type="submit">Manage billing</button>
              </form>
            ) : null}
          </div>

          {billing.subscriptions.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Renews</th>
                  <th>Subscription</th>
                </tr>
              </thead>
              <tbody>
                {billing.subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.plan?.name || 'Unknown price'}</td>
                    <td><span className={`status ${subscription.status}`}>{subscription.status}</span></td>
                    <td>{formatUnixDate(subscription.currentPeriodEnd)}</td>
                    <td><code>{subscription.id}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No Stripe subscription found for this email yet.</p>
          )}
        </div>

        <div className="grid-2">
          <div className="card">
            <h2>Render API</h2>
            {renderSubscriptions.length ? (
              <div className="stack">
                {renderSubscriptions.map((subscription) => (
                  <div className="provisioned" key={subscription.id}>
                    <p className="notice good">Cloud Render is active for {subscription.plan.name}.</p>
                    <p>API key</p>
                    <code className="key">{subscription.renderApiKey}</code>
                    <p>Masked key: <code>{maskApiKey(subscription.renderApiKey)}</code></p>
                    <pre className="snippet">{`curl ${process.env.NEXT_PUBLIC_APP_URL || ''}/api/render \\
  -H "Authorization: Bearer ${subscription.renderApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"markdown":"# Hello **world**"}'`}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <p>No active Cloud Render subscription found for this email.</p>
            )}
            <p>Endpoint: <code>POST /api/render</code></p>
          </div>

          <div className="card">
            <h2>Next Steps</h2>
            {proSubscriptions.length ? (
              <p className="notice good">Pro is active. Private-model onboarding is included with this subscription.</p>
            ) : null}
            <ul className="list">
              <li>Use the billing portal for invoices, cards, and cancellations.</li>
              <li>Use the Cloud Render key immediately after checkout.</li>
              <li>Keep the same checkout email for dashboard access.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
