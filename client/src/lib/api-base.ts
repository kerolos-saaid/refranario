const DEFAULT_API_ORIGIN = 'https://api.senor-sha3by.site'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function stripApiSuffix(value: string) {
  return value.replace(/\/api$/i, '')
}

export function getApiBase() {
  const configured = import.meta.env.VITE_API_URL?.trim()
  const origin = configured
    ? stripApiSuffix(trimTrailingSlash(configured))
    : DEFAULT_API_ORIGIN

  return `${origin}/api`
}
