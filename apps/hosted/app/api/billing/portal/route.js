import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { firstCustomerForEmail } from '@/lib/billing'
import { getStripe } from '@/lib/stripe'
import { appUrl } from '@/lib/url'

export const runtime = 'nodejs'

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(appUrl('/login', request), 303)

  const customer = await firstCustomerForEmail(session.email)
  if (!customer) {
    return new Response('No Stripe customer found for this email', { status: 404 })
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customer.id,
    return_url: appUrl('/dashboard', request),
  })

  return NextResponse.redirect(portal.url, 303)
}
