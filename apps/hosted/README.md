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

The current deployment uses live Stripe Checkout in the Flowdown Stripe account. Provisioning is still manual through `FLOWDOWN_TENANTS_JSON` while the hosted product validates demand.

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

Example deployment:

```bash
gcloud run deploy flowdown-hosted \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars APP_URL=https://SERVICE_URL,NEXT_PUBLIC_APP_URL=https://SERVICE_URL,STRIPE_PRO_PRICE_ID=price_xxx,STRIPE_CLOUD_RENDER_PRICE_ID=price_xxx \
  --set-secrets AUTH_SECRET=flowdown-auth-secret:latest,STRIPE_SECRET_KEY=flowdown-stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=flowdown-stripe-webhook-secret:latest
```

Create a Stripe webhook pointing at:

```text
https://SERVICE_URL/api/stripe/webhook
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
