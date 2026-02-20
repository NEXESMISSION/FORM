import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientOnlyLayoutExtras from '@/components/ClientOnlyLayoutExtras'
import ChatWidget from '@/components/ChatWidget'
import { SITE_URL, SEO_DEFAULTS, absoluteUrl } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_DEFAULTS.title,
    template: `%s | ${SEO_DEFAULTS.shortTitle}`,
  },
  description: SEO_DEFAULTS.description,
  keywords: [...SEO_DEFAULTS.keywords],
  applicationName: SEO_DEFAULTS.shortTitle,
  authors: [{ name: 'DOMOBAT', url: SITE_URL }],
  creator: 'DOMOBAT',
  publisher: 'DOMOBAT',
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SEO_DEFAULTS.shortTitle,
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: SEO_DEFAULTS.locale,
    url: SITE_URL,
    siteName: SEO_DEFAULTS.shortTitle,
    title: SEO_DEFAULTS.title,
    description: SEO_DEFAULTS.description,
    images: [
      {
        url: SEO_DEFAULTS.imagePath,
        width: SEO_DEFAULTS.imageWidth,
        height: SEO_DEFAULTS.imageHeight,
        alt: SEO_DEFAULTS.shortTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_DEFAULTS.title,
    description: SEO_DEFAULTS.description,
    images: [SEO_DEFAULTS.imagePath],
  },
  themeColor: '#1f2937',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  verification: {
    // Add when you have them (e.g. Google Search Console, Bing)
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  category: 'housing',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'DOMOBAT',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.png'),
      },
      description: SEO_DEFAULTS.description,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'ar',
      potentialAction: {
        '@type': 'RegisterAction',
        target: { '@type': 'EntryPoint', url: absoluteUrl('/auth/register') },
        name: 'إنشاء حساب',
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
    },
  ],
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
        <link rel="icon" href="/icon.png" type="image/png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <Suspense fallback={null}>
          <ClientOnlyLayoutExtras />
        </Suspense>
        {children}
        <ChatWidget />
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
