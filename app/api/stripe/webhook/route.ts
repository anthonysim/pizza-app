import { NextRequest } from 'next/server'
import { backend } from '../../../../lib/backend'
import { validId, type Order } from '../../../../lib/orders'
import { matchesOrder, validSignature, type CheckoutSession } from '../../../../lib/stripe'

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response('Webhook unavailable', { status: 503 })
  const header = request.headers.get('stripe-signature')
  if (!header) return new Response('Invalid signature', { status: 400 })
  const raw = await request.text()
  if (!validSignature(raw, header, secret)) return new Response('Invalid signature', { status: 400 })

  let event: { type: string; data: { object: CheckoutSession }; livemode: boolean }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Invalid event', { status: 400 })
  }
  const paid = event.type === 'checkout.session.completed'
  const expired = event.type === 'checkout.session.expired'
  if (event.livemode !== false || (!paid && !expired)) return new Response(null, { status: 204 })
  const session = event.data.object
  const orderId = session.metadata?.order_id
  if (!validId(orderId) || (paid && (session.status !== 'complete' || session.payment_status !== 'paid')) ||
    (expired && session.status !== 'expired')) return new Response(null, { status: 204 })

  try {
    const [order] = await backend<Order[]>(`/rest/v1/orders?id=eq.${orderId}`, { privileged: true })
    if (order && matchesOrder(session, order)) {
      const allowed = paid ? 'in.(pending,expired)' : 'eq.pending'
      await backend(`/rest/v1/orders?id=eq.${orderId}&status=${allowed}&or=(stripe_session_id.is.null,stripe_session_id.eq.${session.id})`, {
        method: 'PATCH', privileged: true,
        body: { stripe_session_id: session.id, status: paid ? 'paid' : 'expired',
          ...(paid ? { paid_at: new Date().toISOString() } : {}) },
      })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Webhook update failed', error instanceof Error ? error.message : error)
    return new Response('Retry webhook', { status: 503 })
  }
}
