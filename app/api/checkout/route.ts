import { NextRequest, NextResponse } from 'next/server'
import { appURL, backend } from '../../../lib/backend'
import { orderItems } from '../../../lib/menu'
import { findOrder, validId, type Order } from '../../../lib/orders'
import { getSession } from '../../../lib/session'
import { createCheckout, matchesOrder, retrieveCheckout } from '../../../lib/stripe'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== appURL().origin) {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
  }
  const payload = await request.json().catch(() => null)
  const id = payload?.id
  const items = orderItems(payload?.cart)
  if (!validId(id) || !items) return NextResponse.json({ error: 'Review your cart and try again.' }, { status: 400 })
  try {
    const session = await getSession()
    if (!session?.user.email) return NextResponse.json({ error: 'Sign in to check out.' }, { status: 401 })

    let order = await findOrder(id, session.user.id, session.token)
    if (!order) {
      await backend('/rest/v1/orders?on_conflict=id', {
        method: 'POST', privileged: true, prefer: 'resolution=ignore-duplicates',
        body: {
          id, user_id: session.user.id, email: session.user.email, items,
          total_cents: items.reduce((total, item) => total + item.cents * item.quantity, 0),
        },
      })
      order = await findOrder(id, session.user.id, session.token)
    }
    if (!order) return NextResponse.json({ error: 'This checkout is unavailable.' }, { status: 409 })
    if (order.status !== 'pending') {
      return NextResponse.json(order.status === 'expired' ? { expired: true } : { url: `/orders/${id}` })
    }

    // Stripe can discard idempotency keys after 24 hours. Never recreate an old, unbound session.
    if (!order.stripe_session_id && Date.now() - Date.parse(order.created_at) > 23 * 60 * 60 * 1000) {
      return NextResponse.json({ url: `/orders/${id}` })
    }
    const checkout = order.stripe_session_id
      ? await retrieveCheckout(order.stripe_session_id)
      : await createCheckout(order)
    if (!matchesOrder(checkout, order)) throw new Error('Checkout does not match its order')
    if (!order.stripe_session_id) {
      await backend<Order[]>(`/rest/v1/orders?id=eq.${id}&stripe_session_id=is.null`, {
        method: 'PATCH', privileged: true, body: { stripe_session_id: checkout.id },
      })
    }
    if (checkout.status === 'expired') {
      await backend(`/rest/v1/orders?id=eq.${id}&status=eq.pending`, {
        method: 'PATCH', privileged: true, body: { status: 'expired' },
      })
      return NextResponse.json({ expired: true })
    }
    return NextResponse.json({ url: checkout.status === 'open' && checkout.url ? checkout.url : `/orders/${id}?checkout=return` })
  } catch (error) {
    console.error('Checkout failed', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Checkout is unavailable. Your cart is saved. Please try again.' }, { status: 503 })
  }
}
