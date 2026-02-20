'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { useDebouncedValue, useLocalStorage } from '@/lib/hooks'

type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp?: Date | string }

const FAB_SIZE = 56 // 3.5rem
const DEFAULT_POS = { left: 20, bottom: 120 }
const STORAGE_KEY = 'chat-fab-position'

function clampPos(left: number, bottom: number) {
  return {
    left: Math.max(0, Math.min(left, typeof window !== 'undefined' ? window.innerWidth - FAB_SIZE : 320)),
    bottom: Math.max(0, Math.min(bottom, typeof window !== 'undefined' ? window.innerHeight - FAB_SIZE : 400)),
  }
}

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
  const [fabPos, setFabPos] = useLocalStorage<{ left: number; bottom: number }>(STORAGE_KEY, DEFAULT_POS)
  const [mounted, setMounted] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Use default position until after mount to avoid server/client hydration mismatch (localStorage differs on client)
  useEffect(() => setMounted(true), [])
  const fabPosition = mounted ? fabPos : DEFAULT_POS
  const dragStartRef = useRef<{ x: number; y: number; left: number; bottom: number } | null>(null)
  const movedRef = useRef(false)

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

  // Drag handlers for FAB — move/up on button so they fire with setPointerCapture
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    movedRef.current = false
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: fabPosition.left,
      bottom: fabPosition.bottom,
    }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [fabPosition.left, fabPosition.bottom])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true
    const next = clampPos(
      dragStartRef.current.left + dx,
      dragStartRef.current.bottom - dy
    )
    setFabPos(next)
  }, [setFabPos])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    setDragging(false)
    dragStartRef.current = null
  }, [])

  const handleFabClick = useCallback((e: React.MouseEvent) => {
    if (movedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    setOpen((o) => !o)
  }, [])

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
      <button
        type="button"
        suppressHydrationWarning
        onClick={handleFabClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`fixed z-[9999] flex items-center justify-center rounded-full text-white shadow-2xl hover:shadow-3xl select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab active:scale-95 transition-transform duration-200'
        }`}
        style={{
          left: fabPosition.left,
          bottom: fabPosition.bottom,
          width: FAB_SIZE,
          height: FAB_SIZE,
          touchAction: 'none',
          transition: dragging ? 'none' : 'box-shadow 0.2s, background 0.2s',
          WebkitTapHighlightColor: 'transparent',
          background: open
            ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)'
            : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          boxShadow: open
            ? '0 10px 30px -5px rgba(30, 64, 175, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 8px 25px -5px rgba(30, 64, 175, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        aria-label={open ? 'إغلاق الدردشة' : 'فتح الدردشة'}
        title={open ? 'إغلاق' : 'دردشة'}
        onMouseEnter={(e) => {
          if (!open && !dragging) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
            e.currentTarget.style.transform = 'scale(1)'
          }
        }}
      >
        {open ? (
          <X className="w-6 h-6 shrink-0 transition-transform duration-300 pointer-events-none" />
        ) : (
          <MessageSquare className="w-6 h-6 shrink-0 transition-transform duration-300 group-hover:scale-110 pointer-events-none" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse pointer-events-none" />
        )}
      </button>

      {open && (
        <div
          className="fixed z-[9998] flex flex-col bg-white rounded-t-3xl shadow-2xl inset-x-0 bottom-0 top-0 sm:inset-auto sm:right-4 sm:left-auto sm:bottom-24 sm:top-auto sm:w-[24rem] sm:max-h-[32rem] sm:rounded-3xl chat-container animate-in slide-up fade-in"
          style={{ 
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
            height: '100dvh',
            maxHeight: '100dvh',
            border: '1px solid rgba(30, 64, 175, 0.1)',
            boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(30, 64, 175, 0.05)'
          }}
        >
          <div 
            className="shrink-0 flex items-center justify-between px-5 py-4 text-white rounded-t-3xl sm:rounded-t-3xl relative overflow-hidden" 
            style={{ 
              paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
              boxShadow: '0 4px 20px -5px rgba(30, 64, 175, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <Sparkles className="w-5 h-5 animate-pulse" />
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
                onClick={() => setOpen(false)} 
                className="p-2 rounded-xl hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              >
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
                <div className="rounded-3xl rounded-tl-md bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 px-6 py-6 space-y-5 text-right shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">مرحباً بك في دردشة دوموبات 👋</p>
                      <p className="text-sm text-gray-600 mt-1">مساعدك الذكي هنا لمساعدتك</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    يمكنك أن تسألني عن أي شيء متعلق بـ:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-white/60 rounded-xl px-3 py-2.5 border border-blue-100">
                      <span className="text-blue-600 mt-0.5 font-bold text-base">✓</span>
                      <span><strong className="text-gray-900">التسجيل والاستمارة</strong> — كيف تبدأ وكيف تملأ البيانات</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-white/60 rounded-xl px-3 py-2.5 border border-blue-100">
                      <span className="text-blue-600 mt-0.5 font-bold text-base">✓</span>
                      <span><strong className="text-gray-900">المستندات</strong> — ما تحتاجه من وثائق</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-white/60 rounded-xl px-3 py-2.5 border border-blue-100">
                      <span className="text-blue-600 mt-0.5 font-bold text-base">✓</span>
                      <span><strong className="text-gray-900">المشاريع</strong> — استعراض المشاريع المتاحة</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-white/60 rounded-xl px-3 py-2.5 border border-blue-100">
                      <span className="text-blue-600 mt-0.5 font-bold text-base">✓</span>
                      <span><strong className="text-gray-900">المتابعة</strong> — حالة طلبك ومراحل المشروع</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-white/60 rounded-xl px-3 py-2.5 border border-blue-100">
                      <span className="text-blue-600 mt-0.5 font-bold text-base">✓</span>
                      <span><strong className="text-gray-900">التمويل والأسعار</strong> — معلومات عن التكلفة والدفع</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Questions */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3 px-1">أسئلة سريعة:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => send(q)}
                        className="px-4 py-2.5 text-xs rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all text-right touch-manipulation shadow-sm hover:shadow-md font-medium"
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
                  className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-md shadow-lg shadow-blue-500/30'
                      : 'bg-gradient-to-br from-gray-50 to-white text-gray-900 rounded-tl-md border border-gray-200/80 shadow-sm'
                  }`}
                  style={m.role === 'user' ? {
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.3)'
                  } : {}}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.timestamp && (
                    <p className={`text-xs mt-2 ${
                      m.role === 'user' ? 'text-blue-100' : 'text-gray-500'
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
              <div className="flex justify-start animate-in fade-in">
                <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-2xl rounded-tr-md flex items-center gap-2 shadow-sm text-right max-w-[85%] sm:max-w-[75%]">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
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
            className="shrink-0 p-4 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50/50"
            style={{ 
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)'
            }}
          >
            {messages.length > 0 && messages.length < 3 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_QUESTIONS.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs rounded-xl bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-all disabled:opacity-50 touch-manipulation shadow-sm hover:shadow-md"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
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
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
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
                className="p-3 rounded-2xl text-white disabled:opacity-50 disabled:pointer-events-none shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                style={{
                  background: loading || !input.trim() 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                    : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  boxShadow: loading || !input.trim() 
                    ? '0 4px 12px -2px rgba(156, 163, 175, 0.3)'
                    : '0 4px 16px -4px rgba(37, 99, 235, 0.4)'
                }}
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
