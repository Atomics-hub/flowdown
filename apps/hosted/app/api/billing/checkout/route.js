import { NextResponse } from 'next/server'
import { getPlan, getPlanPriceId } from '@/lib/plans'
import { getStripe } from '@/lib/stripe'
import { normalizeEmail } from '@/lib/auth'
import { appUrl } from '@/lib/url'

export const runtime = 'nodejs'

export async function POST(request) {
  const form = await request.formData()
  const plan = getPlan(form.get('plan'))
  const email = normalizeEmail(form.get('email'))

  if (!plan || !email) {
    return new Response('Missing plan or email', { status: 400 })
  }

  const priceId = getPlanPriceId(plan)
  if (!priceId) {
    return new Response(`${plan.priceEnv} is not configured`, { status: 500 })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    client_reference_id: email,
    allow_promotion_codes: true,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      email,
      plan: plan.id,
      source: 'flowdown-hosted',
    },
    subscription_data: {
      metadata: {
        email,
        plan: plan.id,
        source: 'flowdown-hosted',
      },
    },
    success_url: `${appUrl('/success', request)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: appUrl('/cancel', request),
  })

  return NextResponse.redirect(session.url, 303)
}
