import { backend } from './backend'
import type { orderItems } from './menu'

export type OrderStatus = 'pending' | 'paid' | 'ready' | 'picked_up' | 'expired'
export type Order = {
  id: string
  number: number
  user_id: string
  email: string
  items: NonNullable<ReturnType<typeof orderItems>>
  total_cents: number
  currency: 'usd'
  status: OrderStatus
  stripe_session_id: string | null
  created_at: string
  paid_at: string | null
}

export const statusLabel: Record<OrderStatus, string> = {
  pending: 'Awaiting payment', paid: 'Paid', ready: 'Ready for pickup',
  picked_up: 'Picked up', expired: 'Checkout expired',
}

export const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)

export async function isStaff(token: string) {
  const rows = await backend<{user_id: string}[]>('/rest/v1/staff?select=user_id&limit=1', { token })
  return rows.length > 0
}

export async function findOrder(id: string, userId: string, token: string) {
  const [order] = await backend<Order[]>(`/rest/v1/orders?id=eq.${id}&user_id=eq.${userId}`, { token })
  return order
}
