'use server'

import { revalidatePath } from 'next/cache'
import { backend } from '../../lib/backend'
import { validId } from '../../lib/orders'
import { getSession } from '../../lib/session'

export async function advanceOrder(_: string, form: FormData): Promise<string> {
  const id = form.get('id')
  const status = form.get('status')
  if (!validId(id) || (status !== 'paid' && status !== 'ready')) return 'This order update is unavailable.'
  const session = await getSession()
  if (!session) return 'Sign in again to update this order.'
  try {
    const updated = await backend<boolean>('/rest/v1/rpc/advance_order', {
      method: 'POST', token: session.token, body: { order_id: id, current_status: status },
    })
    revalidatePath('/staff')
    return updated ? '' : 'Another staff member already updated this order.'
  } catch {
    return 'Unable to update this order. Check your session and try again.'
  }
}
