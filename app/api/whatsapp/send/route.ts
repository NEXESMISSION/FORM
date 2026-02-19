import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security/authentication'
import { sendWhatsAppMessage, sendDocumentRejectionWhatsApp, sendDocumentRequestWhatsApp } from '@/lib/utils/whatsapp'

/**
 * Send WhatsApp message (admin only)
 */
export const POST = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { phone, message, type, documentName, reason, requestedDocuments, customMessage, userName, applicationId } = body

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    let result

    if (type === 'document_rejection' && documentName) {
      result = await sendDocumentRejectionWhatsApp(phone, documentName, reason || '')
    } else if (type === 'document_request' && requestedDocuments && Array.isArray(requestedDocuments)) {
      result = await sendDocumentRequestWhatsApp(phone, requestedDocuments, customMessage)
    } else if (type === 'application_rejected') {
      const rejectionMessage = `مرحباً ${userName || 'المستخدم'}،\n\nنأسف لإبلاغك بأن طلب السكن الخاص بك (رقم: ${applicationId?.substring(0, 8) || '—'}) قد تم رفضه.\n\nيمكنك مراجعة تفاصيل الطلب من خلال تطبيق دوموبات.\n\nشكراً لاهتمامك.`
      result = await sendWhatsAppMessage(phone, rejectionMessage)
    } else if (type === 'application_approved') {
      const approvalMessage = `🎉 تهانينا ${userName || 'المستخدم'}!\n\nتم قبول طلب السكن الخاص بك (رقم: ${applicationId?.substring(0, 8) || '—'}).\n\nيمكنك الآن متابعة تقدم مشروعك من خلال تطبيق دوموبات.\n\nنتمنى لك حظاً موفقاً! 🏠`
      result = await sendWhatsAppMessage(phone, approvalMessage)
    } else if (message) {
      result = await sendWhatsAppMessage(phone, message)
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide message or type with required fields' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send WhatsApp message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      messageId: result.messageId,
    })
  } catch (error: any) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    )
  }
})
