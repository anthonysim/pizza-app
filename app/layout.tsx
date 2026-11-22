import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Weekend Crust Pizza',
  description: 'Three 12-inch pies. Order online for pickup.',
  icons: { icon: '/icon.png' },
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>
}
