/**
 * Custom Next.js image loader.
 * For domains that return 403 when Next server fetches them (e.g. media.prefabex.com),
 * return the URL as-is so the browser loads the image directly.
 * All other images go through Next.js image optimization.
 */
const UNOPTIMIZED_HOSTNAMES = ['media.prefabex.com']

function getHostname(url) {
  try {
    return new URL(url, 'https://_').hostname
  } catch {
    return ''
  }
}

module.exports = function imageLoader({ src, width, quality }) {
  // Local static files (e.g. /logo.png) — use as-is so they work with custom loader
  if (typeof src === 'string' && src.startsWith('/') && !src.startsWith('//')) {
    return src
  }
  const hostname = getHostname(src)
  if (UNOPTIMIZED_HOSTNAMES.includes(hostname)) {
    return src
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`
}
