import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata = {
  title: 'AI Text Tools Dashboard',
  description: 'Professional AI-powered text manipulation tools',
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