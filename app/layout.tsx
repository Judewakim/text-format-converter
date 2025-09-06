import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}