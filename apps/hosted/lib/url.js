export function appBaseUrl(request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (request?.url) return new URL(request.url).origin
  return 'http://localhost:3000'
}

export function appUrl(path = '/', request) {
  return new URL(path, appBaseUrl(request)).toString()
}
