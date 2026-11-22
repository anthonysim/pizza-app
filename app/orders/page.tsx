import Link from 'next/link'
import { redirect } from 'next/navigation'
import { backend } from '../../lib/backend'
import { type Order } from '../../lib/orders'
import { getSession } from '../../lib/session'
import { AppHeader, OrderSummary } from '../internal'

export default async function Orders() {
  const session = await getSession()
  if (!session) redirect('/account')
  const orders = await backend<Order[]>(
    `/rest/v1/orders?user_id=eq.${session.user.id}&order=created_at.desc`,
    { token: session.token },
  )
  return <>
    <AppHeader signedIn />
    <main className="wrap internal-page">
      <h1>My orders</h1>
      {orders.length ? <div className="order-grid">
        {orders.map(order => <article className="panel" key={order.id}>
          <OrderSummary order={order} />
          <Link className="text-link" href={`/orders/${order.id}`}>View order #{order.number}</Link>
        </article>)}
      </div> : <div className="panel"><p>You haven’t placed an order yet.</p>
        <Link className="button primary" href="/#menu">Browse pizzas</Link></div>}
    </main>
  </>
}
