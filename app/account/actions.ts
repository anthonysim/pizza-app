'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { accessCookie, refreshCookie, backend, BackendError, type Session } from '../../lib/backend'
import { writeSession } from '../../lib/session'

export async function authenticate(_: string, form: FormData): Promise<string> {
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const mode = form.get('mode')
  if (!email || email.length > 254) return 'Enter a valid email address.'
  try {
    if (mode === 'signup') {
      if (password.length < 8 || new TextEncoder().encode(password).length > 72) return 'Use a password between 8 characters and 72 bytes.'
      await backend('/auth/v1/signup', { method: 'POST', body: { email, password } })
      return 'Check your inbox for a link to confirm your account.'
    }
    if (mode === 'magic') {
      await backend('/auth/v1/otp', { method: 'POST', body: { email, create_user: false } })
      return 'If an account exists for that email, a sign-in link is on its way.'
    }
    const session = await backend<Session>('/auth/v1/token?grant_type=password', {
      method: 'POST', body: { email, password },
    })
    await writeSession(session)
  } catch (error) {
    if (error instanceof BackendError) {
      if (error.status === 429) return 'Too many attempts. Try again in a moment.'
      if (error.status < 500) {
        if (mode === 'magic') return 'If an account exists for that email, a sign-in link is on its way.'
        if (mode === 'signup') return 'Check your email and password and try again.'
        return 'Check your email and password, and confirm your email before signing in.'
      }
    }
    return 'Account service is unavailable. Try again shortly.'
  }
  redirect('/#menu')
}

export async function signOut() {
  const jar = await cookies()
  const token = jar.get(accessCookie)?.value
  if (token) {
    try {
      await backend('/auth/v1/logout?scope=local', { method: 'POST', token })
    } catch {
      // Clearing this browser's cookies still signs it out if the provider is unavailable.
    }
  }
  jar.delete(accessCookie)
  jar.delete(refreshCookie)
  redirect('/')
}
