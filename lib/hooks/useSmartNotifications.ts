/**
 * Smart notification system with priority, grouping, and auto-dismiss
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface SmartNotification {
  id: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  group?: string
  timestamp: Date
}

class NotificationManager {
  private notifications: SmartNotification[] = []
  private subscribers: Set<(notifications: SmartNotification[]) => void> = new Set()
  private groups: Map<string, SmartNotification[]> = new Map()

  add(notification: SmartNotification): void {
    // Group notifications if group specified
    if (notification.group) {
      const groupNotifications = this.groups.get(notification.group) || []
      groupNotifications.push(notification)
      this.groups.set(notification.group, groupNotifications)
      
      // Show grouped notification
      if (groupNotifications.length === 1) {
        this.showToast(notification)
      } else {
        // Update grouped notification
        toast.dismiss()
        this.showToast({
          ...notification,
          message: `${groupNotifications.length} إشعارات جديدة`,
        })
      }
    } else {
      this.showToast(notification)
    }

    this.notifications.push(notification)
    this.notifySubscribers()

    // Auto-remove based on priority
    const duration = notification.duration || this.getDefaultDuration(notification.priority)
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification.id)
      }, duration)
    }
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    
    // Clean up groups
    for (const [group, notifications] of this.groups.entries()) {
      const filtered = notifications.filter((n) => n.id !== id)
      if (filtered.length === 0) {
        this.groups.delete(group)
      } else {
        this.groups.set(group, filtered)
      }
    }

    this.notifySubscribers()
  }

  clear(): void {
    this.notifications = []
    this.groups.clear()
    toast.dismiss()
    this.notifySubscribers()
  }

  clearGroup(group: string): void {
    const groupNotifications = this.groups.get(group) || []
    groupNotifications.forEach((n) => {
      this.remove(n.id)
    })
  }

  subscribe(callback: (notifications: SmartNotification[]) => void): () => void {
    this.subscribers.add(callback)
    callback([...this.notifications])

    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb([...this.notifications]))
  }

  private showToast(notification: SmartNotification): void {
    const duration = notification.duration || this.getDefaultDuration(notification.priority)
    
    const toastOptions: any = {
      duration,
      position: 'top-center',
    }

    // Add action button if provided
    if (notification.action) {
      toastOptions.action = {
        label: notification.action.label,
        onClick: notification.action.onClick,
      }
    }

    switch (notification.type) {
      case 'success':
        toast.success(notification.message, toastOptions)
        break
      case 'error':
        toast.error(notification.message, toastOptions)
        break
      case 'warning':
        toast(notification.message, {
          ...toastOptions,
          icon: '⚠️',
        })
        break
      default:
        toast(notification.message, toastOptions)
    }
  }

  private getDefaultDuration(priority: NotificationPriority): number {
    switch (priority) {
      case 'critical':
        return 0 // Don't auto-dismiss
      case 'high':
        return 6000
      case 'normal':
        return 4000
      case 'low':
        return 2000
    }
  }

  getNotifications(): SmartNotification[] {
    return [...this.notifications]
  }

  getGroupNotifications(group: string): SmartNotification[] {
    return [...(this.groups.get(group) || [])]
  }
}

const notificationManager = new NotificationManager()

export function useSmartNotifications() {
  const [notifications, setNotifications] = useState<SmartNotification[]>([])

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications)
    return unsubscribe
  }, [])

  const notify = useCallback(
    (
      message: string,
      type: NotificationType = 'info',
      options: {
        priority?: NotificationPriority
        duration?: number
        action?: { label: string; onClick: () => void }
        group?: string
      } = {}
    ) => {
      const notification: SmartNotification = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message,
        type,
        priority: options.priority || 'normal',
        duration: options.duration,
        action: options.action,
        group: options.group,
        timestamp: new Date(),
      }

      notificationManager.add(notification)
    },
    []
  )

  const remove = useCallback((id: string) => {
    notificationManager.remove(id)
  }, [])

  const clear = useCallback(() => {
    notificationManager.clear()
  }, [])

  const clearGroup = useCallback((group: string) => {
    notificationManager.clearGroup(group)
  }, [])

  return {
    notifications,
    notify,
    remove,
    clear,
    clearGroup,
  }
}
