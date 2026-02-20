import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

/**
 * POST /api/transcribe
 * Body: JSON { url: string } (public audio URL) or FormData with field "file" (audio file)
 * Returns: { text: string } (transcription from OpenAI Whisper)
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Transcription غير مفعّل. أضف OPENAI_API_KEY في .env.local' },
      { status: 503 }
    )
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    let audioBuffer: Buffer
    let filename = 'audio.webm'

    if (contentType.includes('application/json')) {
      const body = await request.json()
      const url = body?.url
      if (!url || typeof url !== 'string') {
        return NextResponse.json(
          { error: 'مطلوب حقل url (رابط صوتي عام)' },
          { status: 400 }
        )
      }
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) {
        return NextResponse.json(
          { error: 'فشل جلب الملف الصوتي من الرابط' },
          { status: 400 }
        )
      }
      const arrayBuffer = await res.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
      const ext = url.split('.').pop()?.split('?')[0] || 'webm'
      filename = `audio.${ext}`
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') ?? formData.get('audio')
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: 'مطلوب حقل file أو audio (ملف صوتي)' },
          { status: 400 }
        )
      }
      const arrayBuffer = await file.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
      filename = file.name || 'audio.webm'
    } else {
      return NextResponse.json(
        { error: 'أرسل JSON { url: "..." } أو FormData مع ملف صوتي' },
        { status: 400 }
      )
    }

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { error: 'الملف الصوتي فارغ. سجّل لمدة ثانية على الأقل ثم أعد المحاولة.' },
        { status: 400 }
      )
    }
    if (audioBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز 25 ميجا. قلّل مدة التسجيل.' },
        { status: 400 }
      )
    }

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audioBuffer)]), filename)
    form.append('model', 'whisper-1')
    form.append('response_format', 'text')

    const whisperRes = await fetch(OPENAI_WHISPER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      console.error('Whisper API error:', whisperRes.status, errText)
      return NextResponse.json(
        { error: 'فشل التحويل إلى نص: ' + (errText || whisperRes.statusText) },
        { status: 502 }
      )
    }

    const text = await whisperRes.text()
    return NextResponse.json({ text: (text || '').trim() })
  } catch (error: unknown) {
    console.error('Transcribe error:', error)
    const message = error instanceof Error ? error.message : 'خطأ غير متوقع'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
