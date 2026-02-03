import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nomion',
  description:
    'Cross-platform automation validation. Validate digital workers against a configurable rulebook before release.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
