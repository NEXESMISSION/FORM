/**
 * WinSMS.tn API client – aligned with official documentation.
 * Endpoints: send-sms (Plain/Unicode auto), check-balance, verifSms.
 * Do not hardcode API keys; use environment variables only.
 */

const WINSMS_BASE = 'https://www.winsmspro.com/sms/sms/api'

export type WinSMSSendResult =
  | { ok: true; ref?: string; message?: string; raw?: Record<string, unknown> }
  | { ok: false; error: string }

export type WinSMSBalanceResult =
  | { ok: true; balance: number; raw?: unknown }
  | { ok: false; error: string }

export type WinSMSStatusResult =
  | { ok: true; status: string; raw?: unknown }
  | { ok: false; error: string }

function getConfig() {
  const apiKey = process.env.WINSMS_API_KEY
  const senderId = process.env.WINSMS_SENDER_ID || 'Domobat'
  if (!apiKey) throw new Error('WINSMS_API_KEY is not set')
  return { apiKey, senderId }
}

/**
 * Normalize Tunisian phone to digits only for WinSMS (e.g. 216XXXXXXXX).
 */
export function phoneToWinSMS(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Send one SMS. Plain/Unicode is detected automatically by the API.
 * Optional: add unicode=1 to force Unicode (e.g. for Arabic).
 * @see https://www.winsms.tn (SMS Api – send-sms)
 */
export async function sendSms(params: {
  to: string
  sms: string
  from?: string
  unicode?: boolean
}): Promise<WinSMSSendResult> {
  const { apiKey, senderId } = getConfig()
  const to = phoneToWinSMS(params.to)
  const from = params.from ?? senderId
  const searchParams = new URLSearchParams({
    action: 'send-sms',
    api_key: apiKey,
    to,
    from,
    sms: params.sms,
    response: 'json',
  })
  if (params.unicode === true) {
    searchParams.set('unicode', '1')
  }
  const url = `${WINSMS_BASE}?${searchParams.toString()}`
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    // API may return plain text (e.g. "OK" or error message)
    if (!res.ok) {
      return { ok: false, error: text || `HTTP ${res.status}` }
    }
    if (text.toUpperCase().includes('OK') || res.status === 200) {
      return { ok: true, message: text }
    }
    return { ok: false, error: text }
  }
  if (!res.ok) {
    const err =
      (data.error as string) ||
      (data.message as string) ||
      (data.msg as string) ||
      text ||
      `HTTP ${res.status}`
    return { ok: false, error: String(err) }
  }
  const ref = data.ref ?? data.reference ?? data.messageId
  return { ok: true, ref: ref != null ? String(ref) : undefined, raw: data }
}

/**
 * Check SMS balance. Rate limit: 1 call per 30 seconds.
 * @see https://www.winsmspro.com/sms/sms/api?action=check-balance&api_key=...&response=json
 */
export async function checkBalance(): Promise<WinSMSBalanceResult> {
  const { apiKey } = getConfig()
  const url = `${WINSMS_BASE}?action=check-balance&api_key=${encodeURIComponent(apiKey)}&response=json`
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    if (!res.ok) return { ok: false, error: text || `HTTP ${res.status}` }
    return { ok: false, error: text || 'Invalid response' }
  }
  if (!res.ok) {
    const err = (data.error as string) || (data.message as string) || text
    return { ok: false, error: String(err) }
  }
  const balance = Number(data.balance ?? data.solde ?? data.credits ?? 0)
  if (Number.isNaN(balance) && typeof data.balance === 'undefined' && typeof data.solde === 'undefined') {
    return { ok: false, error: 'Balance not found in response' }
  }
  return { ok: true, balance: Number.isNaN(balance) ? 0 : balance, raw: data }
}

/**
 * Get SMS delivery status by reference. Rate limit: 1 call per 30 seconds.
 * @see https://www.winsmspro.com/sms/sms/api/verifSms?api_key=...&ref=REFERENCE_SMS
 */
export async function getSmsStatus(ref: string): Promise<WinSMSStatusResult> {
  const { apiKey } = getConfig()
  const url = `https://www.winsmspro.com/sms/sms/api/verifSms?api_key=${encodeURIComponent(apiKey)}&ref=${encodeURIComponent(ref)}`
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    if (!res.ok) return { ok: false, error: text || `HTTP ${res.status}` }
    return { ok: true, status: text, raw: undefined }
  }
  if (!res.ok) {
    const err = (data.error as string) || (data.message as string) || text
    return { ok: false, error: String(err) }
  }
  const status = (data.status ?? data.state ?? data.etat ?? text) as string
  return { ok: true, status: String(status), raw: data }
}
