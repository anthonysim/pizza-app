import { createHmac, timingSafeEqual } from 'node:crypto'
import { appURL } from './backend.ts'
import type { Order } from './orders'

export type CheckoutSession = {
  id: string
  object: 'checkout.session'
  status: 'open' | 'complete' | 'expired'
  mode: 'payment'
  payment_status: 'paid' | 'unpaid' | 'no_payment_required'
  livemode: boolean
  amount_total: number
  currency: string
  client_reference_id: string
  metadata: { order_id?: string }
  url: string | null
}

async function stripe(path: string, body?: URLSearchParams, key?: string): Promise<CheckoutSession> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret?.startsWith('sk_test_') && !secret?.startsWith('rk_test_')) {
    throw new Error('A Stripe test key is required')
  }
  const headers = new Headers({ Authorization: `Bearer ${secret}` })
  if (key) headers.set('Idempotency-Key', key)
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? 'POST' : 'GET', headers, body, cache: 'no-store', signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Stripe request failed (${response.status})`)
  return response.json()
}

export function createCheckout(order: Order) {
  const body = new URLSearchParams({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    success_url: new URL(`/orders/${order.id}?checkout=return`, appURL()).href,
    cancel_url: new URL('/?cart=open#menu', appURL()).href,
    client_reference_id: order.id,
    'metadata[order_id]': order.id,
    customer_email: order.email,
  })
  order.items.forEach((item, index) => {
    const line = `line_items[${index}]`
    body.set(`${line}[price_data][currency]`, order.currency)
    body.set(`${line}[price_data][unit_amount]`, String(item.cents))
    body.set(`${line}[price_data][product_data][name]`, item.name)
    body.set(`${line}[quantity]`, String(item.quantity))
  })
  return stripe('checkout/sessions', body, order.id)
}

export function retrieveCheckout(sessionId: string) {
  return stripe(`checkout/sessions/${encodeURIComponent(sessionId)}`)
}

export function validSignature(raw: string, header: string, secret: string, now = Date.now()) {
  const fields = header.split(',').map(part => part.trim().split('=', 2))
  const timestamp = fields.find(([name]) => name === 't')?.[1]
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const digest = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest()
  return fields.some(([name, value]) =>
    name === 'v1' && /^[a-f0-9]{64}$/i.test(value ?? '') &&
    timingSafeEqual(digest, Buffer.from(value, 'hex')))
}

export function matchesOrder(session: CheckoutSession, order: Order) {
  return session.object === 'checkout.session' && session.mode === 'payment' && session.livemode === false &&
    session.client_reference_id === order.id && session.metadata?.order_id === order.id &&
    session.amount_total === order.total_cents && session.currency === order.currency &&
    (!order.stripe_session_id || session.id === order.stripe_session_id) &&
    /^cs_test_[a-zA-Z0-9_]+$/.test(session.id)
}
