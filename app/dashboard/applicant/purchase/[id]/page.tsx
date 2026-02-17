'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  in_progress: 'قيد المتابعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const PURCHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export default function DirectPurchaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [purchase, setPurchase] = useState<any>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const { data: row, error } = await supabase
        .from('project_direct_purchases')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error || !row) {
        toast.error('الطلب غير موجود')
        router.replace('/dashboard/applicant')
        return
      }
      setPurchase(row)
      if (row.project_id) {
        const { data: proj } = await supabase.from('projects').select('name').eq('id', row.project_id).single()
        setProjectName(proj?.name || '—')
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading || !purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }

  const statusClass = PURCHASE_STATUS_COLORS[purchase.status] || 'bg-gray-100 text-gray-800 border-gray-200'
  const docs = (purchase.documents && Array.isArray(purchase.documents)) ? purchase.documents : []
  const formData = purchase.form_data && typeof purchase.form_data === 'object' ? purchase.form_data : {}

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-28">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard/applicant" className="p-2 -m-2 rounded-xl hover:bg-gray-100 flex items-center text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <span className="text-base font-semibold text-gray-900">تفاصيل طلب الشراء</span>
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 py-6 flex-1">
        {/* المشروع والحالة */}
        <div className={`mb-6 rounded-2xl border-2 p-4 ${statusClass}`}>
          <p className="text-xs font-medium opacity-90 mb-1">المشروع</p>
          <p className="text-xl font-bold">{projectName}</p>
          <p className="text-sm font-medium mt-2">{PURCHASE_STATUS_LABELS[purchase.status] || purchase.status}</p>
          <p className="text-sm opacity-80 mt-1">{new Date(purchase.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</p>
        </div>

        {/* ملاحظة من الإدارة إن وجدت */}
        {purchase.admin_notes && (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 mb-6">
            <p className="font-semibold text-blue-900 text-sm mb-2">ملاحظة من الإدارة</p>
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{purchase.admin_notes}</p>
          </div>
        )}

        {/* المستندات المرفوعة */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">المستندات المرفوعة</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد مستندات مرفوعة.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((item: any, i: number) => {
                const parsed = typeof item === 'string' ? (() => { try { return JSON.parse(item) } catch { return { url: item, fileName: `مستند ${i + 1}` } } })() : item
                const url = parsed?.url || parsed
                const name = parsed?.fileName || parsed?.docType || `مستند ${i + 1}`
                return (
                  <li key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700 truncate">{name}</span>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm flex items-center gap-1 shrink-0"><ExternalLink className="w-4 h-4" /> فتح</a>}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* بيانات الطلب (form_data) */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">بيانات الطلب</h3>
          {Object.keys(formData).length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد بيانات إضافية.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-gray-500">{key === 'full_name' ? 'الاسم' : key === 'phone' ? 'الهاتف' : key === 'cin' ? 'البطاقة' : key === 'email' ? 'البريد' : key === 'notes' ? 'ملاحظات' : key}</dt>
                  <dd className="font-medium text-gray-900">{String(value || '—')}</dd>
                </div>
              ))}
            </dl>
          )}
          {purchase.documents_note && (
            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{purchase.documents_note}</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
