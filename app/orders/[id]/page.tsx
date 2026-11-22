import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { findOrder, validId } from '../../../lib/orders'
import { pickup } from '../../../lib/menu'
import { getSession } from '../../../lib/session'
import { AppHeader, OrderSummary } from '../../internal'
import { WatchOrder } from './watch'

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string }>
}) {
  const [session, { id }, query] = await Promise.all([getSession(), params, searchParams])
  if (!session) redirect('/account')
  if (!validId(id)) notFound()
  const order = await findOrder(id, session.user.id, session.token)
  if (!order) notFound()
  const returning = query.checkout === 'return'
  return <>
    <AppHeader signedIn />
    <main className="wrap internal-page">
      <h1>Order details</h1>
      <article className="panel account-panel">
        <OrderSummary order={order} />
        {order.status === 'pending' ? <p className="message" role="status">
          {returning ? 'Waiting for Stripe to confirm payment. This page refreshes automatically.' : 'This order is awaiting payment.'}
        </p> : null}
        <p className="muted">{pickup}</p>
        {order.status === 'pending' || order.status === 'expired'
          ? <Link className="text-link" href="/?cart=open#menu">Back to cart</Link>
          : <Link className="text-link" href="/orders">View all orders</Link>}
      </article>
      <WatchOrder id={order.id} status={order.status} fromCheckout={returning} />
    </main>
  </>
}
