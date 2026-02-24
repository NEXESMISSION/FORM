'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const INTRO_STORAGE_KEY = 'domobat_has_seen_intro'
const JUST_SIGNED_UP_KEY = 'domobat_just_signed_up'

/**
 * Check if the current user has seen the intro.
 * Uses localStorage only to avoid 400 when profiles.has_seen_intro column is missing.
 * Returns true if user has seen intro, false otherwise.
 * Returns true by default if no user is logged in (to avoid showing intro on login page).
 * If sessionStorage has "just signed up" flag, returns false so onboarding always shows once after signup.
 */
export async function hasSeenIntro(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return true // No user = don't show intro

    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(JUST_SIGNED_UP_KEY) === '1') return false // Force show intro after signup
      const stored = localStorage.getItem(INTRO_STORAGE_KEY)
      return stored === 'true'
    }
    return false
  } catch {
    return true // On error, don't block (don't show intro)
  }
}

/**
 * Mark the intro as seen for the current user (localStorage only, no DB call to avoid 400).
 */
export async function setIntroSeen(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INTRO_STORAGE_KEY, 'true')
      sessionStorage.removeItem(JUST_SIGNED_UP_KEY)
    }
  } catch {
    // ignore
  }
}

/**
 * Reset intro status to show it again (e.g. "Watch intro again" button). Uses localStorage only.
 */
export async function resetIntro(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(INTRO_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

function buildMessages(firstName: string | null): { text: string }[] {
  const name = firstName?.trim()
  const greeting = name ? `مرحباً، ${name}! 👋` : 'مرحباً! 👋'
  return [
    { text: `${greeting} أنا مساعدك في منصة دوموبات. سأشرح لك باختصار ما الذي ينتظرك هنا.` },
    { text: 'دوموبات هو برنامج السكن الاقتصادي السريع — نربط بينك وبين فرص السكن المناسب حسب وضعيتك المالية والعائلية.' },
    { text: 'ما الذي ستفعله؟ ستُكمل استمارة واحدة، ندرس طلبك، ونطلب منك المستندات إن لزم الأمر. بعد القبول يمكنك متابعة تقدم مشروعك خطوة بخطوة.' },
    { text: 'قواعد بسيطة: قدّم معلومات صحيحة، أرفق المستندات المطلوبة في الوقت المحدد، وتابع إشعاراتك وطلباتك هنا.' },
    { text: 'جاهز لبدء رحلتك؟ اضغط "لنبدأ" للدخول إلى لوحة التحكم. 🏠' },
  ]
}


type Props = {
  userName?: string | null
  onDone: () => void
}

export default function IntroOnboarding({ userName, onDone }: Props) {
  const messages = buildMessages(userName || null)
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  const currentText = messages[step]?.text ?? ''
  const isFirst = step === 0
  const isLast = step === messages.length - 1

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 120)
    return () => clearTimeout(t)
  }, [step])

  const goNext = async () => {
    if (isLast) {
      await setIntroSeen()
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  const goPrev = () => {
    if (!isFirst) setStep(s => s - 1)
  }

  const skip = async () => {
    await setIntroSeen()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gold-50 overflow-hidden">
      {/* Skip link - top right */}
      <div className="shrink-0 flex justify-end px-4 pt-4 safe-top">
        <button
          type="button"
          onClick={skip}
          className="text-sm text-gold-600 hover:text-gold-900 transition-colors touch-manipulation"
        >
          تخطي
        </button>
      </div>

      {/* Centered content + buttons in one flow (buttons not stuck at very bottom) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0">
        <div className="w-full max-w-[28rem] flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6 w-14 h-14 rounded-2xl bg-white border-2 border-gold-300 flex items-center justify-center overflow-hidden shadow-md">
            <Image src="/logo.png" alt="" width={56} height={56} className="object-contain w-12 h-12" style={{ width: 'auto', height: 'auto' }} />
          </div>
          {/* Message */}
          <div
            className={`rounded-2xl px-5 py-4 bg-white border-2 border-gold-300 shadow-sm w-full transition-all duration-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-base sm:text-lg leading-relaxed text-gold-900">{currentText}</p>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 justify-center mt-6">
            {messages.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < step ? 'w-4 bg-gold-400' : i === step ? 'w-6 bg-gold-600' : 'w-1.5 bg-gold-200'
                }`}
              />
            ))}
          </div>

          {/* Buttons: same max-width as content, spaced below dots (not at screen bottom) */}
          <div className="mt-10 w-full flex items-center justify-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gold-300 bg-white text-gold-900 hover:bg-gold-50 hover:border-gold-400 transition-all touch-manipulation"
            >
              <ChevronRight className="w-5 h-5" />
              السابق
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-b from-gold-400 to-gold-600 text-white hover:from-gold-500 hover:to-gold-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg touch-manipulation"
          >
            {isLast ? (
              <>
                <Sparkles className="w-5 h-5" />
                لنبدأ
              </>
            ) : (
              <>
                التالي
                <ChevronLeft className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
        </div>
      </div>

      {/* Safe area spacer only at very bottom (no buttons here) */}
      <div className="shrink-0 h-[env(safe-area-inset-bottom,0.75rem)]" aria-hidden />
    </div>
  )
}
