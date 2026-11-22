import { redirect } from 'next/navigation'
import { configured } from '../../lib/backend'
import { getSession } from '../../lib/session'
import { AppHeader } from '../internal'
import { AccountForm } from './form'

export default async function Account({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const [session, query] = await Promise.all([getSession(), searchParams])
  if (session && !query.expired) redirect('/#menu')

  return <>
    <AppHeader />
    <main className="wrap internal-page"><section className="panel account-panel">
      <AccountForm unavailable={!configured()} expired={query.expired === '1'} />
    </section></main>
  </>
}
