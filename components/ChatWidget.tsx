'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useDebouncedValue, useLocalStorage } from '@/lib/hooks'

type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: Date | string }

const QUICK_QUESTIONS = [
  'كيف أسجل في التطبيق؟',
  'ما هي المستندات المطلوبة؟',
  'كيف أعرف حالة طلبي؟',
  'ما هي أسعار المساكن؟',
  'كيف يتم التمويل؟',
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [savedMessages, setSavedMessages, clearSavedMessages] = useLocalStorage<ChatMessage[]>('chat-history', [])
  
  // Initialize messages with normalized timestamps from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (savedMessages && savedMessages.length > 0) {
      return savedMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp ? (typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp) : undefined
      }))
    }
    return []
  })
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedInput = useDebouncedValue(input, 500)
  const isInitialMount = useRef(true)

  // Save messages to localStorage (skip initial mount to prevent loop)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    if (messages.length > 0) {
      // Convert Date objects to ISO strings for storage
      const messagesToSave = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }))
      setSavedMessages(messagesToSave)
    }
  }, [messages, setSavedMessages])

  useEffect(() => {
    // Prevent body scroll when chat is open on mobile
    if (open) {
      document.body.classList.add('chat-open')
    } else {
      document.body.classList.remove('chat-open')
    }
    
    return () => {
      document.body.classList.remove('chat-open')
    }
  }, [open])

  useEffect(() => {
    if (open && listRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight
        }
      }, 100)
    }
    if (open && inputRef.current) {
      // Delay focus to prevent keyboard from pushing content immediately
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 300)
    }
  }, [open, messages])

  // Detect typing
  useEffect(() => {
    setIsTyping(debouncedInput.length > 0 && debouncedInput !== input)
  }, [debouncedInput, input])

  const send = async (question?: string) => {
    const text = question || input.trim()
    if (!text || loading) return
    
    setInput('')
    setIsTyping(false)
    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      
      if (!res.ok) {
        // Handle different error statuses
        if (res.status === 404) {
          setError('خدمة الدردشة غير متاحة حالياً. يرجى المحاولة لاحقاً.')
        } else if (res.status === 503) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'خدمة الدردشة غير مفعّلة. يرجى التواصل مع الدعم الفني.')
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'فشل الإرسال. يرجى المحاولة مرة أخرى.')
        }
        return
      }
      
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message || '', timestamp: new Date() }])
    } catch (err: any) {
      console.error('Chat error:', err)
      if (err.message?.includes('Failed to fetch') || err.message?.includes('404')) {
        setError('خدمة الدردشة غير متاحة حالياً. يرجى المحاولة لاحقاً.')
      } else {
        setError('حدث خطأ. جرّب لاحقاً.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed z-[9999] flex items-center justify-center rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 hover:shadow-xl active:scale-95 w-14 h-14 sm:w-12 sm:h-12 border border-primary-700/30 touch-manipulation transition-all duration-300 ${
          open ? 'sm:bottom-[26rem]' : ''
        }`}
        style={{ 
          bottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
          right: 'max(1rem, calc(env(safe-area-inset-right, 0px) + 1rem))',
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-label="فتح الدردشة"
        title="دردشة"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
      </button>

      {open && (
        <div
          className="fixed z-[9998] flex flex-col bg-white border border-gray-200 rounded-t-3xl shadow-2xl inset-x-0 bottom-0 top-0 sm:inset-auto sm:right-4 sm:left-auto sm:bottom-24 sm:top-auto sm:w-[22rem] sm:max-h-[28rem] sm:rounded-3xl chat-container"
          style={{ 
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
            height: '100dvh',
            maxHeight: '100dvh'
          }}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-3xl sm:rounded-t-3xl" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm block">دردشة دوموبات</span>
                <span className="text-xs text-primary-100">مساعدك الذكي</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل تريد حذف تاريخ المحادثة؟')) {
                      setMessages([])
                      clearSavedMessages()
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-white/20 transition-colors"
                  title="حذف المحادثة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div 
            ref={listRef} 
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 chat-messages-container"
          >
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl rounded-tl-md bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-200 px-5 py-5 space-y-4 text-right">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary-100">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-primary-900 text-base">مرحباً بك في دردشة دوموبات 👋</p>
                      <p className="text-xs text-primary-700 mt-0.5">مساعدك الذكي هنا لمساعدتك</p>
                    </div>
                  </div>
                  <p className="text-sm text-primary-800/90 leading-relaxed">
                    يمكنك أن تسألني عن أي شيء متعلق بـ:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-start gap-2 text-sm text-primary-800/90">
                      <span className="text-primary-600 mt-0.5">✓</span>
                      <span><strong>التسجيل والاستمارة</strong> — كيف تبدأ وكيف تملأ البيانات</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-primary-800/90">
                      <span className="text-primary-600 mt-0.5">✓</span>
                      <span><strong>المستندات</strong> — ما تحتاجه من وثائق</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-primary-800/90">
                      <span className="text-primary-600 mt-0.5">✓</span>
                      <span><strong>المشاريع</strong> — استعراض المشاريع المتاحة</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-primary-800/90">
                      <span className="text-primary-600 mt-0.5">✓</span>
                      <span><strong>المتابعة</strong> — حالة طلبك ومراحل المشروع</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-primary-800/90">
                      <span className="text-primary-600 mt-0.5">✓</span>
                      <span><strong>التمويل والأسعار</strong> — معلومات عن التكلفة والدفع</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Questions */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2 px-1">أسئلة سريعة:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => send(q)}
                        className="px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition-all text-right touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-md'
                      : 'bg-gray-100 text-gray-900 rounded-tl-md border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.timestamp && (
                    <p className={`text-xs mt-1.5 ${
                      m.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {(() => {
                        const timestamp = typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp
                        return timestamp instanceof Date ? timestamp.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : ''
                      })()}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end animate-in fade-in">
                <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-2xl rounded-tr-md flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">جاري التفكير...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
                {error}
                <button
                  onClick={() => {
                    setError(null)
                    if (messages.length > 0) {
                      send(messages[messages.length - 1].content)
                    }
                  }}
                  className="block mx-auto mt-2 text-xs underline"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}
          </div>
          <div 
            className="shrink-0 p-3 border-t border-gray-100 bg-gray-50/50"
            style={{ 
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)'
            }}
          >
            {messages.length > 0 && messages.length < 3 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-600 hover:text-primary-700 transition-all disabled:opacity-50 touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="اكتب سؤالك هنا..."
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                disabled={loading}
                style={{ 
                  fontSize: '16px', // Prevents zoom on iOS
                  WebkitAppearance: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:pointer-events-none shadow-sm transition-all"
                title="إرسال"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
