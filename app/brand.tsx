import Link from 'next/link'

export function Brand() {
  return <Link href="/" className="brand" aria-label="Weekend Crust Pizza home">
    <span className="brand-mark" aria-hidden="true">✳</span>
    <span>WEEKEND CRUST<span className="brand-pizza">PIZZA</span></span>
  </Link>
}
