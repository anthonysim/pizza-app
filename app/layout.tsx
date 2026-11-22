import type { Metadata } from 'next'
import './styles.css'

export const metadata: Metadata = {
  title: 'Weekend Crust Pizza',
  description: 'Three 12-inch pies. Order online for pickup.',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: `
        if (performance.getEntriesByType('navigation')[0]?.type === 'navigate') {
          document.documentElement.dataset.freshVisit = ''
        }
      ` }} />
    </head>
    <body>{children}</body>
  </html>
}
