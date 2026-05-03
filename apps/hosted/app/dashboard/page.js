import Link from 'next/link'
import { redirect } from 'next/navigation'
import { billingForEmail, formatUnixDate } from '@/lib/billing'
import { getSession } from '@/lib/auth'
import { maskApiKey, tenantsForEmail } from '@/lib/tenants'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const billing = await billingForEmail(session.email)
  const tenants = tenantsForEmail(session.email)

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
        <p>Billing state comes from Stripe. Render API access is manually provisioned until demand justifies a database-backed tenant system.</p>
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
            {tenants.length ? (
              <ul className="list">
                {tenants.map((tenant) => (
                  <li key={tenant.apiKey}>
                    {tenant.name || 'Tenant'}: <code>{maskApiKey(tenant.apiKey)}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No render API key has been provisioned for this email.</p>
            )}
            <p>Endpoint: <code>POST /api/render</code></p>
          </div>

          <div className="card">
            <h2>Next Steps</h2>
            <ul className="list">
              <li>Use Stripe Checkout for self-serve subscription starts.</li>
              <li>Use the billing portal for invoices, cards, and cancellations.</li>
              <li>Add tenants to <code>FLOWDOWN_TENANTS_JSON</code> for early Cloud Render users.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
