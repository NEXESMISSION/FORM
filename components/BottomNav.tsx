'use client'

import { useEffect, useState, Component, ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Home, FolderOpen, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard/applicant', label: 'الرئيسية', icon: Home, match: (p: string, q: URLSearchParams) => p?.startsWith('/dashboard/applicant') && q.get('form') !== '1' && q.get('tab') !== 'profile' },
  { href: '/projects', label: 'المشاريع', icon: FolderOpen, match: (p: string) => p?.startsWith('/projects') ?? false },
  { href: '/dashboard/applicant?tab=profile', label: 'الملف', icon: User, match: (p: string, q: URLSearchParams) => p === '/dashboard/applicant' && q.get('tab') === 'profile' },
]

// Error boundary for BottomNav to prevent useContext errors
class BottomNavErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[BottomNav] Error caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[28rem] h-20" aria-hidden="true" />
    }
    return this.props.children
  }
}

export default function BottomNav() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[28rem] h-20" aria-hidden="true" />
  }
  return (
    <BottomNavErrorBoundary>
      <BottomNavInner />
    </BottomNavErrorBoundary>
  )
}

function BottomNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Safety check: if hooks return null/undefined, render placeholder
  if (!pathname && !searchParams) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[28rem] h-20" aria-hidden="true" />
    )
  }

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-3xl shadow-soft w-[calc(100%-2rem)] max-w-[28rem] safe-bottom"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 0.5rem)' }}
    >
      <div className="h-20 flex items-center justify-around px-3">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = match ? match(pathname || '', searchParams) : pathname === href
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl transition-colors min-w-0 ${
                active ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                active ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-50'
              }`}>
                <Icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <span className="text-xs font-medium truncate max-w-full">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
