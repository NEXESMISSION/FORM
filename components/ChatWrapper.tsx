'use client'

import { ChatProvider } from '@/components/ChatContext'
import ChatWidget from '@/components/ChatWidget'
import ChatHeaderButton from '@/components/ChatHeaderButton'

/**
 * Fixed top-right chat trigger + panel. Renders a simple "دردشة" strip so the button is in the header area on every page.
 */
function ChatUI() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9996] flex justify-end pointer-events-none px-2 pt-2 sm:px-4 sm:pt-3" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
        <div className="pointer-events-auto">
          <ChatHeaderButton />
        </div>
      </div>
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
