'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cartKey } from '../../../lib/cart'
import type { OrderStatus } from '../../../lib/orders'

export function WatchOrder({ id, status, fromCheckout }: { id: string; status: OrderStatus; fromCheckout: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (status === 'pending' || status === 'paid' || status === 'ready') {
      const timer = window.setInterval(() => { if (!document.hidden) router.refresh() }, 4000)
      return () => window.clearInterval(timer)
    }
  }, [router, status])

  useEffect(() => {
    if (!fromCheckout || status === 'pending' || status === 'expired') return
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey) ?? '{}')
      if (saved.id === id) localStorage.removeItem(cartKey)
    } catch {
      // Browser storage can be unavailable.
    }
  }, [fromCheckout, id, status])
  return null
}
