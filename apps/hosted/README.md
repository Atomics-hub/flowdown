# Flowdown Hosted

Serverless control plane for Hosted Flowdown. It is designed to stay dormant until there is demand:

- Stripe Checkout for Pro and Cloud Render subscriptions
- Stripe customer portal for billing management
- Magic-link dashboard access
- Signed webhook endpoint ready for Stripe events
- Authenticated render API for active Cloud Render customers

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

The webhook verifies and logs billing events. Provisioning does not require a database: Cloud Render API keys are derived from active Stripe subscription IDs and validated against Stripe on render requests.

## Dormant Deployment

Use Cloud Run as the dormant deployment target. Keep `--min-instances=0` so the service scales to zero when idle.

Current live deployment:

```text
https://flowdown-hosted-gejo3xsy3a-uc.a.run.app
```

Current Stripe live prices:

```text
STRIPE_PRO_PRICE_ID=price_1TT7he9Vir2Bvf4wWaOc6p7Q
STRIPE_CLOUD_RENDER_PRICE_ID=price_1TT7j09Vir2Bvf4wvXSFziuG
```

Current Stripe live webhook:

```text
we_1TT7lo9Vir2Bvf4wNgRDgzR0
```

The current deployment uses live Stripe Checkout in the Flowdown Stripe account. After checkout, `/success` can open the buyer dashboard from the verified Checkout Session. Active Cloud Render subscriptions receive a generated `fd_live...` render API key in the dashboard. Returning dashboard login is live through Resend from `Flowdown <login@a5omic.com>`.

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
FLOWDOWN_API_KEY_SECRET=...
FLOWDOWN_TENANTS_JSON='[{"name":"Acme","email":"buyer@example.com","apiKey":"fd_manual_xxx","plan":"cloud"}]'
```

For the live Cloud Run service, Resend is stored in Secret Manager as `flowdown-resend-api-key` and mounted as `RESEND_API_KEY`. Grant the Cloud Run runtime service account `roles/secretmanager.secretAccessor` on that secret before deploying revisions that reference it.

Example deployment:

```bash
gcloud run deploy flowdown-hosted \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars APP_URL=https://SERVICE_URL,NEXT_PUBLIC_APP_URL=https://SERVICE_URL,LOGIN_FROM_EMAIL='Flowdown <login@a5omic.com>',STRIPE_PRO_PRICE_ID=price_xxx,STRIPE_CLOUD_RENDER_PRICE_ID=price_xxx \
  --set-secrets AUTH_SECRET=flowdown-auth-secret:latest,STRIPE_SECRET_KEY=flowdown-stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=flowdown-stripe-webhook-secret:latest,RESEND_API_KEY=flowdown-resend-api-key:latest
```

Create a Stripe webhook pointing at:

```text
https://SERVICE_URL/api/stripe/webhook
```

## Render API

Cloud Render customers get an API key automatically from their active Stripe subscription. `FLOWDOWN_TENANTS_JSON` remains available as a manual override for pilots or internal testing.

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
