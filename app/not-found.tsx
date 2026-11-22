import Link from 'next/link'
import { AppHeader } from './internal'

export default function NotFound() {
  return <><AppHeader /><main className="wrap internal-page">
    <h1>Page not found</h1><Link className="button primary" href="/#menu">Back to menu</Link>
  </main></>
}
