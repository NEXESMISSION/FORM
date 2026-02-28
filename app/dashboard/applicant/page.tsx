'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicantDashboardContent } from './_page_full'

// When user lands on /dashboard/applicant, redirect to /dashboard so URL shows "dashboard" not "applicant"
export default function ApplicantDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [redirecting, setRedirecting] = useState(true)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    const path = window.location.pathname
    const search = window.location.search || ''
    const isMainApplicant = path === '/dashboard/applicant' || path === '/dashboard/applicant/'
    if (isMainApplicant) {
      router.replace(search ? '/dashboard' + search : '/dashboard?view=requests')
      return
    }
    setRedirecting(false)
  }, [mounted, router])
  if (!mounted || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="spinner w-8 h-8 text-primary-600" />
        </div>
      }
    >
      <ApplicantDashboardContent />
    </Suspense>
  )
}
