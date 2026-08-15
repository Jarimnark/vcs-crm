import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VCS CRM',
  description: 'Internal CRM for VCS — projects, activities, documents, quotations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
