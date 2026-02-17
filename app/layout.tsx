import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'DOMOBAT — برنامج السكن الاقتصادي السريع',
  description: 'استمارة رقمية لدراسة الوضعية السكنية والمالية واقتراح الحل السكني الأنسب',
  applicationName: 'DOMOBAT',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DOMOBAT',
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'DOMOBAT',
    title: 'DOMOBAT — برنامج السكن الاقتصادي السريع',
    description: 'استمارة رقمية لدراسة الوضعية السكنية والمالية واقتراح الحل السكني الأنسب',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'DOMOBAT' }],
  },
  twitter: {
    card: 'summary',
    title: 'DOMOBAT — برنامج السكن الاقتصادي السريع',
    description: 'استمارة رقمية لدراسة الوضعية السكنية والمالية واقتراح الحل السكني الأنسب',
    images: ['/logo.png'],
  },
  themeColor: '#2563eb',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
