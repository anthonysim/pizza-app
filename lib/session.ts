import { cache } from 'react'
import { cookies } from 'next/headers'
import { accessCookie, refreshCookie, backend, BackendError, configured, cookieOptions, type Session, type User } from './backend'

export const getSession = cache(async () => {
  const token = (await cookies()).get(accessCookie)?.value
  if (!token || !configured()) return null
  try {
    const user = await backend<User>('/auth/v1/user', { token })
    return user.email_confirmed_at ? { token, user } : null
  } catch (error) {
    if (error instanceof BackendError && [400, 401, 403].includes(error.status)) return null
    throw error
  }
})

export async function writeSession(session: Session) {
  const jar = await cookies()
  jar.set(accessCookie, session.access_token, { ...cookieOptions, maxAge: session.expires_in })
  jar.set(refreshCookie, session.refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 })
}
