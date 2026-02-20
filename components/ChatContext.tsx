'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ChatContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  openChat: () => void
  closeChat: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openChat = useCallback(() => setOpen(true), [])
  const closeChat = useCallback(() => setOpen(false), [])
  return (
    <ChatContext.Provider value={{ open, setOpen, openChat, closeChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
      openChat: () => {},
      closeChat: () => {},
    }
  }
  return ctx
}
