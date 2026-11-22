import { notFound, redirect } from 'next/navigation'
import { backend } from '../../lib/backend'
import { isStaff, type Order } from '../../lib/orders'
import { getSession } from '../../lib/session'
import { AppHeader, OrderSummary } from '../internal'
import { StaffUpdate } from './update'
import { StaffRefresh } from './refresh'

export default async function Staff() {
  const session = await getSession()
  if (!session) redirect('/account')
  if (!await isStaff(session.token)) notFound()
  const queue = await backend<Order[]>('/rest/v1/orders?status=in.(paid,ready)&order=paid_at.asc,number.asc', { token: session.token })
  return <>
    <AppHeader signedIn staff />
    <main className="wrap internal-page">
      <h1>Pickup queue</h1>
      {queue.length ? <div className="order-grid">
        {queue.map(order => <article className="panel" key={order.id}>
          <OrderSummary order={order} />
          {order.status === 'paid' || order.status === 'ready' ? <StaffUpdate id={order.id} status={order.status} /> : null}
        </article>)}
      </div> : <div className="panel">No paid orders are waiting for pickup.</div>}
    </main>
    <StaffRefresh />
  </>
}
