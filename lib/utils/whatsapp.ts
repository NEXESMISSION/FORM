/**
 * WhatsApp messaging utility using Infobip API
 */

const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY

/**
 * Format phone number for WhatsApp (must be in international format)
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')
  
  // Normalize to +216 format
  if (cleaned.startsWith('0')) {
    cleaned = '+216' + cleaned.substring(1)
  } else if (cleaned.startsWith('216')) {
    cleaned = '+' + cleaned
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+216' + cleaned
  }

  // Validate format
  const phoneRegex = /^\+216[0-9]{8}$/
  if (!phoneRegex.test(cleaned)) {
    return null
  }

  return cleaned
}

/**
 * Send WhatsApp message via Infobip
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!INFOBIP_BASE_URL || !INFOBIP_API_KEY) {
    return {
      success: false,
      error: 'WhatsApp service not configured. Missing INFOBIP_BASE_URL or INFOBIP_API_KEY',
    }
  }

  const formattedPhone = formatPhoneForWhatsApp(phone)
  if (!formattedPhone) {
    return {
      success: false,
      error: 'Invalid phone number format',
    }
  }

  try {
    // Infobip WhatsApp API endpoint - use the same base URL as SMS
    const url = `https://${INFOBIP_BASE_URL}/whatsapp/1/message/text`
    
    // Get WhatsApp number from env or use default Infobip test number
    // User should configure their WhatsApp Business number in Infobip portal
    const whatsappNumber = process.env.INFOBIP_WHATSAPP_NUMBER || process.env.INFOBIP_SENDER_ID || '447860099299'
    
    const requestBody = {
      messages: [
        {
          from: whatsappNumber,
          to: formattedPhone,
          content: {
            text: message,
          },
        },
      ],
    }

    console.log('Sending WhatsApp via Infobip:', {
      url,
      phone: formattedPhone,
      messageLength: message.length,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        console.error('Infobip WhatsApp error response (not JSON):', errorText)
      }

      console.error('Infobip WhatsApp API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorText,
      })

      return {
        success: false,
        error: errorData.requestError?.serviceException?.text || errorData.description || errorText || 'Failed to send WhatsApp message',
      }
    }

    const responseData = await response.json()
    const messageId = responseData.messages?.[0]?.messageId

    console.log('WhatsApp sent successfully via Infobip:', messageId)

    return {
      success: true,
      messageId,
    }
  } catch (error: any) {
    console.error('WhatsApp sending error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    }
  }
}

/**
 * Send WhatsApp notification for document rejection
 */
export async function sendDocumentRejectionWhatsApp(
  phone: string,
  documentName: string,
  reason: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const message = `🔔 إشعار من دوموبات

تم رفض المستند التالي:
📄 ${documentName}

${reason ? `سبب الرفض:\n${reason}` : 'يرجى رفع نسخة محدثة من المستند'}

يرجى تسجيل الدخول إلى حسابك وتحديث المستند.

شكراً لتفهمكم.`

  return sendWhatsAppMessage(phone, message)
}

/**
 * Send WhatsApp notification for document request
 */
export async function sendDocumentRequestWhatsApp(
  phone: string,
  requestedDocuments: string[],
  customMessage?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  let message = `🔔 إشعار من دوموبات

نحتاج منك رفع المستندات التالية:\n\n`

  requestedDocuments.forEach((doc, index) => {
    message += `${index + 1}. ${doc}\n`
  })

  if (customMessage) {
    message += `\n${customMessage}\n`
  }

  message += `\nيرجى تسجيل الدخول إلى حسابك ورفع المستندات المطلوبة.

شكراً لتعاونكم.`

  return sendWhatsAppMessage(phone, message)
}
