'use client'

import Link from 'next/link'
import { Brand } from './brand'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <>
    <header className="store-header"><div className="wrap header-inner"><Brand /></div></header>
    <main className="wrap internal-page">
      <h1>Something went wrong</h1>
      <p className="muted">Please try again in a moment.</p>
      <div className="auth-links">
        <button onClick={reset}>Try again</button>
        <Link className="text-link" href="/">Back to menu</Link>
      </div>
    </main>
  </>
}
