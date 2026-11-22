'use client'

import { useActionState } from 'react'
import { advanceOrder } from './actions'

export function StaffUpdate({ id, status }: { id: string; status: 'paid' | 'ready' }) {
  const [message, action, pending] = useActionState(advanceOrder, '')
  return <form action={action}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="status" value={status} />
    <button className="button primary" disabled={pending}>
      {pending ? 'Updating…' : status === 'paid' ? 'Mark ready' : 'Mark picked up'}
    </button>
    {message ? <p role="status" className="message">{message}</p> : null}
  </form>
}
