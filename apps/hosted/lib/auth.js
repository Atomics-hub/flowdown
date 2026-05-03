import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'flowdown_session'
const LOGIN_TTL_SECONDS = 15 * 60
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function authSecret() {
  if (!process.env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is not configured')
  }
  return process.env.AUTH_SECRET
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function sign(body) {
  return createHmac('sha256', authSecret()).update(body).digest('base64url')
}

export function createToken(payload, ttlSeconds) {
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })).toString('base64url')

  return `${body}.${sign(body)}`
}

export function verifyToken(token) {
  const [body, signature] = String(token || '').split('.')
  if (!body || !signature) return null

  const expected = sign(body)
  const signatureBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (
    signatureBytes.length !== expectedBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    return null
  }

  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

export function createLoginToken(email) {
  return createToken({ type: 'login', email: normalizeEmail(email) }, LOGIN_TTL_SECONDS)
}

export function createSessionToken(email) {
  return createToken({ type: 'session', email: normalizeEmail(email) }, SESSION_TTL_SECONDS)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const payload = verifyToken(token)
  if (payload?.type !== 'session' || !payload.email) return null
  return { email: payload.email }
}
