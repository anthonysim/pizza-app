import Link from 'next/link'

export function Brand() {
  return <Link href="/" className="brand" aria-label="After Hours Pizza home">
    <span className="brand-mark" aria-hidden="true">✳</span>
    <span>AFTER HOURS<span className="brand-pizza">PIZZA</span></span>
  </Link>
}
