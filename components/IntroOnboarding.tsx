'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Check if the current user has seen the intro (from database)
 * Returns true if user has seen intro, false otherwise
 * Returns true by default if no user is logged in (to avoid showing intro on login page)
 * Falls back to localStorage if database column doesn't exist
 */
export async function hasSeenIntro(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return true // No user = don't show intro
    
    // Try database first
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('has_seen_intro')
      .eq('id', user.id)
      .maybeSingle()
    
    if (error) {
      // Check if error is due to missing column
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.warn('[hasSeenIntro] Column has_seen_intro does not exist, falling back to localStorage')
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('has_seen_intro')
          return stored === 'true'
        }
        return false // Show intro if column doesn't exist and no localStorage
      }
      console.error('[hasSeenIntro] Error fetching profile:', error)
      // Fallback to localStorage on other errors too
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('has_seen_intro')
        return stored === 'true'
      }
      return false // Show intro on error
    }
    
    // If profile exists and has the field, use it
    if (profile && 'has_seen_intro' in profile) {
      return profile.has_seen_intro === true
    }
    
    // Fallback to localStorage if profile exists but field is missing
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('has_seen_intro')
      return stored === 'true'
    }
    
    return false // Show intro if no data found
  } catch (e) {
    console.error('[hasSeenIntro] Exception:', e)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('has_seen_intro')
      return stored === 'true'
    }
    return false // Show intro on exception
  }
}

/**
 * Mark the intro as seen for the current user (save to database)
 * Falls back to localStorage if database column doesn't exist
 */
export async function setIntroSeen(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Fallback to localStorage if no user
      if (typeof window !== 'undefined') {
        localStorage.setItem('has_seen_intro', 'true')
      }
      return
    }
    
    // Try database first
    const { error } = await supabase
      .from('profiles')
      .update({ has_seen_intro: true })
      .eq('id', user.id)
    
    if (error) {
      // Check if error is due to missing column
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        console.warn('[setIntroSeen] Column has_seen_intro does not exist, using localStorage')
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('has_seen_intro', 'true')
        }
        return
      }
      console.error('[setIntroSeen] Error updating profile:', error)
      // Fallback to localStorage on other errors too
      if (typeof window !== 'undefined') {
        localStorage.setItem('has_seen_intro', 'true')
      }
      return
    }
    
    // Also save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_intro', 'true')
    }
  } catch (e) {
    console.error('[setIntroSeen] Exception:', e)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_intro', 'true')
    }
  }
}

/**
 * Reset intro status to show it again (e.g. "Watch intro again" button)
 * Falls back to localStorage if database column doesn't exist
 */
export async function resetIntro(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Try database if user exists
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ has_seen_intro: false })
        .eq('id', user.id)
      
      if (error) {
        // Check if error is due to missing column
        if (error.code === '42703' || error.message?.includes('does not exist')) {
          console.warn('[resetIntro] Column has_seen_intro does not exist, using localStorage')
        } else {
          console.error('[resetIntro] Error updating profile:', error)
        }
      }
    }
    
    // Always clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('has_seen_intro')
    }
  } catch (e) {
    console.error('[resetIntro] Exception:', e)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('has_seen_intro')
    }
  }
}

function buildMessages(firstName: string | null): { text: string }[] {
  const name = firstName?.trim() || 'صديقنا'
  return [
    { text: `مرحباً، ${name}! 👋 أنا مساعدك في منصة دوموبات. سأشرح لك باختصار ما الذي ينتظرك هنا.` },
    { text: 'دوموبات هو برنامج السكن الاقتصادي السريع — نربط بينك وبين فرص السكن المناسب حسب وضعيتك المالية والعائلية.' },
    { text: 'ما الذي ستفعله؟ ستُكمل استمارة واحدة، ندرس طلبك، ونطلب منك المستندات إن لزم الأمر. بعد القبول يمكنك متابعة تقدم مشروعك خطوة بخطوة.' },
    { text: 'قواعد بسيطة: قدّم معلومات صحيحة، أرفق المستندات المطلوبة في الوقت المحدد، وتابع إشعاراتك وطلباتك هنا.' },
    { text: 'جاهز لبدء رحلتك؟ اضغط "لنبدأ" للدخول إلى لوحة التحكم. 🏠' },
  ]
}

function useArabicVoice() {
  const [voiceReady, setVoiceReady] = useState(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => {
      const list = typeof window !== 'undefined' ? window.speechSynthesis?.getVoices() : []
      voicesRef.current = list || []
      setVoiceReady(voicesRef.current.length > 0)
    }
    load()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load
      return () => { window.speechSynthesis.onvoiceschanged = null }
    }
  }, [])

  const speak = useCallback((text: string, lang = 'ar-TN') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9
    const arVoice = voicesRef.current.find(v => v.lang.startsWith('ar'))
    if (arVoice) u.voice = arVoice
    window.speechSynthesis.speak(u)
  }, [])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  return { speak, stop, voiceReady }
}

type Props = {
  userName?: string | null
  onDone: () => void
}

export default function IntroOnboarding({ userName, onDone }: Props) {
  const messages = buildMessages(userName || null)
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const { speak, stop, voiceReady } = useArabicVoice()

  const currentText = messages[step]?.text ?? ''
  const isFirst = step === 0
  const isLast = step === messages.length - 1

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 120)
    return () => clearTimeout(t)
  }, [step])

  useEffect(() => {
    if (!currentText) return
    if (voiceOn && voiceReady) {
      const t = setTimeout(() => speak(currentText), 300)
      return () => { clearTimeout(t); stop() }
    }
  }, [step, currentText, voiceOn, voiceReady, speak, stop])

  const goNext = async () => {
    stop()
    if (isLast) {
      await setIntroSeen()
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  const goPrev = () => {
    stop()
    if (!isFirst) setStep(s => s - 1)
  }

  const skip = async () => {
    stop()
    await setIntroSeen()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-primary-800 via-primary-900 to-gray-900 text-white overflow-hidden">
      {/* Skip link - top right, minimal */}
      <div className="shrink-0 flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={skip}
          className="text-sm text-white/60 hover:text-white"
        >
          تخطي
        </button>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 min-h-0">
        <div className="w-full max-w-[28rem] flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6 w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            <Image src="/logo.png" alt="" width={56} height={56} className="object-contain w-12 h-12" />
          </div>
          {/* Message */}
          <div
            className={`rounded-2xl px-5 py-4 bg-white/10 border border-white/15 backdrop-blur-sm w-full transition-all duration-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-base sm:text-lg leading-relaxed text-white/95">{currentText}</p>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 justify-center mt-6">
            {messages.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < step ? 'w-4 bg-primary-500' : i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Previous + Next / لنبدأ — centered */}
      <div className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="max-w-[28rem] mx-auto flex items-center justify-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-white/30 text-white/90 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
              السابق
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold bg-white text-primary-900 hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg"
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
  )
}
