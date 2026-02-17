'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InvestorRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/applicant')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner w-8 h-8"></div>
    </div>
  )
}
