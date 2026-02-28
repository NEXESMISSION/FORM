'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Save, X } from 'lucide-react'

const TUNISIAN_GOVERNORATES = [
  'أريانة', 'باجة', 'بن عروس', 'بنزرت', 'قابس', 'قفصة',
  'جندوبة', 'القيروان', 'القصرين', 'قبلي', 'الكاف', 'المهدية',
  'منوبة', 'مدنين', 'المنستير', 'نابل', 'صفاقس', 'سيدي بوزيد',
  'سليانة', 'سوسة', 'تطاوين', 'توزر', 'تونس', 'زغوان'
]

interface ProjectFormProps {
  project?: any
  onClose: () => void
  onSuccess: () => void
}

export default function ProjectForm({ project, onClose, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    thumbnail_url: project?.thumbnail_url || '',
    image_urls: Array.isArray(project?.image_urls) ? project.image_urls.join('\n') : '',
    governorate: project?.governorate || '',
    district: project?.district || '',
    location_lat: project?.location_lat || '',
    location_lng: project?.location_lng || '',
    housing_type: project?.housing_type || 'apartment',
    number_of_units: project?.number_of_units || '',
    expected_price: project?.expected_price || '',
    completion_percentage: project?.completion_percentage || 0,
    start_date: project?.start_date || '',
    delivery_date: project?.delivery_date || '',
    status: project?.status || 'study',
    land_cost: project?.land_cost || '',
    construction_cost: project?.construction_cost || '',
    total_cost: project?.total_cost || '',
    project_duration_months: project?.project_duration_months || '',
    expected_return_percentage: project?.expected_return_percentage || '',
    risk_level: project?.risk_level || 'medium',
    purchase_form_fields: (() => {
      const arr = Array.isArray(project?.purchase_form_fields) ? project.purchase_form_fields : ['cin']
      const allowed = arr.filter((f: string) => ['cin', 'address'].includes(f))
      return allowed.length > 0 ? allowed : ['cin']
    })(),
    purchase_required_documents: Array.isArray(project?.purchase_required_documents)
      ? project.purchase_required_documents.join('\n')
      : (project?.purchase_required_documents == null ? 'نسخة بطاقة التعريف\nشهادة دخل أو عدم دخل' : ''),
  })

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يرجى تسجيل الدخول أولاً')
        return
      }

      const purchaseDocsText = typeof formData.purchase_required_documents === 'string'
        ? formData.purchase_required_documents
        : ''
      const purchase_required_documents = purchaseDocsText
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)

      const imageUrlsRaw = typeof formData.image_urls === 'string' ? formData.image_urls : ''
        const image_urls = imageUrlsRaw
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)
        const submitData: any = {
        ...formData,
        number_of_units: parseInt(formData.number_of_units) || 0,
        expected_price: formData.expected_price ? parseFloat(formData.expected_price) : null,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
        land_cost: formData.land_cost ? parseFloat(formData.land_cost) : null,
        construction_cost: formData.construction_cost ? parseFloat(formData.construction_cost) : null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        project_duration_months: formData.project_duration_months ? parseInt(formData.project_duration_months) : null,
        expected_return_percentage: formData.expected_return_percentage ? parseFloat(formData.expected_return_percentage) : null,
        completion_percentage: parseInt(formData.completion_percentage.toString()) || 0,
        start_date: formData.start_date || null,
        delivery_date: formData.delivery_date || null,
        created_by: user.id,
        purchase_form_fields: Array.isArray(formData.purchase_form_fields) ? formData.purchase_form_fields : [],
        purchase_required_documents: purchase_required_documents.length > 0 ? purchase_required_documents : null,
        image_urls: image_urls.length > 0 ? image_urls : null,
      }

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(submitData)
          .eq('id', project.id)
        if (error) throw error
        toast.success('تم تحديث المشروع بنجاح!')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert(submitData)
        if (error) throw error
        toast.success('تم إنشاء المشروع بنجاح!')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'فشل حفظ المشروع')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ margin: 'auto' }}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {project ? 'تعديل المشروع' : 'إضافة مشروع جديد'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">اسم المشروع *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="form-input"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">رابط صورة مصغرة (للبطاقة والقائمة)</label>
              <input
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => updateField('thumbnail_url', e.target.value)}
                className="form-input"
                placeholder="https://... أو اترك فارغاً"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">صور المشروع (رابط واحد في كل سطر — يمكن إضافة عدة صور)</label>
              <textarea
                value={typeof formData.image_urls === 'string' ? formData.image_urls : (Array.isArray(formData.image_urls) ? formData.image_urls.join('\n') : '')}
                onChange={(e) => updateField('image_urls', e.target.value)}
                className="form-input min-h-[120px] font-mono text-sm"
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">سطر واحد لكل صورة. تُعرض في صفحة تفاصيل المشروع.</p>
            </div>

            <div>
              <label className="form-label">الولاية *</label>
              <select
                value={formData.governorate}
                onChange={(e) => updateField('governorate', e.target.value)}
                className="form-input"
                required
              >
                <option value="">اختر...</option>
                {TUNISIAN_GOVERNORATES.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">المعتمدية</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">خط العرض</label>
              <input
                type="number"
                step="any"
                value={formData.location_lat}
                onChange={(e) => updateField('location_lat', e.target.value)}
                className="form-input"
                placeholder="36.8065"
              />
            </div>

            <div>
              <label className="form-label">خط الطول</label>
              <input
                type="number"
                step="any"
                value={formData.location_lng}
                onChange={(e) => updateField('location_lng', e.target.value)}
                className="form-input"
                placeholder="10.1815"
              />
            </div>

            <div>
              <label className="form-label">نوع السكن *</label>
              <select
                value={formData.housing_type}
                onChange={(e) => updateField('housing_type', e.target.value)}
                className="form-input"
                required
              >
                <option value="apartment">شقة</option>
                <option value="individual">سكن فردي</option>
              </select>
            </div>

            <div>
              <label className="form-label">عدد الوحدات *</label>
              <input
                type="number"
                min="1"
                value={formData.number_of_units}
                onChange={(e) => updateField('number_of_units', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">السعر المتوقع (د.ت)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_price}
                onChange={(e) => updateField('expected_price', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">الحالة *</label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="form-input"
                required
              >
                <option value="study">قيد الدراسة</option>
                <option value="construction_90">بناء (90 يوم)</option>
                <option value="construction_180">بناء (180 يوم)</option>
                <option value="construction_365">بناء (سنة)</option>
                <option value="ready">جاهز للبيع</option>
              </select>
            </div>

            <div>
              <label className="form-label">نسبة الإنجاز</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.completion_percentage}
                onChange={(e) => updateField('completion_percentage', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">تاريخ البدء</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">تاريخ الانتهاء المتوقع</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => updateField('delivery_date', e.target.value)}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">يمكن تمديده لاحقاً من بطاقة المشروع</p>
            </div>

            <div>
              <label className="form-label">تكلفة الأرض (د.ت)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.land_cost}
                onChange={(e) => updateField('land_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">تكلفة البناء (د.ت)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.construction_cost}
                onChange={(e) => updateField('construction_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">التكلفة الإجمالية (د.ت)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => updateField('total_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">مدة المشروع (أشهر)</label>
              <input
                type="number"
                min="0"
                value={formData.project_duration_months}
                onChange={(e) => updateField('project_duration_months', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">العائد المتوقع (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_return_percentage}
                onChange={(e) => updateField('expected_return_percentage', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">مستوى المخاطر</label>
              <select
                value={formData.risk_level}
                onChange={(e) => updateField('risk_level', e.target.value)}
                className="form-input"
              >
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
              </select>
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">استمارة الشراء المباشر (لكل مشروع)</h3>
              <p className="text-xs text-gray-500 mb-3">الاسم والهاتف والبريد تُؤخذ من حساب المستخدم. اختر الحقول الإضافية والوثائق المطلوبة لهذا المشروع فقط.</p>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.purchase_form_fields) && formData.purchase_form_fields.includes('cin')}
                    onChange={(e) => {
                      const arr = Array.isArray(formData.purchase_form_fields) ? [...formData.purchase_form_fields] : []
                      if (e.target.checked) updateField('purchase_form_fields', [...arr.filter((x: string) => x !== 'cin'), 'cin'])
                      else updateField('purchase_form_fields', arr.filter((x: string) => x !== 'cin'))
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">طلب رقم بطاقة التعريف (CIN)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.purchase_form_fields) && formData.purchase_form_fields.includes('address')}
                    onChange={(e) => {
                      const arr = Array.isArray(formData.purchase_form_fields) ? [...formData.purchase_form_fields] : []
                      if (e.target.checked) updateField('purchase_form_fields', [...arr.filter((x: string) => x !== 'address'), 'address'])
                      else updateField('purchase_form_fields', arr.filter((x: string) => x !== 'address'))
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">طلب العنوان</span>
                </label>
              </div>
              <label className="form-label">الوثائق المطلوبة لهذا المشروع (سطر واحد لكل مستند)</label>
              <textarea
                value={typeof formData.purchase_required_documents === 'string' ? formData.purchase_required_documents : ''}
                onChange={(e) => updateField('purchase_required_documents', e.target.value)}
                className="form-input min-h-[100px] font-mono text-sm"
                placeholder="نسخة بطاقة التعريف&#10;شهادة دخل أو عدم دخل"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">اترك فارغاً إن لم ترد طلب وثائق لهذا المشروع.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <span className="spinner"></span> : <><Save className="w-4 h-4" />حفظ المشروع</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
