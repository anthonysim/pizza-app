import Link from 'next/link'
import { Brand } from './brand'
import { signOut } from './account/actions'
import { statusLabel, type Order } from '../lib/orders'
import { money } from '../lib/menu'

export function AppHeader({ signedIn = false, staff = false }: { signedIn?: boolean; staff?: boolean }) {
  return <header className="store-header"><div className="wrap header-inner">
    <Brand />
    <nav aria-label="Main navigation">
      <Link href="/#menu">Menu</Link>
      {signedIn ? <Link href="/orders">My orders</Link> : null}
      {staff ? <Link href="/staff">Staff</Link> : null}
      {signedIn ? <form action={signOut}><button className="nav-button">Sign out</button></form> : null}
    </nav>
  </div></header>
}

export function OrderSummary({ order }: { order: Order }) {
  return <>
    <div className="order-heading"><h2>Order #{order.number}</h2>
      <span className="order-status" data-status={order.status}>{statusLabel[order.status]}</span>
    </div>
    <ul className="order-lines">
      {order.items.map(item => <li key={item.id}>
        <span>{item.quantity} × {item.name}</span><span>{money(item.quantity * item.cents)}</span>
      </li>)}
    </ul>
    <div className="cart-total"><strong>Total</strong><strong>{money(order.total_cents)}</strong></div>
  </>
}
