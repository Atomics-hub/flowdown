import { getStripe } from '@/lib/stripe'
import { handleStripeEvent } from '@/lib/webhook'

export const runtime = 'nodejs'

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('STRIPE_WEBHOOK_SECRET is not configured', { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  const body = await request.text()

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 })
  }

  await handleStripeEvent(event)
  return Response.json({ received: true })
}
