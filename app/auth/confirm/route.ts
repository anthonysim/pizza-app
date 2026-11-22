import { NextRequest, NextResponse } from 'next/server'
import { appURL, backend, type Session } from '../../../lib/backend'
import { writeSession } from '../../../lib/session'

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  if (tokenHash && (type === 'email' || type === 'magiclink')) {
    try {
      const session = await backend<Session>('/auth/v1/verify', {
        method: 'POST', body: { type, token_hash: tokenHash },
      })
      await writeSession(session)
      return NextResponse.redirect(new URL('/#menu', appURL()))
    } catch {
      // The sign-in screen offers a new link.
    }
  }
  return NextResponse.redirect(new URL('/account?expired=1', appURL()))
}
