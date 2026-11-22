'use client'

import { useActionState, useState } from 'react'
import { authenticate } from './actions'

const modes = {
  login: { title: 'Sign in', label: 'Sign in' },
  signup: { title: 'Create an account', label: 'Create account' },
  magic: { title: 'Sign in with a link', label: 'Email me a sign-in link' },
}

type Mode = keyof typeof modes

function AuthForm({ mode, unavailable }: { mode: Mode; unavailable: boolean }) {
  const [message, action, pending] = useActionState(authenticate, '')
  return <form action={action} className="account-form">
    <input type="hidden" name="mode" value={mode} />
    <label>Email<input required type="email" name="email" autoComplete="email" maxLength={254} /></label>
    {mode === 'magic' ? null : <label>Password<input required type="password" name="password"
      minLength={mode === 'signup' ? 8 : undefined} maxLength={72}
      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>}
    {message ? <p role="status" className="message">{message}</p> : null}
    <button className="button primary full" disabled={unavailable || pending}>{pending ? 'Please wait…' : modes[mode].label}</button>
  </form>
}

export function AccountForm({ unavailable, expired }: { unavailable: boolean; expired: boolean }) {
  const [mode, setMode] = useState<Mode>(expired ? 'magic' : 'login')
  return <>
    <h1>{modes[mode].title}</h1>
    {unavailable ? <p role="status" className="message">Account service is unavailable until local Supabase is configured.</p> : null}
    {expired && mode === 'magic' ? <p className="message">That link is invalid or expired. Request a new one below.</p> : null}
    <AuthForm key={mode} mode={mode} unavailable={unavailable} />
    <div className="auth-links">
      {mode !== 'login' ? <button onClick={() => setMode('login')}>Sign in with password</button> : null}
      {mode !== 'signup' ? <button onClick={() => setMode('signup')}>Create an account</button> : null}
      {mode !== 'magic' ? <button onClick={() => setMode('magic')}>Email me a sign-in link</button> : null}
    </div>
  </>
}
