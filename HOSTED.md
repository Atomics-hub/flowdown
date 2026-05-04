# Hosted Flowdown

Flowdown stays MIT and local-first. The npm packages are the main product surface today.

Hosted Flowdown is an early-access commercial version for teams that want help running Flowdown around private model streams or server-side chat rendering.

## Plans

| Tier | Price | For | Includes |
|------|-------|----------|----------|
| Open Source | Free | Apps that render in the browser | `@a5omic/flowdown`, React wrapper, viewport virtualization, static rendering, MIT license |
| Pro | $49/mo | Teams using private models | Private model setup, hosted preview links, team API keys, usage logs, integration support |
| Cloud Render | $199/mo | Chat UIs that need server-side rendering | Render API, cached transcript HTML, longer-conversation support, priority support |

## Why Now

Flowdown has 579 monthly npm downloads before any real launch. Hosted plans are a way to turn that inbound usage into a simple commercial offer without changing the open-source package.

## Start Checkout

Hosted checkout is live at:

https://flowdown-hosted-gejo3xsy3a-uc.a.run.app/

Pro and Cloud Render are still early-access plans. Checkout creates the subscription, then the dashboard opens from the verified Stripe Checkout session. Returning dashboard login is live through `Flowdown <login@a5omic.com>`, and Cloud Render subscriptions automatically receive a render API key in the dashboard.

Support goes to `overboardapps@gmail.com`.

## Hosted App

The dormant hosted control plane lives in [`apps/hosted`](apps/hosted). It includes:

- Stripe Checkout for Pro and Cloud Render
- Stripe customer portal for subscription management
- Magic-link dashboard access
- Signed Stripe webhook endpoint
- Authenticated `POST /api/render` endpoint for active Cloud Render subscriptions

Build it with:

```bash
npm run build:hosted
```

It is meant for serverless hosting, with no always-on process until a request comes in.
