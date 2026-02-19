'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ShoppingCart, FileText, Upload, X, File } from 'lucide-react'

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

export default function DirectPurchaseForm({
  project,
  userId,
  onSuccess,
  onCancel,
}: DirectPurchaseFormProps) {
  const fields: string[] = Array.isArray(project.purchase_form_fields) && project.purchase_form_fields.length > 0
    ? project.purchase_form_fields
    : ['full_name', 'phone', 'cin', 'email', 'notes']
  const docs: string[] = Array.isArray(project.purchase_required_documents) && project.purchase_required_documents.length > 0
    ? project.purchase_required_documents
    : ['نسخة بطاقة التعريف', 'شهادة دخل أو عدم دخل']

  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, key) => ({ ...acc, [key]: '' }), {})
  )
  const [documentsNote, setDocumentsNote] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

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

      const { error } = await supabase.from('project_direct_purchases').insert({
        user_id: userId,
        project_id: project.id,
        status: 'pending',
        form_data: formData,
        documents_note: documentsNote.trim() || null,
        documents: documentUrls.length > 0 ? documentUrls : null,
      })

      if (error) throw error
      toast.success('تم إرسال طلب الشراء. سنتواصل معك قريباً.')
      onSuccess?.()
    } catch (e: any) {
      if (e?.code === '23505') {
        toast.success('لديك بالفعل طلب شراء لهذا المشروع.')
        onSuccess?.()
      } else {
        toast.error(e?.message || 'فشل إرسال الطلب')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Fields Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">المعلومات الشخصية</h3>
        </div>
        {fields.map((key) => (
          <div key={key}>
            <label className="form-label">
              {FIELD_LABELS[key] || key}
              {key !== 'notes' && <span className="text-red-500 mr-1">*</span>}
            </label>
            {key === 'notes' ? (
              <textarea
                value={formData[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="form-input min-h-[100px] resize-none"
                placeholder="اختياري"
                rows={4}
              />
            ) : (
              <input
                type={key === 'email' ? 'email' : 'text'}
                value={formData[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className="form-input"
                placeholder={FIELD_LABELS[key] || key}
                required={key !== 'notes'}
              />
            )}
          </div>
        ))}
      </div>

      {/* Documents Section */}
      {docs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-900">الوثائق المطلوبة</h3>
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
