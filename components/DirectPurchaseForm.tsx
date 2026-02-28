'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ShoppingCart, FileText, Upload, X, File, Banknote, CreditCard } from 'lucide-react'

// Fields we never show in the form — we use the logged-in user's account (profile) instead.
const ACCOUNT_FIELDS = ['full_name', 'phone', 'email', 'notes']

const FIELD_LABELS: Record<string, string> = {
  full_name: 'الاسم الكامل',
  phone: 'رقم الهاتف',
  cin: 'رقم بطاقة التعريف الوطني (CIN)',
  email: 'البريد الإلكتروني',
  notes: 'ملاحظات',
  address: 'العنوان',
}

export interface ProjectForPurchase {
  id: string
  name?: string
  purchase_form_fields?: string[] | null
  purchase_required_documents?: string[] | null
}

interface DirectPurchaseFormProps {
  project: ProjectForPurchase
  userId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface DocumentFile {
  docType: string
  file: File
  id: string
}

type PaymentChoice = 'full' | 'installment'

export default function DirectPurchaseForm({
  project,
  userId,
  onSuccess,
  onCancel,
}: DirectPurchaseFormProps) {
  const router = useRouter()
  // Only show fields that are not filled from account (no full_name, phone, email, notes in the form)
  const allFields: string[] = Array.isArray(project.purchase_form_fields) && project.purchase_form_fields.length > 0
    ? project.purchase_form_fields
    : ['cin']
  const fields: string[] = allFields.filter((key) => !ACCOUNT_FIELDS.includes(key))

  // Documents: strictly per project — only show if this project defines required documents
  const docs: string[] = Array.isArray(project.purchase_required_documents) && project.purchase_required_documents.length > 0
    ? project.purchase_required_documents
    : []

  const [paymentType, setPaymentType] = useState<PaymentChoice>('full')
  const [profile, setProfile] = useState<{ name?: string | null; phone_number?: string | null; email?: string | null } | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
  )
  const [documentsNote, setDocumentsNote] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('name, phone_number, email').eq('id', userId).maybeSingle().then(({ data }) => setProfile(data ?? null))
  }, [userId])

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newFiles: DocumentFile[] = files.map(file => ({
      docType,
      file,
      id: `${docType}-${Date.now()}-${Math.random()}`,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
    if (e.target) e.target.value = '' // Reset input
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter(f => f.id !== fileId))
  }

  // Storage keys must be ASCII; Arabic docType is stored in JSON metadata only
  const safePathSegment = (label: string, index: number) => {
    const ascii = label.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    return ascii || `doc-${index}`
  }

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return []

    const uploadedUrls: string[] = []
    setUploading(true)

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const docFile = uploadedFiles[i]
        const fileExt = docFile.file.name.split('.').pop() || 'bin'
        const safeName = safePathSegment(docFile.docType, i)
        const fileName = `${userId}/${project.id}/${safeName}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `purchase-documents/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, docFile.file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw new Error(`فشل رفع ${docFile.file.name}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        const entry = JSON.stringify({
          docType: docFile.docType,
          fileName: docFile.file.name,
          fileSize: docFile.file.size,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
        })
        uploadedUrls.push(entry)
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل رفع الملفات')
      throw error
    } finally {
      setUploading(false)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let documentUrls: string[] = []
      if (uploadedFiles.length > 0) {
        documentUrls = await uploadFiles()
      }

      // Merge account data (from profile) with form-only fields (e.g. cin, address)
      const form_data: Record<string, string> = {
        full_name: profile?.name ?? '',
        phone: profile?.phone_number ?? '',
        email: profile?.email ?? '',
        ...formData,
      }

      const paymentTypeValue = paymentType === 'full' ? 'full' : 'installment'
      const { data: inserted, error } = await supabase.from('project_direct_purchases').insert({
        user_id: userId,
        project_id: project.id,
        status: 'pending',
        payment_type: paymentTypeValue,
        form_data,
        documents_note: documentsNote.trim() || null,
        documents: documentUrls.length > 0 ? documentUrls : null,
      }).select('id').single()

      if (error) throw error
      if (paymentType === 'full') {
        toast.success('تم إرسال طلب الشراء. سنتواصل معك قريباً.')
        onSuccess?.()
      } else {
        toast.success('تم تسجيل طلبك بالتقسيط. أكمل الاستمارة لإتمام الطلب.')
        onSuccess?.()
        const purchaseId = inserted?.id ? `&purchase_id=${inserted.id}` : ''
        router.push(`/dashboard?form=1${purchaseId}`)
      }
    } catch (e: any) {
      if (e?.code === '23505') {
        toast.success('لديك بالفعل طلب شراء لهذا المشروع.')
        onSuccess?.()
        if (paymentType === 'installment') router.push('/dashboard?form=1')
      } else {
        toast.error(e?.message || 'فشل إرسال الطلب')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment type: full or installment */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">طريقة الدفع</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentType('full')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation ${
              paymentType === 'full'
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <Banknote className="w-5 h-5" />
            بالحاضر
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('installment')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation ${
              paymentType === 'installment'
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            بالتقسيط
          </button>
        </div>
        {paymentType === 'installment' && (
          <p className="text-xs text-gray-500">بعد الإرسال ستُوجّه لاستكمال استمارة التقسيط.</p>
        )}
      </div>

      {/* Account info is used automatically — no full_name, phone, email, notes fields */}
      <p className="text-sm text-gray-500">الاسم ورقم الهاتف والبريد الإلكتروني من حسابك سيُستخدمان تلقائياً.</p>

      {/* Only show extra form fields per project (e.g. CIN, address) */}
      {fields.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">معلومات إضافية</h3>
          {fields.map((key) => (
            <div key={key}>
              <label className="form-label">
                {FIELD_LABELS[key] || key}
                <span className="text-red-500 mr-1">*</span>
              </label>
              <input
                type="text"
                value={formData[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="form-input"
                placeholder={FIELD_LABELS[key] || key}
                required
              />
            </div>
          ))}
        </div>
      )}

      {/* Documents: only when this project defines required documents (per-project control) */}
      {docs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">الوثائق المطلوبة لهذا المشروع</h3>
          </div>

          <div className="space-y-4">
            {docs.map((docType, idx) => {
              const docFiles = uploadedFiles.filter(f => f.docType === docType)
              return (
                <div key={idx} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {docType}
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    ref={(el) => { fileInputRefs.current[docType] = el }}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileSelect(docType, e)}
                    className="hidden"
                    id={`file-${docType}-${idx}`}
                  />
                  <label
                    htmlFor={`file-${docType}-${idx}`}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-primary-400 cursor-pointer transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">اختر ملفات (يمكن رفع عدة ملفات)</span>
                  </label>
                  {docFiles.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {docFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-col gap-0.5 p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4 text-gray-500 shrink-0" />
                            <span className="text-sm text-gray-700 flex-1 truncate">{file.file.name}</span>
                            <span className="text-xs text-gray-500">{(file.file.size / 1024).toFixed(1)} KB</span>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                              aria-label="حذف"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-xs text-gray-500">نوع المستند: {file.docType}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pt-2">
            <label className="form-label">ملاحظة بخصوص الوثائق (اختياري)</label>
            <textarea
              value={documentsNote}
              onChange={(e) => setDocumentsNote(e.target.value)}
              className="form-input min-h-[80px]"
              placeholder="أي توضيح عن الوثائق أو موعد إرفاقها..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 py-3"
            disabled={submitting || uploading}
          >
            إلغاء
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-semibold disabled:opacity-70"
        >
          {submitting || uploading ? (
            <>
              <span className="spinner w-5 h-5" />
              {uploading ? 'جاري رفع الملفات...' : 'جاري الإرسال...'}
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              إرسال طلب الشراء
            </>
          )}
        </button>
      </div>
    </form>
  )
}
