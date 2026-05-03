import { NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyToken,
} from '@/lib/auth'
import { appUrl } from '@/lib/url'

export const runtime = 'nodejs'

export async function GET(request) {
  const url = new URL(request.url)
  const payload = verifyToken(url.searchParams.get('token'))

  if (payload?.type !== 'login' || !payload.email) {
    return NextResponse.redirect(appUrl('/login?error=Invalid%20or%20expired%20login%20link', request), 303)
  }

  const response = NextResponse.redirect(appUrl('/dashboard', request), 303)
  response.cookies.set(SESSION_COOKIE, createSessionToken(payload.email), sessionCookieOptions())
  return response
}
