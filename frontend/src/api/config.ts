export function getApiBaseUrl() {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  const baseUrl = typeof v === 'string' ? v.trim() : ''
  return baseUrl || 'http://localhost:3001'
}

