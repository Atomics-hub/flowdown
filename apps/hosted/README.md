# Flowdown Hosted

Serverless control plane for Hosted Flowdown. It is designed to stay dormant until there is demand:

- Stripe Checkout for Pro and Cloud Render subscriptions
- Stripe customer portal for billing management
- Magic-link dashboard access
- Signed webhook endpoint ready for Stripe events
- Authenticated render API for manually provisioned Cloud Render customers

## Local Setup

```bash
cp apps/hosted/.env.example apps/hosted/.env.local
npm install
npm run dev --workspace @a5omic/flowdown-hosted
```

Open `http://localhost:3000`.

## Stripe Setup

1. Create two monthly recurring Stripe Prices:
   - Pro: `$49/mo`
   - Cloud Render: `$199/mo`
2. Copy the price IDs into:
   - `STRIPE_PRO_PRICE_ID`
   - `STRIPE_CLOUD_RENDER_PRICE_ID`
3. Configure the Stripe customer portal in the Stripe Dashboard.
4. Add a webhook endpoint:

```text
https://your-hosted-domain.com/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

The webhook currently verifies and logs events. Once the hosted product needs automatic provisioning, wire `handleStripeEvent()` to the customer database or provisioning queue.

## Dormant Deployment

Use Vercel as a serverless deployment target. Per Vercel's monorepo setup, create a project from this repo and select `apps/hosted` as the root directory. The app has no always-on worker and no persistent instance to keep warm.

Required production environment variables:

```text
APP_URL=https://your-hosted-domain.com
NEXT_PUBLIC_APP_URL=https://your-hosted-domain.com
AUTH_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRO_PRICE_ID=...
STRIPE_CLOUD_RENDER_PRICE_ID=...
```

Optional:

```text
RESEND_API_KEY=...
LOGIN_FROM_EMAIL="Flowdown <login@your-domain.com>"
FLOWDOWN_TENANTS_JSON='[{"name":"Acme","email":"buyer@example.com","apiKey":"fd_live_xxx","plan":"cloud"}]'
```

## Render API

Cloud Render customers can be manually provisioned in `FLOWDOWN_TENANTS_JSON`.

```bash
curl https://your-hosted-domain.com/api/render \
  -H "Authorization: Bearer fd_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Hello **world**"}'
```

The response is:

```json
{
  "html": "<h1>Hello <strong>world</strong></h1>",
  "tenant": "Acme"
}
```
