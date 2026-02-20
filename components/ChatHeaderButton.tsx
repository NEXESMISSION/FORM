'use client'

import { useChat } from '@/components/ChatContext'
import { MessageSquare } from 'lucide-react'

/**
 * Simple header chat button. Renders in the top-right; opens the chat panel when clicked.
 * Use inside ChatProvider.
 */
export default function ChatHeaderButton() {
  const { openChat } = useChat()
  return (
    <button
      type="button"
      onClick={openChat}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary-700 transition-colors"
      aria-label="فتح الدردشة"
      title="دردشة"
    >
      <MessageSquare className="w-4 h-4 shrink-0" />
      <span>دردشة</span>
    </button>
  )
}
