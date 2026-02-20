'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useDebouncedValue, useLocalStorage } from '@/lib/hooks'
import { useChat } from '@/components/ChatContext'

type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: Date | string }

const QUICK_QUESTIONS = [
  'كيف أسجل في التطبيق؟',
  'ما هي المستندات المطلوبة؟',
  'كيف أعرف حالة طلبي؟',
  'ما هي أسعار المساكن؟',
  'كيف يتم التمويل؟',
]

export default function ChatWidget() {
  const { open, setOpen, closeChat } = useChat()
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
        const data = await res.json().catch(() => ({}))
        const errorMessage = data.error || 'فشل الإرسال. يرجى المحاولة مرة أخرى.'
        
        if (res.status === 404) {
          setError('خدمة الدردشة غير متاحة حالياً. يرجى المحاولة لاحقاً.')
        } else if (res.status === 503) {
          setError(errorMessage || 'خدمة الدردشة غير مفعّلة. يرجى التواصل مع الدعم الفني.')
        } else if (res.status === 429) {
          setError(errorMessage || 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.')
        } else if (res.status === 502) {
          setError(errorMessage || 'فشل الاتصال بخدمة الدردشة. تحقق من اتصال الإنترنت.')
        } else if (res.status === 500) {
          setError(errorMessage || 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.')
        } else {
          setError(errorMessage)
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
      {open && (
        <>
          {/* Backdrop: desktop only, clean dim */}
          <div
            className="fixed inset-0 z-[9997] bg-black/20 sm:block hidden"
            aria-hidden
            onClick={() => closeChat()}
          />

          <div
            className="fixed z-[9998] flex flex-col bg-white rounded-t-3xl shadow-xl inset-x-0 bottom-0 h-[100dvh] max-h-[100dvh] sm:inset-auto sm:right-6 sm:left-auto sm:bottom-6 sm:top-auto sm:h-[calc(100vh-3rem)] sm:max-h-[36rem] sm:min-h-[28rem] sm:w-[26rem] sm:rounded-2xl chat-container animate-in slide-up fade-in overflow-hidden border border-gray-200/80 sm:border-gray-200"
            style={{
              paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
              boxShadow: '0 20px 60px -15px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 text-white rounded-t-3xl sm:rounded-t-2xl relative overflow-hidden"
              style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), 0.875rem)',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                boxShadow: '0 1px 0 0 rgba(255,255,255,0.1) inset',
              }}
            >
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base block leading-tight">دردشة دوموبات</span>
                <span className="text-xs text-white/90 mt-0.5">مساعدك الذكي</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 relative z-10">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل تريد حذف تاريخ المحادثة؟')) {
                      setMessages([])
                      clearSavedMessages()
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
                  title="حذف المحادثة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                type="button" 
                onClick={() => closeChat()} 
                className="p-2 rounded-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0 chat-messages-container bg-gray-50/30 sm:bg-white border-t border-gray-100"
          >
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-blue-50/80 sm:bg-gray-50 border border-blue-100/80 sm:border-gray-200 px-4 sm:px-5 py-4 sm:py-5 text-right">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-500 text-white">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">مرحباً بك في دردشة دوموبات</p>
                      <p className="text-sm text-gray-600 mt-0.5">اسأل عن التسجيل، المستندات، المشاريع أو المتابعة.</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600 mb-3">أسئلة سريعة:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => send(q)}
                        className="px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 hover:text-blue-700 transition-colors text-right touch-manipulation font-medium"
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
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-md'
                      : 'bg-gray-100 text-gray-900 rounded-tl-md border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.timestamp && (
                    <p className={`text-xs mt-2 ${m.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
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
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-2 text-right max-w-[85%] sm:max-w-[80%]">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="text-sm">جاري التفكير...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 text-center">
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
            className="shrink-0 p-4 sm:p-5 border-t border-gray-200 bg-white"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
            }}
          >
            {messages.length > 0 && messages.length < 3 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_QUESTIONS.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 disabled:opacity-50 transition-colors"
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
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                className="p-3 rounded-xl text-white disabled:opacity-50 disabled:pointer-events-none bg-blue-600 hover:bg-blue-700 active:scale-95 transition-colors"
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
        </>
      )}
    </>
  )
}
