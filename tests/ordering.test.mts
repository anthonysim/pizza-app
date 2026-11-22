import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { orderItems } from '../lib/menu.ts'
import { matchesOrder, validSignature, type CheckoutSession } from '../lib/stripe.ts'
import type { Order } from '../lib/orders.ts'

test('checkout validates quantities and uses the catalog prices', () => {
  assert.deepEqual(orderItems({ margherita: 2, mushroom: 1 }), [
    { id: 'margherita', name: 'Margherita', cents: 1600, quantity: 2 },
    { id: 'mushroom', name: 'Mushroom', cents: 1900, quantity: 1 },
  ])
  for (const cart of [null, {}, [], { fake: 1 }, { pepperoni: 13 }, { pepperoni: 0 },
    { pepperoni: -1 }, { pepperoni: 1.5 }, { pepperoni: '2' }, { pepperoni: { cents: 1 } }]) {
    assert.equal(orderItems(cart), null)
  }
})

test('Stripe signature binds the raw body and rejects stale or malformed signatures', () => {
  const secret = 'whsec_fixture'
  const body = '{"type":"checkout.session.completed"}'
  const timestamp = 1_700_000_000
  const now = timestamp * 1000
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  const header = `t=${timestamp},v1=bad,v1=${digest}`
  assert.equal(validSignature(body, header, secret, now), true)
  assert.equal(validSignature(body + ' ', header, secret, now), false)
  assert.equal(validSignature(body, header, 'different', now), false)
  assert.equal(validSignature(body, header, secret, now + 301_000), false)
  assert.equal(validSignature(body, `v1=${digest}`, secret, now), false)
})

test('only a matching test Checkout Session can update an order', () => {
  const order = { id: 'order-1', total_cents: 1800, currency: 'usd', stripe_session_id: null } as Order
  const session: CheckoutSession = {
    id: 'cs_test_123', object: 'checkout.session', mode: 'payment', status: 'complete',
    payment_status: 'paid', livemode: false, client_reference_id: order.id,
    metadata: { order_id: order.id }, amount_total: 1800, currency: 'usd', url: null,
  }
  assert.equal(matchesOrder(session, order), true)
  assert.equal(matchesOrder({ ...session, livemode: true }, order), false)
  assert.equal(matchesOrder({ ...session, amount_total: 1 }, order), false)
  assert.equal(matchesOrder({ ...session, currency: 'eur' }, order), false)
  assert.equal(matchesOrder({ ...session, metadata: {} }, order), false)
  assert.equal(matchesOrder(session, { ...order, stripe_session_id: 'cs_test_other' }), false)
})
