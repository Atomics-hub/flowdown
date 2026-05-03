import { Flowdown } from '@a5omic/flowdown'
import { findTenantByApiKey } from '@/lib/tenants'

export const runtime = 'nodejs'

const MAX_MARKDOWN_BYTES = 250_000

export async function POST(request) {
  const apiKey = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  const tenant = findTenantByApiKey(apiKey)

  if (!tenant) {
    return Response.json({ error: 'Invalid API key' }, { status: 401 })
  }

  if (tenant.plan !== 'cloud') {
    return Response.json({ error: 'Cloud Render plan required' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const markdown = body?.markdown
  if (typeof markdown !== 'string') {
    return Response.json({ error: 'markdown must be a string' }, { status: 400 })
  }

  if (Buffer.byteLength(markdown, 'utf8') > MAX_MARKDOWN_BYTES) {
    return Response.json({ error: 'markdown payload too large' }, { status: 413 })
  }

  const html = Flowdown.renderToString(markdown, {
    sanitize: body.sanitize !== false,
  })

  return Response.json({
    html,
    tenant: tenant.name || 'tenant',
  })
}
