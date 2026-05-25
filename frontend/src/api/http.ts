export type HttpError = {
  status: number
  body: unknown
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export async function http<T>(
  path: string,
  opts: {
    method?: string
    baseUrl: string
    token?: string | null
    body?: unknown
  },
): Promise<T> {
  if (!opts.baseUrl || typeof opts.baseUrl !== 'string') throw new Error('api_base_url_missing')
  const res = await fetch(joinUrl(opts.baseUrl, path), {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const err: HttpError = { status: res.status, body: data }
    throw err
  }

  return data as T
}
