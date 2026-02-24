'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChatProvider } from '@/components/ChatContext'
import ChatWidget from '@/components/ChatWidget'
import ChatFab from '@/components/ChatFab'

const HIDE_CHAT_PATHS = ['/auth/login', '/auth/register', '/dashboard/admin']

/**
 * Floating chat trigger (bottom-right circle) + chat panel.
 * Hidden on login, signup, and when onboarding is visible.
 */
function ChatUI() {
  const pathname = usePathname()
  const [onboardingVisible, setOnboardingVisible] = useState(false)

  useEffect(() => {
    const show = () => setOnboardingVisible(true)
    const hide = () => setOnboardingVisible(false)
    window.addEventListener('onboarding-visible', show)
    window.addEventListener('onboarding-hidden', hide)
    return () => {
      window.removeEventListener('onboarding-visible', show)
      window.removeEventListener('onboarding-hidden', hide)
    }
  }, [])

  const hideChat = pathname && (HIDE_CHAT_PATHS.some((p) => pathname.startsWith(p)) || onboardingVisible)
  if (hideChat) return null

  return (
    <>
      <ChatFab />
      <ChatWidget />
    </>
  )
}

export default function ChatWrapper() {
  return (
    <ChatProvider>
      <ChatUI />
    </ChatProvider>
  )
}
