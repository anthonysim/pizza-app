'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { type Cart, type PizzaId, maxQuantity, menu, money, orderItems, pickup } from '../lib/menu'
import { Brand } from './brand'
import { cartKey } from '../lib/cart'

type SavedCart = { items: Cart; id?: string; owner?: string }
const AddToCart = createContext<(id: PizzaId) => void>(() => undefined)

export function AddPizza({ id, name }: { id: PizzaId; name: string }) {
  const add = useContext(AddToCart)
  return <button className="button outlined" aria-label={`Add ${name} to cart`} onClick={() => add(id)}>
    <span aria-hidden="true">+</span> Add to cart
  </button>
}

function readCart(): SavedCart {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey) ?? '{}') as SavedCart
    return { items: orderItems(saved.items) ? saved.items : {},
      id: typeof saved.id === 'string' ? saved.id : undefined,
      owner: typeof saved.owner === 'string' ? saved.owner : undefined }
  } catch {
    return { items: {} }
  }
}

export function Storefront({ customerId, staff, children }: { customerId?: string; staff: boolean; children: ReactNode }) {
  const [saved, setSaved] = useState<SavedCart>({ items: {} })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const items = orderItems(saved.items) ?? []
  const count = items.reduce((total, item) => total + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.cents * item.quantity, 0)

  useEffect(() => {
    setSaved(readCart())
    if (new URLSearchParams(window.location.search).get('cart') === 'open') dialog.current?.showModal()
    const sync = () => setSaved(readCart())
    window.addEventListener('pageshow', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('pageshow', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function openCart() {
    dialog.current?.showModal()
  }

  function save(next: SavedCart) {
    setSaved(next)
    try {
      localStorage.setItem(cartKey, JSON.stringify(next))
    } catch {
      // The current page can still hold a cart if browser storage is disabled.
    }
  }

  function change(id: PizzaId, delta: number) {
    const quantity = (saved.items[id] ?? 0) + delta
    if (quantity > maxQuantity) {
      setNotice(`Up to ${maxQuantity} of each pizza per order.`)
      return
    }
    const updated = { ...saved.items }
    if (quantity > 0) updated[id] = quantity
    else delete updated[id]
    save({ items: updated })
    setError('')
    setNotice(delta > 0 ? `${menu.find(pizza => pizza.id === id)?.name} added to cart.` : 'Cart updated.')
  }

  async function checkout() {
    setBusy(true)
    setError('')
    try {
      const id = (saved.owner === customerId ? saved.id : undefined) ?? crypto.randomUUID()
      save({ items: saved.items, id, owner: customerId })
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, cart: saved.items }),
      })
      const result = await response.json()
      if (response.status === 401) {
        window.location.assign('/account')
        return
      }
      if (result.expired) {
        save({ items: saved.items })
        setError('Your previous checkout expired. Continue to start a new one.')
        return
      }
      if (!response.ok || typeof result.url !== 'string') {
        setError(result.error ?? 'Checkout is unavailable. Please try again.')
        return
      }
      window.location.assign(result.url)
    } catch {
      setError('Checkout is unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="storefront">
    <header className="store-header">
      <div className="wrap header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <a className="nav-menu" href="#menu">Menu</a>
          {staff ? <Link href="/staff">Staff</Link> : null}
          <Link href={customerId ? '/orders' : '/account'}>{customerId ? 'My orders' : 'Sign in'}</Link>
          <button className="cart-toggle" aria-haspopup="dialog" aria-controls="cart-dialog" onClick={openCart}>
            Cart <span>{count}</span>
          </button>
        </nav>
      </div>
    </header>

    <AddToCart.Provider value={id => change(id, 1)}>{children}</AddToCart.Provider>
    <p role="status" className="sr-only">{notice} {count ? `${count} in cart.` : ''}</p>

    {count > 0 ? <button className="button primary floating-cart" aria-haspopup="dialog"
      aria-controls="cart-dialog" aria-label={`View cart, ${count} ${count === 1 ? 'item' : 'items'}, ${money(total)}`}
      onClick={openCart}>
      <span className="floating-cart-count" aria-hidden="true">{count}</span>
      <span>View cart</span>
      <span>{money(total)}</span>
    </button> : null}

    <footer className="store-footer">
      <div className="wrap footer-inner"><Brand /><p>Pickup only <span aria-hidden="true">·</span> Test orders</p></div>
    </footer>

    <dialog ref={dialog} id="cart-dialog" className="cart-dialog" aria-labelledby="cart-title"
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className="cart-content">
        <div className="cart-heading"><h2 id="cart-title">YOUR CART</h2>
          <button className="close" aria-label="Close cart" onClick={() => dialog.current?.close()}>×</button>
        </div>
        {count === 0 ? <div className="empty-cart"><p>Your cart is empty.</p>
          <a href="#menu" className="button outlined" onClick={() => dialog.current?.close()}>Browse pizzas</a>
        </div> : <>
          <ul className="cart-items">
            {items.map(item => <li key={item.id}>
              <div><strong>{item.name}</strong><span>{money(item.cents * item.quantity)}</span></div>
              <div className="quantity">
                <button disabled={busy} aria-label={`Remove one ${item.name}`} onClick={() => change(item.id, -1)}>−</button>
                <span aria-label="Quantity">{item.quantity}</span>
                <button disabled={busy || item.quantity >= maxQuantity} aria-label={`Add one ${item.name}`} onClick={() => change(item.id, 1)}>+</button>
              </div>
            </li>)}
          </ul>
          <div className="cart-total"><strong>Total</strong><strong>{money(total)}</strong></div>
          <p className="muted">{pickup}</p>
          {error ? <p role="alert" className="message">{error}</p> : null}
          {customerId ? <button className="button primary full" disabled={busy} onClick={checkout}>
            {busy ? 'Opening checkout…' : 'Continue to payment'}
          </button> : <Link className="button primary full" href="/account">Sign in to check out</Link>}
        </>}
      </div>
    </dialog>
  </div>
}
