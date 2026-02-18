/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
    ],
  },
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/logo.png', permanent: false }]
  },
  // Ensure PWA manifest and static assets are served
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ]
  },
}

module.exports = nextConfig
