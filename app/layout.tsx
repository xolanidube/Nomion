import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nomion - RPA Quality Gate | Validate Blue Prism, UiPath, Power Automate',
  description:
    'Ship automation with confidence. Validate your RPA releases against 560+ best practice rules for Blue Prism, UiPath, and Power Automate in under 10ms.',
  keywords: 'RPA validation, Blue Prism, UiPath, Power Automate, automation testing, quality gate, CoE tools',
  openGraph: {
    title: 'Nomion - RPA Quality Gate',
    description: 'Validate your automation releases against 560+ rules before production.',
    type: 'website',
  },
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
