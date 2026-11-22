export type User = { id: string; email?: string; email_confirmed_at?: string }
export type Session = { access_token: string; refresh_token: string; expires_in: number; user: User }

export class BackendError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Supabase request failed (${status})`)
    this.status = status
  }
}

export function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY)
}

export async function backend<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string; privileged?: boolean; prefer?: string } = {},
): Promise<T> {
  const key = options.privileged ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY
  if (!key || !process.env.SUPABASE_URL) throw new BackendError(503)
  const headers = new Headers({ apikey: key })
  if (options.token || (options.privileged && key.startsWith('eyJ'))) {
    headers.set('Authorization', `Bearer ${options.token ?? key}`)
  }
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.prefer) headers.set('Prefer', options.prefer)
  const response = await fetch(new URL(path, process.env.SUPABASE_URL), {
    method: options.method, headers, body: JSON.stringify(options.body), cache: 'no-store', signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new BackendError(response.status)
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  const body = await response.text()
  return body ? JSON.parse(body) as T : undefined as T
}

export const appURL = () => new URL(process.env.APP_URL ?? 'http://localhost:3000')
export const accessCookie = 'ahp_access'
export const refreshCookie = 'ahp_refresh'
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/',
  secure: process.env.APP_URL?.startsWith('https:') ?? false }
