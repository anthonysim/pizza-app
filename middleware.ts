import { NextRequest, NextResponse } from 'next/server'
import { accessCookie, refreshCookie, backend, cookieOptions, type Session } from './lib/backend'

export async function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get(refreshCookie)?.value
  if (request.cookies.has(accessCookie) || !refreshToken) return NextResponse.next()
  try {
    const session = await backend<Session>('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', body: { refresh_token: refreshToken },
    })
    request.cookies.set(accessCookie, session.access_token)
    request.cookies.set(refreshCookie, session.refresh_token)
    const response = NextResponse.next({ request: { headers: request.headers } })
    response.cookies.set(accessCookie, session.access_token, { ...cookieOptions, maxAge: session.expires_in })
    response.cookies.set(refreshCookie, session.refresh_token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch {
    return NextResponse.next()
  }
}

export const config = { matcher: ['/((?!_next|api/stripe|auth/confirm|.*\\.).*)'] }
