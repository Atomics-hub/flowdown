import { NextResponse } from 'next/server'
import { createLoginToken, normalizeEmail } from '@/lib/auth'
import { sendLoginLink } from '@/lib/email'
import { appUrl } from '@/lib/url'

export const runtime = 'nodejs'

export async function POST(request) {
  const form = await request.formData()
  const email = normalizeEmail(form.get('email'))
  if (!email) return NextResponse.redirect(appUrl('/login?error=Email%20is%20required', request), 303)

  let token
  try {
    token = createLoginToken(email)
  } catch {
    return NextResponse.redirect(appUrl('/login?error=AUTH_SECRET%20is%20not%20configured', request), 303)
  }

  const loginUrl = appUrl(`/api/auth/callback?token=${encodeURIComponent(token)}`, request)

  try {
    const result = await sendLoginLink(email, loginUrl)
    const target = new URL(appUrl('/login', request))
    if (result.skipped && !result.devLink) {
      target.searchParams.set('error', 'Email provider is not configured')
      return NextResponse.redirect(target, 303)
    }
    target.searchParams.set('sent', '1')
    if (result.devLink) target.searchParams.set('dev_link', result.devLink)
    return NextResponse.redirect(target, 303)
  } catch (error) {
    const target = new URL(appUrl('/login', request))
    target.searchParams.set('error', error.message)
    return NextResponse.redirect(target, 303)
  }
}
