/**
 * Chat context and knowledge base for intelligent responses
 */

export interface ChatContext {
  userType?: 'applicant' | 'investor' | 'admin'
  currentPage?: string
  recentActions?: string[]
}

export const CHAT_KNOWLEDGE_BASE = {
  // Common questions and answers
  faq: {
    registration: {
      question: 'كيف أسجل في التطبيق؟',
      answer: 'لتسجيل حساب جديد:\n1. اضغط على "إنشاء حساب"\n2. أدخل رقم هاتفك\n3. ستصلك رسالة SMS برمز التحقق\n4. أدخل الرمز ثم أنشئ كلمة مرور\n5. املأ بياناتك الشخصية',
    },
    documents: {
      question: 'ما هي المستندات المطلوبة؟',
      answer: 'المستندات الأساسية:\n• نسخة بطاقة التعريف الوطنية\n• شهادة دخل أو شهادة عدم دخل\n• شهادة الإقامة أو عقد الكراء\n• شهادة العمل أو عقد الشغل\n• كشف حساب بنكي (آخر 3 أشهر)\n\nقد تطلب الإدارة مستندات إضافية حسب حالتك.',
    },
    applicationStatus: {
      question: 'كيف أعرف حالة طلبي؟',
      answer: 'يمكنك متابعة حالة طلبك من صفحة "طلباتي":\n• قيد المعالجة: الطلب قيد الدراسة\n• طلب مستندات: تحتاج رفع مستندات إضافية\n• مقبول: تمت الموافقة على طلبك\n• مرفوض: تم رفض الطلب\n\nبعد الموافقة، يمكنك متابعة مراحل المشروع.',
    },
    projectStages: {
      question: 'ما هي مراحل المشروع؟',
      answer: 'بعد الموافقة على طلبك، يمر المشروع بـ 5 مراحل:\n1. دراسة المشروع\n2. التصميم\n3. البناء\n4. التشطيب\n5. جاهز للتسليم\n\nيمكنك متابعة التقدم من صفحة تفاصيل الطلب.',
    },
    scoring: {
      question: 'كيف يتم تقييم الطلبات؟',
      answer: 'نظام النقاط يعتمد على:\n• الاستقرار المالي (الدخل، الادخار)\n• عدد أفراد الأسرة\n• عدم امتلاك مسكن\n• قابلية التمويل البنكي\n\nكلما زادت نقاطك، زادت أولويتك في القائمة.',
    },
    pricing: {
      question: 'ما هي أسعار المساكن؟',
      answer: 'أسعار البناء تتراوح بين:\n• 1800 إلى 2800 دينار للمتر المربع\n\nالسعر النهائي يعتمد على:\n• موقع المشروع\n• نوع السكن (فردي/جماعي)\n• المساحة المطلوبة\n• مستوى التشطيب',
    },
    payment: {
      question: 'كيف يتم الدفع؟',
      answer: 'نموذج التمويل:\n• دفعة أولية: 5% فقط\n• تمويل بنكي: 30%\n• تقسيط طويل: 65% حتى 25 سنة\n\nمثال: مسكن بـ 200,000 د\n• الدفعة الأولى: 10,000 د\n• القسط الشهري: حوالي 540 د على 20 سنة',
    },
    timeline: {
      question: 'كم تستغرق مدة البناء؟',
      answer: 'المشاريع تنفذ بسرعة:\n• مشاريع سريعة: 90 يوم\n• مشاريع متوسطة: 180 يوم\n• مشاريع كبيرة: سنة\n\nبعد الموافقة على طلبك، سيتم إعلامك بموعد بداية المشروع.',
    },
  },

  // Feature explanations
  features: {
    autoSave: 'التطبيق يحفظ بياناتك تلقائياً أثناء التعبئة',
    documentUpload: 'يمكنك رفع عدة مستندات لكل نوع',
    progressTracking: 'تابع مراحل مشروعك خطوة بخطوة',
    notifications: 'ستصلك إشعارات عند أي تحديث',
    mapView: 'شاهد موقع المشاريع على الخريطة',
  },

  // Helpful tips
  tips: [
    'املأ جميع البيانات بدقة لزيادة نقاطك',
    'ارفع المستندات بصيغة واضحة',
    'تابع طلبك بانتظام',
    'رد على طلبات الإدارة بسرعة',
    'استخدم الخريطة لاختيار موقع مناسب',
  ],
}

/**
 * Get contextual help based on user's current page
 */
export function getContextualHelp(page: string): string {
  const helpMap: Record<string, string> = {
    '/dashboard/applicant': 'أنت في صفحة الطلبات. يمكنك:\n• إنشاء طلب سكن جديد\n• متابعة طلباتك الحالية\n• رفع المستندات\n• متابعة التقدم',
    '/dashboard/applicant/application': 'صفحة تفاصيل الطلب. يمكنك:\n• رفع المستندات المطلوبة\n• متابعة حالة الطلب\n• رؤية تحديثات الإدارة\n• متابعة مراحل المشروع',
    '/projects': 'صفحة المشاريع. يمكنك:\n• استعراض المشاريع المتاحة\n• رؤية مواقع المشاريع على الخريطة\n• معرفة الأسعار والتواريخ\n• طلب شراء مباشر',
  }

  return helpMap[page] || 'كيف يمكنني مساعدتك اليوم؟'
}

/**
 * Detect intent from user message
 */
export function detectIntent(message: string): {
  intent: string
  confidence: number
  suggestedResponse?: string
} {
  const lowerMessage = message.toLowerCase()

  // Registration intent
  if (lowerMessage.includes('سجل') || lowerMessage.includes('حساب') || lowerMessage.includes('تسجيل')) {
    return {
      intent: 'registration',
      confidence: 0.9,
      suggestedResponse: CHAT_KNOWLEDGE_BASE.faq.registration.answer,
    }
  }

  // Documents intent
  if (lowerMessage.includes('مستند') || lowerMessage.includes('وثيقة') || lowerMessage.includes('ورقة')) {
    return {
      intent: 'documents',
      confidence: 0.9,
      suggestedResponse: CHAT_KNOWLEDGE_BASE.faq.documents.answer,
    }
  }

  // Status intent
  if (lowerMessage.includes('حالة') || lowerMessage.includes('وضع') || lowerMessage.includes('متابعة')) {
    return {
      intent: 'status',
      confidence: 0.85,
      suggestedResponse: CHAT_KNOWLEDGE_BASE.faq.applicationStatus.answer,
    }
  }

  // Pricing intent
  if (lowerMessage.includes('سعر') || lowerMessage.includes('ثمن') || lowerMessage.includes('تكلفة')) {
    return {
      intent: 'pricing',
      confidence: 0.9,
      suggestedResponse: CHAT_KNOWLEDGE_BASE.faq.pricing.answer,
    }
  }

  // Payment intent
  if (lowerMessage.includes('دفع') || lowerMessage.includes('قسط') || lowerMessage.includes('تمويل')) {
    return {
      intent: 'payment',
      confidence: 0.9,
      suggestedResponse: CHAT_KNOWLEDGE_BASE.faq.payment.answer,
    }
  }

  // Default
  return {
    intent: 'general',
    confidence: 0.5,
  }
}
