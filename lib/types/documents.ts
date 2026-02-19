/**
 * Type definitions for document-related data structures
 */

export type DocumentStatus = 'pending_review' | 'accepted' | 'rejected' | null | undefined

export interface ApplicantDocument {
  id?: string
  docType: string
  status?: DocumentStatus
  rejectionReason?: string | null
  fileUrl?: string
  fileName?: string
  uploadedAt?: string
  [key: string]: unknown
}

export interface DocumentSlot {
  label: string
  isExtra?: boolean
}

export interface DocumentSlotStatus {
  slot: DocumentSlot
  documents: ApplicantDocument[]
  hasAccepted: boolean
  hasPendingReview: boolean
  hasRejected: boolean
  allRejected: boolean
  isEmpty: boolean
}

export interface AlertInfo {
  type: 'missing' | 'rejected' | 'rejected_info' | 'admin_request'
  severity: 'critical' | 'warning' | 'info'
  slots: DocumentSlot[]
  message?: string
  appId: string
}

export interface AdminMessageInfo {
  hasContent: boolean
  isJustDocList: boolean
  formattedMessage: string
  rawMessage: string | null
}
