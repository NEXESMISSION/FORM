/**
 * Utility functions for document status checking and alert logic
 * Centralized, robust, and maintainable
 */

import type { ApplicantDocument, DocumentSlot, DocumentSlotStatus, AlertInfo, AdminMessageInfo } from '@/lib/types/documents'

/**
 * Get all documents for a specific slot label from an application's documents array
 */
export function getDocsForSlot(
  documents: ApplicantDocument[] | null | undefined,
  slotLabel: string
): ApplicantDocument[] {
  if (!documents || !Array.isArray(documents)) return []
  return documents.filter((d) => (d.docType || '').trim() === slotLabel.trim())
}

/**
 * Get a single document for a slot (prioritizes: rejected > accepted > pending > first)
 */
export function getDocForSlot(
  documents: ApplicantDocument[] | null | undefined,
  slotLabel: string
): ApplicantDocument | null {
  const docs = getDocsForSlot(documents, slotLabel)
  if (docs.length === 0) return null
  
  // Priority: rejected > accepted > pending > first
  const rejected = docs.find((d) => d.status === 'rejected')
  if (rejected) return rejected
  
  const accepted = docs.find((d) => d.status === 'accepted')
  if (accepted) return accepted
  
  const pending = docs.find((d) => !d.status || d.status === 'pending_review')
  if (pending) return pending
  
  return docs[0] || null
}

/**
 * Calculate comprehensive status for a document slot
 */
export function getSlotStatus(
  documents: ApplicantDocument[] | null | undefined,
  slot: DocumentSlot
): DocumentSlotStatus {
  const docs = getDocsForSlot(documents, slot.label)
  
  const hasAccepted = docs.some((d) => d.status === 'accepted')
  const hasPendingReview = docs.some((d) => !d.status || d.status === 'pending_review')
  const hasRejected = docs.some((d) => d.status === 'rejected')
  const allRejected = docs.length > 0 && docs.every((d) => d.status === 'rejected')
  const isEmpty = docs.length === 0
  
  return {
    slot,
    documents: docs,
    hasAccepted,
    hasPendingReview,
    hasRejected,
    allRejected,
    isEmpty,
  }
}

/**
 * Extract document slots from required doc types and admin message
 */
export function getDocumentSlots(
  requiredDocTypes: Array<{ id: string; label_ar: string }>,
  adminMessage: string | null | undefined
): DocumentSlot[] {
  const slots: DocumentSlot[] = (requiredDocTypes || []).map((d) => ({ label: d.label_ar }))
  
  if (!adminMessage) return slots
  
  const lines = adminMessage.split(/\n/).map((s) => s.trim()).filter(Boolean)
  let afterHeader = false
  
  for (const line of lines) {
    if (line.startsWith('المطلوب') || line === 'المطلوب:') {
      afterHeader = true
      continue
    }
    if (afterHeader && (line.startsWith('•') || line.startsWith('-'))) {
      const label = line.replace(/^[•\-]\s*/, '').trim()
      if (label && !slots.some((s) => s.label === label)) {
        slots.push({ label, isExtra: true })
      }
    }
  }
  
  return slots
}

/**
 * Check if admin message is just a document list (not meaningful content)
 */
export function isJustDocList(message: string | null | undefined): boolean {
  if (!message) return false
  
  const trimmed = message.trim()
  if (trimmed.length < 10) return false
  
  // Check if message is just "المطلوب:" followed by bullet points
  const lines = trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean)
  if (lines.length === 0) return false
  
  const firstLine = lines[0]
  if (!firstLine.startsWith('المطلوب')) return false
  
  // If all remaining lines are bullet points, it's just a doc list
  const remainingLines = lines.slice(1)
  if (remainingLines.length === 0) return true
  
  return remainingLines.every((line) => line.startsWith('•') || line.startsWith('-'))
}

/**
 * Parse and format admin message
 */
export function parseAdminMessage(message: string | null | undefined): AdminMessageInfo {
  if (!message) {
    return {
      hasContent: false,
      isJustDocList: false,
      formattedMessage: '',
      rawMessage: null,
    }
  }
  
  const trimmed = message.trim()
  
  // Filter out generic messages
  const genericMessages = ['good', 'ok', 'تم', 'done']
  if (trimmed.length < 10 || genericMessages.includes(trimmed.toLowerCase())) {
    return {
      hasContent: false,
      isJustDocList: false,
      formattedMessage: '',
      rawMessage: trimmed,
    }
  }
  
  const isJustDocListMsg = isJustDocList(trimmed)
  
  // Format message: convert bullet points to list items, remove "المطلوب:" header
  let formatted = trimmed
  const lines = formatted.split(/\n/)
  if (lines[0]?.startsWith('المطلوب')) {
    formatted = lines.slice(1).join('\n').trim()
  }
  
  // Convert bullet points to formatted list
  formatted = formatted
    .split(/\n/)
    .map((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        return trimmedLine.replace(/^[•\-]\s*/, '• ')
      }
      return trimmedLine
    })
    .filter(Boolean)
    .join('\n')
  
  return {
    hasContent: true,
    isJustDocList: isJustDocListMsg,
    formattedMessage: formatted,
    rawMessage: trimmed,
  }
}

/**
 * Calculate alert information for an application
 */
export function calculateAlerts(
  documents: ApplicantDocument[] | null | undefined,
  slots: DocumentSlot[],
  adminMessage: string | null | undefined,
  appStatus: string,
  appId: string
): AlertInfo[] {
  const alerts: AlertInfo[] = []
  const adminMessageInfo = parseAdminMessage(adminMessage)
  
  // Calculate slot statuses
  const slotStatuses = slots.map((slot) => getSlotStatus(documents, slot))
  
  // Missing documents
  const missingSlots = slotStatuses.filter((status) => status.isEmpty).map((s) => s.slot)
  if (missingSlots.length > 0) {
    alerts.push({
      type: 'missing',
      severity: 'warning',
      slots: missingSlots,
      appId,
    })
  }
  
  // Rejected documents (all rejected, needs replacement)
  const rejectedSlots = slotStatuses
    .filter((status) => status.allRejected && !status.isEmpty)
    .map((s) => s.slot)
  if (rejectedSlots.length > 0) {
    alerts.push({
      type: 'rejected',
      severity: 'critical',
      slots: rejectedSlots,
      appId,
    })
  }
  
  // Informational: slots with rejected docs but also accepted ones
  const slotsWithRejectedButAccepted = slotStatuses
    .filter((status) => status.hasRejected && status.hasAccepted)
    .map((s) => s.slot)
  if (slotsWithRejectedButAccepted.length > 0) {
    alerts.push({
      type: 'rejected_info',
      severity: 'info',
      slots: slotsWithRejectedButAccepted,
      appId,
    })
  }
  
  // Admin request (meaningful message, not just doc list)
  if (
    adminMessageInfo.hasContent &&
    !adminMessageInfo.isJustDocList &&
    appStatus !== 'approved'
  ) {
    alerts.push({
      type: 'admin_request',
      severity: 'info',
      slots: [],
      message: adminMessageInfo.formattedMessage,
      appId,
    })
  }
  
  return alerts
}

/**
 * Check if any document action is needed for an application
 */
export function needsDocumentAction(
  documents: ApplicantDocument[] | null | undefined,
  slots: DocumentSlot[],
  adminMessage: string | null | undefined,
  appStatus: string
): boolean {
  const alerts = calculateAlerts(documents, slots, adminMessage, appStatus, '')
  // Filter out informational alerts - only critical/warning need action
  return alerts.some((alert) => alert.severity === 'critical' || alert.severity === 'warning')
}

/**
 * Get alert color classes based on alert type and severity
 */
export function getAlertColors(alert: AlertInfo): {
  border: string
  bg: string
  text: string
  icon: string
} {
  if (alert.type === 'rejected' && alert.severity === 'critical') {
    return {
      border: 'border-red-300',
      bg: 'bg-red-50',
      text: 'text-red-900',
      icon: 'text-red-600',
    }
  }
  
  if (alert.type === 'missing' || (alert.type === 'rejected_info' && alert.severity === 'warning')) {
    return {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      icon: 'text-amber-600',
    }
  }
  
  if (alert.type === 'admin_request' || alert.type === 'rejected_info') {
    return {
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      icon: 'text-blue-600',
    }
  }
  
  // Default
  return {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    icon: 'text-gray-600',
  }
}

/**
 * Get slot color classes based on document status
 */
export function getSlotColors(status: DocumentSlotStatus): string {
  const { hasAccepted, hasPendingReview, allRejected, isEmpty, slot } = status
  
  if (hasAccepted) {
    return 'border-green-300 bg-green-50/60'
  }
  
  if (hasPendingReview && !hasAccepted) {
    if (slot.isExtra) {
      return 'border-indigo-300 bg-indigo-50/60'
    }
    return 'border-blue-300 bg-blue-50/60'
  }
  
  if (allRejected && !hasPendingReview) {
    return 'border-red-300 bg-red-50/60'
  }
  
  if (slot.isExtra) {
    return 'border-purple-300 bg-purple-50/70'
  }
  
  return 'border-gray-100 bg-gray-50/50'
}
