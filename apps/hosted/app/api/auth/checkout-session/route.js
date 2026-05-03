import { NextResponse } from 'next/server'
import { createSessionToken, normalizeEmail, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { appUrl } from '@/lib/url'

export const runtime = 'nodejs'

export async function GET(request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('session_id')
  if (!sessionId) return NextResponse.redirect(appUrl('/login?error=Missing%20checkout%20session', request), 303)

  let checkoutSession
  try {
    checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch {
    return NextResponse.redirect(appUrl('/login?error=Could%20not%20verify%20checkout%20session', request), 303)
  }

  const email = normalizeEmail(
    checkoutSession.customer_details?.email ||
    checkoutSession.customer_email ||
    checkoutSession.client_reference_id
  )

  if (checkoutSession.status !== 'complete' || !email) {
    return NextResponse.redirect(appUrl('/login?error=Checkout%20is%20not%20complete', request), 303)
  }

  const response = NextResponse.redirect(appUrl('/dashboard', request), 303)
  response.cookies.set(SESSION_COOKIE, createSessionToken(email), sessionCookieOptions())
  return response
}
