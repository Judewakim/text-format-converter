// Root layout component - defines the base HTML structure and global providers
// Wraps all pages with authentication context and applies global styles
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { SubscriptionProvider } from '@/components/SubscriptionProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata = {
  title: 'AI Text Tools Dashboard',
  description: 'Professional AI-powered text manipulation tools',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sf">
        <ErrorBoundary>
          <AuthProvider>
            <SubscriptionProvider>
              {children}
            </SubscriptionProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}