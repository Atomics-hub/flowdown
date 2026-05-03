export const PLANS = {
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$49/mo',
    priceEnv: 'STRIPE_PRO_PRICE_ID',
    audience: 'Teams using private models',
    description: 'Private model setup, hosted preview links, team API keys, and usage logs.',
    bullets: ['Private model setup', 'Hosted preview links', 'Team API keys', 'Usage logs'],
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud Render',
    price: '$199/mo',
    priceEnv: 'STRIPE_CLOUD_RENDER_PRICE_ID',
    audience: 'Chat UIs that need server-side rendering',
    description: 'Render API, cached transcript HTML, longer-conversation support, and priority integration help.',
    bullets: ['Render API', 'Cached transcript HTML', 'Longer transcript support', 'Priority support'],
  },
}

export function getPlan(planId) {
  return PLANS[planId] || null
}

export function getPlanPriceId(plan) {
  return process.env[plan.priceEnv] || ''
}

export function allPlans() {
  return Object.values(PLANS)
}

export function planForPrice(priceId) {
  return allPlans().find((plan) => getPlanPriceId(plan) === priceId) || null
}
