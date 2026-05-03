import { createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeEmail } from '@/lib/auth'
import { planForPrice } from '@/lib/plans'
import { getStripe, stripeConfigured } from '@/lib/stripe'

const RENDER_KEY_PREFIX = 'fd_live'
const ACCESS_STATUSES = new Set(['active', 'trialing'])

function provisioningSecret() {
  const secret = process.env.FLOWDOWN_API_KEY_SECRET || process.env.AUTH_SECRET
  if (!secret) throw new Error('FLOWDOWN_API_KEY_SECRET or AUTH_SECRET is not configured')
  return secret
}

function subscriptionPriceId(subscription) {
  const firstItem = subscription?.items?.data?.[0]
  const price = firstItem?.price
  return typeof price === 'string' ? price : price?.id || ''
}

function signSubscriptionId(subscriptionId) {
  return createHmac('sha256', provisioningSecret())
    .update(`flowdown-render:${subscriptionId}`)
    .digest('base64url')
    .slice(0, 32)
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  return left.length === right.length && timingSafeEqual(left, right)
}

export function planForSubscription(subscription) {
  return planForPrice(subscriptionPriceId(subscription))
}

export function hasSubscriptionAccess(subscription) {
  return ACCESS_STATUSES.has(subscription?.status)
}

export function renderApiKeyForSubscription(subscription) {
  const subscriptionId = subscription?.id
  if (!subscriptionId) return ''

  const encodedSubscription = Buffer.from(subscriptionId).toString('base64url')
  return `${RENDER_KEY_PREFIX}.${encodedSubscription}.${signSubscriptionId(subscriptionId)}`
}

export function parseRenderApiKey(apiKey) {
  const [prefix, encodedSubscription, signature] = String(apiKey || '').split('.')
  if (prefix !== RENDER_KEY_PREFIX || !encodedSubscription || !signature) return null

  let subscriptionId
  try {
    subscriptionId = Buffer.from(encodedSubscription, 'base64url').toString('utf8')
  } catch {
    return null
  }

  if (!subscriptionId.startsWith('sub_')) return null
  if (!safeEqual(signature, signSubscriptionId(subscriptionId))) return null
  return subscriptionId
}

export function provisioningForSubscription(subscription) {
  const plan = planForSubscription(subscription)
  const accessActive = hasSubscriptionAccess(subscription)

  return {
    accessActive,
    plan,
    renderApiKey: plan?.id === 'cloud' && accessActive ? renderApiKeyForSubscription(subscription) : '',
  }
}

export async function tenantForRenderApiKey(apiKey) {
  if (!stripeConfigured()) return null

  const subscriptionId = parseRenderApiKey(apiKey)
  if (!subscriptionId) return null

  let subscription
  try {
    subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'items.data.price'],
    })
  } catch {
    return null
  }

  const provisioning = provisioningForSubscription(subscription)
  if (provisioning.plan?.id !== 'cloud' || !provisioning.accessActive) return null
  if (!safeEqual(apiKey, provisioning.renderApiKey)) return null

  const customer = typeof subscription.customer === 'object' ? subscription.customer : null
  return {
    name: customer?.name || customer?.email || 'Cloud Render tenant',
    email: normalizeEmail(customer?.email || subscription.metadata?.email),
    apiKey,
    plan: 'cloud',
    subscriptionId,
  }
}
