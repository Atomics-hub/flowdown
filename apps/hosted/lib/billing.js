import { planForPrice } from '@/lib/plans'
import { provisioningForSubscription } from '@/lib/provisioning'
import { getStripe, stripeConfigured } from '@/lib/stripe'

export async function billingForEmail(email) {
  if (!stripeConfigured()) {
    return {
      configured: false,
      customers: [],
      subscriptions: [],
    }
  }

  const stripe = getStripe()
  const customers = await stripe.customers.list({ email, limit: 10 })
  const subscriptions = []

  for (const customer of customers.data) {
    const customerSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
      expand: ['data.items.data.price'],
    })

    for (const subscription of customerSubscriptions.data) {
      const firstItem = subscription.items.data[0]
      const priceId = firstItem?.price?.id || ''
      const provisioning = provisioningForSubscription(subscription)
      subscriptions.push({
        id: subscription.id,
        customerId: customer.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        plan: planForPrice(priceId),
        priceId,
        accessActive: provisioning.accessActive,
        renderApiKey: provisioning.renderApiKey,
      })
    }
  }

  return {
    configured: true,
    customers: customers.data,
    subscriptions,
  }
}

export async function firstCustomerForEmail(email) {
  if (!stripeConfigured()) return null
  const customers = await getStripe().customers.list({ email, limit: 1 })
  return customers.data[0] || null
}

export function formatUnixDate(unixSeconds) {
  if (!unixSeconds) return 'n/a'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(unixSeconds * 1000))
}
