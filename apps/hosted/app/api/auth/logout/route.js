import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'
import { appUrl } from '@/lib/url'

export async function POST(request) {
  const response = NextResponse.redirect(appUrl('/', request), 303)
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
