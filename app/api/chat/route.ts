import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering and use Node.js runtime
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Chat API is running',
    hasApiKey: !!process.env.OPENAI_API_KEY 
  })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chat غير مفعّل. أضف OPENAI_API_KEY في .env.local' },
        { status: 503 }
      )
    }

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'طلب غير صالح. تحقق من تنسيق البيانات.' },
        { status: 400 }
      )
    }

    const rawMessages: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : []
    
    if (rawMessages.length === 0) {
      return NextResponse.json({ error: 'مطلوب حقل messages' }, { status: 400 })
    }

    // Import dependencies dynamically to avoid loading issues
    let apiRateLimit: ((req: Request) => Promise<any>) | null = null
    let sanitizeInput: ((input: string) => string) | null = null
    let detectIntent: ((message: string) => any) | null = null

    try {
      const rateLimitModule = await import('@/lib/security/rateLimiting')
      apiRateLimit = rateLimitModule.apiRateLimit
    } catch (e) {
      console.error('Failed to load rateLimiting:', e)
    }

    try {
      const sanitizationModule = await import('@/lib/security/sanitization')
      sanitizeInput = sanitizationModule.sanitizeInput
    } catch (e) {
      console.error('Failed to load sanitization:', e)
    }

    try {
      const chatContextModule = await import('@/lib/utils/chatContext')
      detectIntent = chatContextModule.detectIntent
    } catch (e) {
      console.error('Failed to load chatContext:', e)
    }

    // Fallback sanitization function
    function basicSanitize(input: string): string {
      if (typeof input !== 'string') {
        return String(input || '')
      }
      return input
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/\0/g, '')
        .trim()
        .substring(0, 2000)
    }

    // Check rate limit with fallback
    let rateLimitResult = { allowed: true, remaining: 60, resetTime: Date.now() + 60000, retryAfter: 60 }
    if (apiRateLimit) {
      try {
        rateLimitResult = await apiRateLimit(request as unknown as Request)
      } catch (rateLimitError: any) {
        console.error('Rate limit check failed:', rateLimitError)
      }
    }
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining || 0),
          }
        }
      )
    }

    // Limit message history and sanitize
    const sanitizeFn = sanitizeInput || basicSanitize
    const messages = rawMessages
      .slice(-15)
      .map((m: { role: string; content: string }) => {
        const role = m.role === 'assistant' ? 'assistant' : 'user'
        let content = ''
        try {
          const rawContent = m.content || ''
          content = sanitizeFn(rawContent)
        } catch (sanitizeError) {
          console.error('Sanitize error:', sanitizeError)
          content = basicSanitize(m.content || '')
        }
        return { role, content }
      })
      .filter((m: { role: string; content: string }) => m.content && m.content.length > 0)

    if (messages.length === 0) {
      return NextResponse.json({ error: 'لا توجد رسائل صالحة' }, { status: 400 })
    }

    // Detect intent with fallback
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || ''
    let intent = null
    if (detectIntent) {
      try {
        intent = detectIntent(lastUserMessage)
      } catch (intentError) {
        console.error('Intent detection failed:', intentError)
      }
    }
    
    const SYSTEM_PROMPT = `أنت مساعد ذكي وودود وصراح لخدمة DOMOBAT (دوموبات) — برنامج السكن الاقتصادي السريع في تونس. تكلم بالعربية فقط.

🎯 مهمتك:
- الإجابة بحرية على أي سؤال: عن المنصة، السكن في تونس، التمويل، أو أي موضوع عام يناسب المحادثة. طول الرد حسب الحاجة—سطران إن كفيا، أو فقرات إن كان السؤال يحتاج شرحاً أو أمثلة.
- كن طبيعياً وودوداً ومفيداً. أعطِ رأيك الصريح عندما يطلب المستخدم مشورة أو مقارنة ("أيهما أفضل"، "هل تنصح"، "ما رأيك") مع شرح أسبابك.
- إذا سأل عن شيء خارج اختصاص المنصة، أجب بشكل مفيد: رأي عام، توجيه، أو إحالة لمصادر. لا تدّعِ معرفة رسمية؛ صِغ النصيحة كرأي أو توجيه فقط وليس كمستشار قانوني/مالي رسمي.

📋 معلومات DOMOBAT (للأسئلة عن المنصة):
- منصة رقمية وطنية للسكن الاقتصادي السريع في تونس، تربط طالبي السكن بالمشاريع المناسبة.
- التسجيل: إنشاء حساب برقم هاتف، رمز تحقق SMS، ثم كلمة مرور وبيانات شخصية.
- المستندات الشائعة: بطاقة التعريف، شهادة دخل أو عدم دخل، شهادة الإقامة، شهادة العمل، كشف حساب بنكي.
- حالة الطلب من "طلباتي": قيد المعالجة، طلب مستندات، مقبول، مرفوض.
- تمويل تقريبي: دفعة أولى نحو 5٪، تمويل بنكي 30٪، تقسيط طويل حتى 25 سنة.

🆓 حرية الرد:
- لك حرية اختيار طول الرد ومستوى التفصيل. لا تُلزم نفسك بردود قصيرة فقط—وسّع عندما يكون ذلك أوضح أو أنفع.
- يمكنك إضافة أمثلة أو مقارنات أو نصائح عامة عندما تخدم الإجابة. ابق محترماً ومفيداً، بدون محتوى مسيء أو تمييزي أو مخالف للقانون، وبدون نصائح خطيرة (صحية/مالية حاسمة).

تذكر: كن صبوراً، مفيداً، ودوداً، وواضحاً. الرد كما يناسب السؤال—قصير أو مفصل—بحرية.`
    
    let enhancedSystemPrompt = SYSTEM_PROMPT
    if (intent && typeof intent === 'object' && 'confidence' in intent && intent.confidence > 0.8 && 'intent' in intent) {
      enhancedSystemPrompt += `\n\n💡 سياق: المستخدم قد يسأل عن "${(intent as { intent: string }).intent}". استخدمه إن كان مفيداً، وأجب بشكل طبيعي وحر كما يناسب السؤال.`
    }

    // Call OpenAI API
    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            ...messages,
          ],
          max_tokens: 2048,
          temperature: 0.9,
          top_p: 0.95,
          frequency_penalty: 0.2,
          presence_penalty: 0.2,
        }),
      })
    } catch (fetchError: any) {
      console.error('OpenAI API fetch failed:', fetchError)
      return NextResponse.json(
        { error: 'فشل الاتصال بخدمة الدردشة. تحقق من اتصال الإنترنت.' },
        { status: 503 }
      )
    }

    if (!response.ok) {
      let errorText = ''
      try {
        errorText = await response.text()
      } catch {
        errorText = 'Unknown error'
      }
      console.error('OpenAI API error:', response.status, errorText)
      
      // Provide more specific error messages
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'مفتاح API غير صحيح. تحقق من إعدادات الخادم.' },
          { status: 502 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.' },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: 'فشل في الحصول على رد. جرّب لاحقاً.' },
        { status: 502 }
      )
    }

    let data: any
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error('Failed to parse OpenAI response:', jsonError)
      return NextResponse.json(
        { error: 'فشل في معالجة الرد. جرّب لاحقاً.' },
        { status: 502 }
      )
    }

    const rawContent = data.choices?.[0]?.message?.content ?? ''
    if (!rawContent) {
      console.error('Empty response from OpenAI:', data)
      return NextResponse.json(
        { error: 'لم يتم الحصول على رد. جرّب مرة أخرى.' },
        { status: 502 }
      )
    }

    let content = ''
    try {
      content = sanitizeFn(rawContent)
    } catch (sanitizeError) {
      console.error('Sanitize response error:', sanitizeError)
      content = basicSanitize(rawContent)
    }
    
    return NextResponse.json({ message: content })
  } catch (e: any) {
    console.error('Chat API error:', e)
    console.error('Error stack:', e?.stack)
    console.error('Error name:', e?.name)
    console.error('Error message:', e?.message)
    
    // Provide more helpful error messages in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          error: 'حدث خطأ. جرّب لاحقاً.',
          details: e?.message || String(e),
          stack: e?.stack
        }
      : {
          error: 'حدث خطأ. جرّب لاحقاً.'
        }
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    )
  }
}
