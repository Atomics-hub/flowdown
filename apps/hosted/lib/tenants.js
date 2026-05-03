export function getTenants() {
  const tenants = []

  if (process.env.FLOWDOWN_RENDER_API_KEY) {
    tenants.push({
      name: 'Default Cloud Render tenant',
      email: '',
      apiKey: process.env.FLOWDOWN_RENDER_API_KEY,
      plan: 'cloud',
    })
  }

  const raw = process.env.FLOWDOWN_TENANTS_JSON || '[]'
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const tenant of parsed) {
        if (tenant?.apiKey) tenants.push(tenant)
      }
    }
  } catch {
    return tenants
  }

  return tenants
}

export function findTenantByApiKey(apiKey) {
  return getTenants().find((tenant) => tenant.apiKey === apiKey) || null
}

export function tenantsForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  return getTenants().filter((tenant) => String(tenant.email || '').trim().toLowerCase() === normalized)
}

export function maskApiKey(apiKey) {
  if (!apiKey) return ''
  if (apiKey.length <= 10) return `${apiKey.slice(0, 3)}...`
  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`
}
