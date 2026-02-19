'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { BarChart3, Users, Home, LogOut, Plus, Download, Edit, X, FileText, ExternalLink, CheckCircle, XCircle, Eye, ImageIcon, ShoppingCart, ChevronDown, SlidersHorizontal, FilePlus, User, Calendar, CalendarCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import ProjectForm from '@/components/ProjectForm'
import MapView from '@/components/MapView'

const PROJECT_STATUS_LABELS: Record<string, string> = {
  study: 'قيد الدراسة',
  construction_90: 'بناء 90 يوم',
  construction_180: 'بناء 180 يوم',
  construction_365: 'بناء سنة',
  ready: 'جاهز للبيع',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'عالي',
  medium: 'متوسط',
  normal: 'عادي',
}

const APP_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد المعالجة',
  documents_requested: 'طلب مستندات',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  in_progress: 'قيد المتابعة',
  documents_requested: 'طلب مستندات',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const PROGRESS_STAGES: { value: string; label: string }[] = [
  { value: 'study', label: 'دراسة المشروع' },
  { value: 'design', label: 'التصميم' },
  { value: 'construction', label: 'البناء' },
  { value: 'finishing', label: 'التشطيب' },
  { value: 'ready', label: 'جاهز للتسليم' },
]

function getProjectTiming(project: any) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = project.start_date ? new Date(project.start_date) : null
  const end = project.delivery_date ? new Date(project.delivery_date) : null
  if (!end) return { label: null, daysRemaining: null, isFinished: false, isNotStarted: false }
  end.setHours(0, 0, 0, 0)
  if (start) start.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()
  const endTime = end.getTime()
  const startTime = start ? start.getTime() : null
  if (todayTime > endTime) return { label: 'منتهي', daysRemaining: 0, isFinished: true, isNotStarted: false }
  if (startTime != null && todayTime < startTime) {
    const days = Math.ceil((startTime - todayTime) / (24 * 60 * 60 * 1000))
    return { label: `يبدأ بعد ${days} يوم`, daysRemaining: null, isFinished: false, isNotStarted: true }
  }
  const days = Math.ceil((endTime - todayTime) / (24 * 60 * 60 * 1000))
  return { label: `متبقي ${days} يوم`, daysRemaining: days, isFinished: false, isNotStarted: false }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [directPurchases, setDirectPurchases] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'applications' | 'projects' | 'documents' | 'reports' | 'purchases'>('applications')
  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [requestDocsAppId, setRequestDocsAppId] = useState<string | null>(null)
  const [requestDocsMessage, setRequestDocsMessage] = useState('')
  const [requiredDocTypes, setRequiredDocTypes] = useState<{ id: string; label_ar: string; sort_order: number; active: boolean }[]>([])
  const [showDocsModalApp, setShowDocsModalApp] = useState<any>(null)
  const [rejectDocState, setRejectDocState] = useState<{ appId: string; docIndex: number; reason: string } | null>(null)
  const [showDetailApp, setShowDetailApp] = useState<any>(null)
  const [previewDoc, setPreviewDoc] = useState<{ url: string; fileName: string } | null>(null)
  const [requestDocsSelectedTypes, setRequestDocsSelectedTypes] = useState<string[]>([])
  const [requestDocsCustomTypes, setRequestDocsCustomTypes] = useState<string[]>([])
  const [requestDocsCustomInput, setRequestDocsCustomInput] = useState('')
  const [showPurchaseDetail, setShowPurchaseDetail] = useState<any>(null)
  const [showPurchaseDocsModal, setShowPurchaseDocsModal] = useState<any>(null)
  const [rejectPurchaseDocState, setRejectPurchaseDocState] = useState<{ purchaseId: string; docIndex: number; reason: string } | null>(null)
  const [requestPurchaseDocsId, setRequestPurchaseDocsId] = useState<string | null>(null)
  const [requestPurchaseDocsMessage, setRequestPurchaseDocsMessage] = useState('')
  const [requestPurchaseDocsCustomTypes, setRequestPurchaseDocsCustomTypes] = useState<string[]>([])
  const [requestPurchaseDocsCustomInput, setRequestPurchaseDocsCustomInput] = useState('')
  const [showProgressModal, setShowProgressModal] = useState<any>(null)
  const [progressStage, setProgressStage] = useState('')
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')
  const [newDocLabel, setNewDocLabel] = useState('')
  const [docsLoading, setDocsLoading] = useState(false)
  const [filters, setFilters] = useState({
    governorate: '',
    priority: '',
    status: '',
    incomeRange: '',
    bank: '',
  })
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const [extendProject, setExtendProject] = useState<any>(null)
  const [extendEndDate, setExtendEndDate] = useState('')

  useEffect(() => {
    checkUser()
    loadData()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        if (profile?.role === 'applicant') router.replace('/dashboard/applicant')
        else router.replace('/dashboard')
        return
      }
      setUser(user)
    } catch {
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    try {
      const { data: apps } = await supabase
        .from('housing_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setApplications(apps || [])

      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      setProjects(projs || [])

      const { data: purchases } = await supabase
        .from('project_direct_purchases')
        .select(`
          *,
          profiles:user_id (id, name, email, phone_number),
          projects:project_id (id, name)
        `)
        .order('created_at', { ascending: false })
      setDirectPurchases(purchases || [])

      try {
        const { data: docTypes } = await supabase
          .from('required_document_types')
          .select('id, label_ar, sort_order, active')
          .order('sort_order', { ascending: true })
        setRequiredDocTypes(docTypes || [])
      } catch (_) {
        setRequiredDocTypes([])
      }
    } catch {
      toast.error('فشل تحميل البيانات')
    }
  }

  const loadRequiredDocTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('required_document_types')
        .select('id, label_ar, sort_order, active')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setRequiredDocTypes(data || [])
    } catch (e: any) {
      console.error('loadRequiredDocTypes', e)
      toast.error(e?.message || 'فشل تحميل قائمة المستندات')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredApplications = applications.filter(app => {
    if (filters.governorate && app.governorate !== filters.governorate) return false
    if (filters.priority && app.priority_level !== filters.priority) return false
    if (filters.status && app.status !== filters.status) return false
    if (filters.bank && app.bank_name !== filters.bank) return false
    if (filters.incomeRange) {
      const income = parseFloat(app.net_monthly_income) || 0
      const [min, max] = filters.incomeRange.split('-').map(Number)
      if (max && (income < min || income > max)) return false
      if (!max && income < min) return false
    }
    return true
  })

  const uniqueBanks = [...new Set(applications.map(a => a.bank_name).filter(Boolean))]
  const incomeRanges = [
    { label: '0-500 د.ت', value: '0-500' },
    { label: '500-1000 د.ت', value: '500-1000' },
    { label: '1000-2000 د.ت', value: '1000-2000' },
    { label: '2000+ د.ت', value: '2000-999999' },
  ]

  const stats = {
    totalApplications: applications.length,
    highPriority: applications.filter(a => a.priority_level === 'high').length,
    totalProjects: projects.length,
  }

  const governorateStats = applications.reduce((acc: Record<string, number>, app) => {
    const gov = app.governorate || 'غير محدد'
    acc[gov] = (acc[gov] || 0) + 1
    return acc
  }, {})

  const housingTypeStats = applications.reduce((acc: Record<string, number>, app) => {
    const type = app.desired_housing_type || 'غير محدد'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const purchasingPowerStats = {
    low: applications.filter(a => (parseFloat(a.net_monthly_income) || 0) < 500).length,
    medium: applications.filter(a => {
      const income = parseFloat(a.net_monthly_income) || 0
      return income >= 500 && income < 1500
    }).length,
    high: applications.filter(a => (parseFloat(a.net_monthly_income) || 0) >= 1500).length,
  }

  // تقارير مفصلة للشركة
  const statusStats = applications.reduce((acc: Record<string, number>, app) => {
    const s = app.status || 'pending'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  })
  const monthlyStats = last12Months.map(({ year, month, label }) => ({
    label,
    count: applications.filter(a => {
      const created = new Date(a.created_at)
      return created.getFullYear() === year && created.getMonth() === month
    }).length,
  }))
  const employmentStats = applications.reduce((acc: Record<string, number>, app) => {
    const v = app.employment_status || 'غير محدد'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})
  const maritalStats = applications.reduce((acc: Record<string, number>, app) => {
    const v = app.marital_status || 'غير محدد'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})
  const areaStats = applications.reduce((acc: Record<string, number>, app) => {
    const v = app.required_area || app.housing_area_custom || app.housing_area || 'غير محدد'
    const key = String(v)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const paymentTypeStats = applications.reduce((acc: Record<string, number>, app) => {
    const v = app.payment_type || 'غير محدد'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})
  const installmentStats = applications.reduce((acc: Record<string, number>, app) => {
    const v = app.installment_period || 'غير محدد'
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {})
  const scores = applications.map(a => parseInt(a.application_score, 10) || 0).filter(Boolean)
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—'
  const incomes = applications.map(a => parseFloat(a.net_monthly_income) || 0).filter(Boolean)
  const avgIncome = incomes.length ? (incomes.reduce((a, b) => a + b, 0) / incomes.length).toFixed(0) : '—'

  const exportReportsCsv = () => {
    const headers = ['الاسم', 'البريد', 'الولاية', 'الحالة', 'النقاط', 'الأولوية', 'الدخل الشهري', 'الميزانية', 'المساحة', 'نوع السكن', 'الحالة الاجتماعية', 'عدد الأطفال', 'تاريخ التقديم']
    const rows = applications.map(a => [
      `${a.first_name || ''} ${a.last_name || ''}`.trim(),
      a.email || '',
      a.governorate || '',
      APP_STATUS_LABELS[a.status] || a.status,
      a.application_score ?? '',
      PRIORITY_LABELS[a.priority_level] || a.priority_level,
      a.net_monthly_income ?? '',
      a.maximum_budget ?? '',
      a.required_area ?? a.housing_area ?? '',
      a.desired_housing_type || a.housing_type_model || '',
      a.marital_status || '',
      a.number_of_children ?? '',
      a.created_at ? new Date(a.created_at).toLocaleDateString('ar-TN') : '',
    ])
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `تقارير-طلبات-السكن-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير الملف')
  }

  const updateAppStatus = async (appId: string, status: string) => {
    const { error } = await supabase
      .from('housing_applications')
      .update({ status })
      .eq('id', appId)
    if (error) toast.error('فشل تحديث الحالة')
    else { toast.success('تم تحديث الحالة'); loadData() }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  const tabOptions: { id: typeof activeTab; label: string; icon: typeof Users }[] = [
    { id: 'applications', label: 'الطلبات', icon: Users },
    { id: 'purchases', label: 'طلبات الشراء', icon: ShoppingCart },
    { id: 'projects', label: 'المشاريع', icon: Home },
    { id: 'documents', label: 'المستندات المطلوبة', icon: FileText },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] sm:max-w-2xl md:max-w-4xl mx-auto px-3 sm:px-4 h-14 sm:h-20 flex justify-between items-center gap-2">
          <Image src="/logo.png" alt="DOMOBAT" width={80} height={80} className="rounded-xl sm:rounded-2xl shrink-0 object-contain h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 sm:gap-2 text-gray-600 text-xs sm:text-sm font-medium hover:text-gray-900 py-2 px-2"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            خروج
          </button>
        </div>
      </header>

      <div className="max-w-[28rem] sm:max-w-2xl md:max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-10">
        {/* إحصائيات — مضغوطة على الموبايل */}
        <div className="flex sm:grid sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex-1 sm:flex-none card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:block justify-center min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-gray-900 tabular-nums">{stats.totalApplications}</p>
            <p className="text-xs sm:text-sm text-gray-600 truncate">الطلبات</p>
          </div>
          <div className="flex-1 sm:flex-none card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:block justify-center min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-red-600 tabular-nums">{stats.highPriority}</p>
            <p className="text-xs sm:text-sm text-gray-600 truncate">عالي</p>
          </div>
          <div className="flex-1 sm:flex-none card rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:block justify-center min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-primary-600 tabular-nums">{stats.totalProjects}</p>
            <p className="text-xs sm:text-sm text-gray-600 truncate">المشاريع</p>
          </div>
        </div>

        {/* تبويبات — قائمة منسدلة على الموبايل، أزرار على الشاشات الأكبر */}
        <div className="mb-4">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
              className="w-full input text-sm py-3 rounded-xl border-gray-200 bg-white"
            >
              {tabOptions.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {tabOptions.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pill shrink-0 flex items-center gap-2 ${activeTab === id ? 'pill-active' : 'pill-inactive'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* تبويب الطلبات */}
        {activeTab === 'applications' && (
          <div className="card rounded-2xl sm:rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">طلبات السكن</h2>
              <span className="text-sm text-gray-500">{filteredApplications.length} طلب</span>
            </div>

            {/* فلاتر — زر على الموبايل، شبكة على الشاشات الأكبر */}
            <div className="mb-4 sm:mb-5">
              <button
                type="button"
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className="sm:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium"
              >
                <SlidersHorizontal className="w-4 h-4" />
                فلاتر
                <ChevronDown className={`w-4 h-4 transition-transform ${showFiltersMobile ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 ${showFiltersMobile ? 'mt-3' : 'hidden sm:grid'} mb-0`}>
                <select
                  value={filters.governorate}
                  onChange={(e) => setFilters({ ...filters, governorate: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">كل الولايات</option>
                  {Object.keys(governorateStats).map(gov => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">كل الأولويات</option>
                  <option value="high">عالي</option>
                  <option value="medium">متوسط</option>
                  <option value="normal">عادي</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">كل الحالات</option>
                  {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={filters.incomeRange}
                  onChange={(e) => setFilters({ ...filters, incomeRange: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">كل المداخيل</option>
                  {incomeRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
                <select
                  value={filters.bank}
                  onChange={(e) => setFilters({ ...filters, bank: e.target.value })}
                  className="input text-sm"
                >
                  <option value="">كل البنوك</option>
                  {uniqueBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* جدول على الشاشات الكبيرة، كروت على الموبايل */}
            <div className="hidden md:block overflow-x-auto -mx-2">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الاسم</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الولاية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الميزانية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">النقاط</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الأولوية</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-3 text-sm">{app.first_name} {app.last_name}</td>
                      <td className="px-3 py-3 text-sm">{app.governorate || '—'}</td>
                      <td className="px-3 py-3 text-sm">{app.maximum_budget ? `${Number(app.maximum_budget).toLocaleString('ar-TN')} د.ت` : '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`font-semibold text-sm ${
                          (app.application_score || 0) >= 80 ? 'text-green-600' :
                          (app.application_score || 0) >= 50 ? 'text-amber-600' : 'text-gray-600'
                        }`}>
                          {app.application_score ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          app.priority_level === 'high' ? 'bg-red-100 text-red-800' :
                          app.priority_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {PRIORITY_LABELS[app.priority_level] || app.priority_level || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDetailApp(app)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                            title="عرض كل التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <select
                            value={app.status}
                            onChange={(e) => updateAppStatus(app.id, e.target.value)}
                            className="input text-sm py-2 w-32"
                          >
                            {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          {app.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowProgressModal(app)
                                setProgressStage(app.progress_stage || '')
                                setProgressPercentage(app.progress_percentage || 0)
                                setProgressNotes(app.progress_notes || '')
                              }}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              title="تحديث التقدم"
                            >
                              التقدم
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowDocsModalApp(app)}
                            className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                          >
                            المستندات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const msg = (app as any).documents_requested_message || ''
                              setRequestDocsAppId(app.id)
                              setRequestDocsMessage(msg)
                              const existing = requiredDocTypes.filter(d => d.active && msg.includes(d.label_ar)).map(d => d.label_ar)
                              setRequestDocsSelectedTypes(existing)
                            }}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            طلب مستندات
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {new Date(app.created_at).toLocaleDateString('ar-TN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* كروت للموبايل */}
            <div className="md:hidden space-y-3">
              {filteredApplications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900">{app.first_name} {app.last_name}</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      app.priority_level === 'high' ? 'bg-red-100 text-red-800' :
                      app.priority_level === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {PRIORITY_LABELS[app.priority_level] || app.priority_level || '—'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>{app.governorate || '—'}</span>
                    <span>•</span>
                    <span>{app.maximum_budget ? `${Number(app.maximum_budget).toLocaleString('ar-TN')} د.ت` : '—'}</span>
                    <span>•</span>
                    <span>نقاط: {app.application_score ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDetailApp(app)}
                      className="p-2 rounded-lg bg-gray-100 text-gray-700 shrink-0"
                      title="عرض كل التفاصيل"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <select
                      value={app.status}
                      onChange={(e) => updateAppStatus(app.id, e.target.value)}
                      className="input text-sm py-2 flex-1 min-w-0"
                    >
                      {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    {app.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProgressModal(app)
                          setProgressStage(app.progress_stage || '')
                          setProgressPercentage(app.progress_percentage || 0)
                          setProgressNotes(app.progress_notes || '')
                        }}
                        className="text-xs text-primary-600 font-medium whitespace-nowrap"
                        title="تحديث التقدم"
                      >
                        التقدم
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowDocsModalApp(app)}
                      className="text-xs text-gray-600 font-medium whitespace-nowrap"
                    >
                      المستندات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = (app as any).documents_requested_message || ''
                        setRequestDocsAppId(app.id)
                        setRequestDocsMessage(msg)
                        const existing = requiredDocTypes.filter(d => d.active && msg.includes(d.label_ar)).map(d => d.label_ar)
                        setRequestDocsSelectedTypes(existing)
                      }}
                      className="text-xs text-primary-600 font-medium whitespace-nowrap"
                    >
                      طلب مستندات
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString('ar-TN')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب طلبات الشراء المباشر */}
        {activeTab === 'purchases' && (
          <div className="card rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">طلبات الشراء المباشر</h2>
              <span className="text-sm text-gray-500">{directPurchases.length} طلب</span>
            </div>

            {/* جدول على الشاشات الكبيرة، كروت على الموبايل */}
            <div className="hidden md:block overflow-x-auto -mx-2">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">المشروع</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">المستخدم</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">التاريخ</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {directPurchases.map((purchase) => {
                    const profile = purchase.profiles || {}
                    const project = purchase.projects || {}
                    return (
                      <tr key={purchase.id} className="hover:bg-gray-50/80">
                        <td className="px-3 py-3 text-sm">{project.name || '—'}</td>
                        <td className="px-3 py-3 text-sm">{profile.name || profile.email || '—'}</td>
                        <td className="px-3 py-3">
                          <select
                            value={purchase.status}
                            onChange={(e) => {
                              supabase.from('project_direct_purchases').update({ status: e.target.value }).eq('id', purchase.id).then(({ error }) => {
                                if (error) toast.error('فشل تحديث الحالة')
                                else { toast.success('تم تحديث الحالة'); loadData() }
                              })
                            }}
                            className="input text-sm py-2 w-36"
                          >
                            {Object.entries(PURCHASE_STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-500">
                          {new Date(purchase.created_at).toLocaleDateString('ar-TN')}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowPurchaseDetail(purchase)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPurchaseDocsModal(purchase)}
                              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                            >
                              المستندات
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestPurchaseDocsId(purchase.id)
                                setRequestPurchaseDocsMessage(purchase.documents_note || '')
                                setRequestDocsSelectedTypes([])
                              }}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              طلب مستندات
                            </button>
                            {(purchase.status === 'approved' || purchase.status === 'in_progress') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowProgressModal(purchase)
                                  setProgressStage(purchase.progress_stage || '')
                                  setProgressPercentage(purchase.progress_percentage || 0)
                                  setProgressNotes(purchase.progress_notes || '')
                                }}
                                className="text-xs text-primary-600 font-medium whitespace-nowrap"
                                title="تحديث التقدم"
                              >
                                التقدم
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* كروت للموبايل */}
            <div className="md:hidden space-y-3">
              {directPurchases.map((purchase) => {
                const profile = purchase.profiles || {}
                const project = purchase.projects || {}
                return (
                  <div key={purchase.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{project.name || '—'}</p>
                        <p className="text-sm text-gray-600">{profile.name || profile.email || '—'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        purchase.status === 'approved' ? 'bg-green-100 text-green-800' :
                        purchase.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {PURCHASE_STATUS_LABELS[purchase.status] || purchase.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPurchaseDetail(purchase)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-700 shrink-0"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <select
                        value={purchase.status}
                        onChange={(e) => {
                          supabase.from('project_direct_purchases').update({ status: e.target.value }).eq('id', purchase.id).then(({ error }) => {
                            if (error) toast.error('فشل تحديث الحالة')
                            else { toast.success('تم تحديث الحالة'); loadData() }
                          })
                        }}
                        className="input text-sm py-2 flex-1 min-w-0"
                      >
                        {Object.entries(PURCHASE_STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowPurchaseDocsModal(purchase)}
                        className="text-xs text-gray-600 font-medium whitespace-nowrap"
                      >
                        المستندات
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestPurchaseDocsId(purchase.id)
                          setRequestPurchaseDocsMessage(purchase.documents_note || '')
                          setRequestDocsSelectedTypes([])
                        }}
                        className="text-xs text-primary-600 font-medium whitespace-nowrap"
                      >
                        طلب مستندات
                      </button>
                      {(purchase.status === 'approved' || purchase.status === 'in_progress') && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowProgressModal(purchase)
                            setProgressStage(purchase.progress_stage || '')
                            setProgressPercentage(purchase.progress_percentage || 0)
                            setProgressNotes(purchase.progress_notes || '')
                          }}
                          className="text-xs text-primary-600 font-medium whitespace-nowrap"
                          title="تحديث التقدم"
                        >
                          التقدم
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(purchase.created_at).toLocaleDateString('ar-TN')}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* تبويب المشاريع */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="card rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
                <h2 className="text-lg font-bold text-gray-900">المشاريع</h2>
                <button
                  onClick={() => { setEditingProject(null); setShowProjectForm(true); }}
                  className="btn-primary py-3 px-5 rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مشروع
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => {
                  const timing = getProjectTiming(project)
                  return (
                    <div key={project.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card hover:shadow-soft transition-shadow">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">{project.name}</h3>
                      <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                        <div>{project.governorate}، {project.district}</div>
                        <div>{project.number_of_units} وحدة</div>
                        {project.expected_price && (
                          <div>{Number(project.expected_price).toLocaleString('ar-TN')} د.ت</div>
                        )}
                        {timing.label && (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${timing.isFinished ? 'text-gray-500' : timing.isNotStarted ? 'text-primary-600' : 'text-amber-700'}`}>
                            {timing.isFinished ? <CalendarCheck className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                            {timing.label}
                          </div>
                        )}
                        {project.start_date && (
                          <div className="text-xs text-gray-500">
                            من {new Date(project.start_date).toLocaleDateString('ar-TN')}
                            {project.delivery_date && ` → ${new Date(project.delivery_date).toLocaleDateString('ar-TN')}`}
                          </div>
                        )}
                        {project.completion_percentage > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>الإنجاز</span>
                              <span>{project.completion_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-500 h-2 rounded-full transition-all"
                                style={{ width: `${project.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          timing.isFinished ? 'bg-gray-100 text-gray-700' :
                          project.status === 'ready' ? 'bg-green-100 text-green-800' :
                          project.status === 'study' ? 'bg-primary-100 text-primary-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {timing.isFinished ? 'منتهي' : (PROJECT_STATUS_LABELS[project.status] || project.status)}
                        </span>
                        {project.delivery_date && (
                          <button
                            type="button"
                            onClick={() => { setExtendProject(project); setExtendEndDate(project.delivery_date || '') }}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            title="تمديد المدة"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            تمديد
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingProject(project); setShowProjectForm(true); }}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          تعديل
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {projects.length > 0 && (
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-3">خريطة المشاريع</h3>
                <div className="h-64 sm:h-80 rounded-2xl overflow-hidden">
                  <MapView projects={projects} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* تبويب المستندات المطلوبة */}
        {activeTab === 'documents' && (
          <div className="card rounded-3xl p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">إدارة المستندات المطلوبة</h2>
            <p className="text-sm text-gray-600 mb-4">هذه القائمة تظهر للمتقدمين في صفحة تفاصيل الطلب. يمكنك إضافة أو إخفاء عناصر.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                type="text"
                value={newDocLabel}
                onChange={(e) => setNewDocLabel(e.target.value)}
                placeholder="اسم المستند (مثال: شهادة الضرائب)"
                className="form-input flex-1 min-w-[200px] py-2.5"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('doc-add-btn')?.click()
                  }
                }}
              />
              <button
                id="doc-add-btn"
                type="button"
                disabled={docsLoading || !newDocLabel.trim()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!newDocLabel.trim()) return
                  setDocsLoading(true)
                  supabase.from('required_document_types').insert({
                    label_ar: newDocLabel.trim(),
                    sort_order: requiredDocTypes.length,
                    active: true,
                  }).then(({ error }) => {
                    setDocsLoading(false)
                    if (error) {
                      toast.error(error.message || 'فشل الإضافة')
                      return
                    }
                    toast.success('تمت الإضافة')
                    setNewDocLabel('')
                    loadRequiredDocTypes()
                  })
                }}
                className="btn-primary py-2.5 px-4 disabled:opacity-50"
              >
                {docsLoading ? 'جاري...' : 'إضافة'}
              </button>
            </div>
            <ul className="space-y-2">
              {requiredDocTypes.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className={`text-sm font-medium ${d.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{d.label_ar}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={docsLoading}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDocsLoading(true)
                        supabase.from('required_document_types').update({ active: !d.active }).eq('id', d.id).then(({ error }) => {
                          setDocsLoading(false)
                          if (error) {
                            toast.error(error.message || 'فشل التحديث')
                            return
                          }
                          toast.success(d.active ? 'تم الإخفاء' : 'تم التفعيل')
                          loadRequiredDocTypes()
                        })
                      }}
                      className="text-xs py-1.5 px-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                    >
                      {d.active ? 'إخفاء' : 'تفعيل'}
                    </button>
                    <button
                      type="button"
                      disabled={docsLoading}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!confirm('حذف هذا المستند من القائمة؟')) return
                        setDocsLoading(true)
                        supabase.from('required_document_types').delete().eq('id', d.id).then(({ error }) => {
                          setDocsLoading(false)
                          if (error) {
                            toast.error(error.message || 'فشل الحذف')
                            return
                          }
                          toast.success('تم الحذف')
                          loadRequiredDocTypes()
                        })
                      }}
                      className="text-xs py-1.5 px-2.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50"
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {requiredDocTypes.length === 0 && (
              <p className="text-sm text-gray-500 py-4">لا توجد عناصر. نفّذ سكريبت required_document_types.sql في Supabase ثم حدّث الصفحة.</p>
            )}
          </div>
        )}

        {/* تبويب التقارير — تقارير مفصلة للشركة */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">التقارير والإحصائيات</h2>
              <button onClick={exportReportsCsv} className="btn-primary py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto text-sm">
                <Download className="w-4 h-4" />
                تصدير Excel (CSV)
              </button>
            </div>

            {/* لوحة المؤشرات */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
                <p className="text-xs text-gray-500 mt-0.5">إجمالي الطلبات</p>
              </div>
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">{applications.filter(a => a.status === 'in_progress' || a.status === 'pending').length}</p>
                <p className="text-xs text-gray-500 mt-0.5">قيد المعالجة</p>
              </div>
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{statusStats.documents_requested || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">طلب مستندات</p>
              </div>
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{statusStats.approved || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">مقبول</p>
              </div>
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{statusStats.rejected || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">مرفوض</p>
              </div>
              <div className="card rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{avgScore}</p>
                <p className="text-xs text-gray-500 mt-0.5">متوسط النقاط</p>
              </div>
            </div>

            {/* التوزيع حسب الحالة */}
            <div className="card rounded-3xl p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4">توزيع الطلبات حسب الحالة</h3>
              <div className="space-y-3">
                {Object.entries(APP_STATUS_LABELS).map(([val, label]) => {
                  const count = statusStats[val] || 0
                  const pct = stats.totalApplications ? (count / stats.totalApplications * 100).toFixed(1) : '0'
                  return (
                    <div key={val}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="font-medium text-gray-800">{label}</span>
                        <span className="text-gray-600">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-primary-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* الطلبات خلال 12 شهرًا */}
            <div className="card rounded-3xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h3 className="text-base font-semibold text-gray-900">الطلبات خلال آخر 12 شهراً</h3>
                <span className="text-sm text-gray-500">
                  المجموع: <span className="font-semibold text-gray-800">{monthlyStats.reduce((a, m) => a + m.count, 0)}</span> طلب
                </span>
              </div>
              <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-4">
                <div className="flex items-end justify-between gap-1 sm:gap-2 h-32">
                  {monthlyStats.map((m) => {
                    const max = Math.max(...monthlyStats.map(x => x.count), 1)
                    const barHeightPct = m.count === 0 ? 0 : Math.max((m.count / max) * 100, 12)
                    return (
                      <div key={m.label} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full" title={`${m.label}: ${m.count}`}>
                        {m.count > 0 && (
                          <span className="text-[10px] font-semibold text-gray-700 tabular-nums leading-none">{m.count}</span>
                        )}
                        <div className="w-full flex-1 flex flex-col justify-end min-h-0" style={{ minWidth: '6px' }}>
                          <div
                            className="w-full rounded-t-md bg-primary-500/90 hover:bg-primary-600 transition-colors"
                            style={{ height: `${barHeightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 truncate w-full text-center leading-tight">{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* التوزيع حسب الولاية */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">التوزيع حسب الولاية</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(governorateStats)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([gov, count]) => (
                      <div key={gov} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-800">{gov}</span>
                        <span className="text-gray-600">{count} ({stats.totalApplications ? ((count as number) / stats.totalApplications * 100).toFixed(1) : 0}%)</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* القدرة الشرائية + متوسط الدخل */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">القدرة الشرائية ومتوسط الدخل</h3>
                <div className="mb-4 p-3 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-600">متوسط الدخل الشهري (د.ت)</p>
                  <p className="text-xl font-bold text-gray-900">{avgIncome}</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'دخل منخفض (&lt;500 د.ت)', count: purchasingPowerStats.low, color: 'bg-red-500' },
                    { label: 'دخل متوسط (500-1500 د.ت)', count: purchasingPowerStats.medium, color: 'bg-amber-500' },
                    { label: 'دخل مرتفع (≥1500 د.ت)', count: purchasingPowerStats.high, color: 'bg-green-500' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${stats.totalApplications ? (count / stats.totalApplications * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* نوع السكن المطلوب */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">نوع السكن المطلوب</h3>
                <div className="space-y-2">
                  {Object.entries(housingTypeStats)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-gray-800">{type}</span>
                        <span className="font-medium text-gray-600">{count} ({stats.totalApplications ? ((count / stats.totalApplications) * 100).toFixed(1) : 0}%)</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* المساحة المطلوبة */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">المساحة المطلوبة (م²)</h3>
                <div className="space-y-2">
                  {Object.entries(areaStats)
                    .filter(([k]) => k !== 'غير محدد')
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 8)
                    .map(([area, count]) => (
                      <div key={area} className="flex justify-between text-sm">
                        <span className="text-gray-800">{area}</span>
                        <span className="font-medium text-gray-600">{count}</span>
                      </div>
                    ))}
                  {Object.keys(areaStats).filter(k => k !== 'غير محدد').length === 0 && (
                    <p className="text-sm text-gray-500">لا توجد بيانات</p>
                  )}
                </div>
              </div>

              {/* الحالة الاجتماعية */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">الحالة الاجتماعية</h3>
                <div className="space-y-2">
                  {Object.entries(maritalStats).map(([k, count]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-800">{k}</span>
                      <span className="font-medium text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* الوضعية المهنية */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">الوضعية المهنية</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(employmentStats)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([k, count]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-800">{k}</span>
                        <span className="font-medium text-gray-600">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* طريقة الدفع ومدة التقسيط */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">طريقة الدفع</h3>
                <div className="space-y-2 mb-4">
                  {Object.entries(paymentTypeStats).map(([k, count]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-800">{k}</span>
                      <span className="font-medium text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">مدة التقسيط</h3>
                <div className="space-y-2">
                  {Object.entries(installmentStats).map(([k, count]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-800">{k}</span>
                      <span className="font-medium text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* توزيع الأولويات */}
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">توزيع الأولويات</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { level: 'high', label: 'عالي', count: stats.highPriority, color: 'bg-red-500' },
                    { level: 'medium', label: 'متوسط', count: applications.filter(a => a.priority_level === 'medium').length, color: 'bg-amber-500' },
                    { level: 'normal', label: 'عادي', count: applications.filter(a => a.priority_level === 'normal').length, color: 'bg-gray-500' },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-700">{label}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${stats.totalApplications ? (count / stats.totalApplications * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* نافذة عرض المستندات المرفوعة — قبول / رفض مع سبب — centred for PWA */}
      {showDocsModalApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl p-6" style={{ margin: 'auto' }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">المستندات المرفوعة</h3>
                <p className="text-sm text-gray-600">{showDocsModalApp.first_name} {showDocsModalApp.last_name} — {showDocsModalApp.governorate || '—'}</p>
              </div>
              <button type="button" onClick={() => { setShowDocsModalApp(null); setRejectDocState(null); }} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {showDocsModalApp.documents_requested_message && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900">
                <span className="font-medium">طلب الإدارة: </span>
                <span className="whitespace-pre-wrap">{showDocsModalApp.documents_requested_message}</span>
              </div>
            )}
            {(() => {
              const docs = Array.isArray(showDocsModalApp.applicant_documents) ? showDocsModalApp.applicant_documents : []
              const updateDoc = async (newDocs: any[]) => {
                const { error } = await supabase.from('housing_applications').update({ applicant_documents: newDocs }).eq('id', showDocsModalApp.id)
                if (error) toast.error('فشل التحديث')
                else { setShowDocsModalApp((prev: any) => ({ ...prev, applicant_documents: newDocs })); loadData(); setRejectDocState(null); toast.success('تم التحديث') }
              }
              return (
                <ul className="space-y-3">
                  {docs.length === 0 && <p className="text-sm text-gray-500">لم يرفع المتقدم أي مستندات بعد.</p>}
                  {docs.map((d: any, idx: number) => (
                    <li key={d.id || idx} className="flex flex-wrap items-center justify-between gap-2 py-3 px-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.fileName || d.docType || `مستند ${idx + 1}`}</p>
                        {d.docType && d.docType !== (d.fileName || '') && <p className="text-xs text-gray-500">{d.docType}</p>}
                        {d.rejectionReason && <p className="text-xs text-red-600 mt-1">سبب الرفض: {d.rejectionReason}</p>}
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${d.status === 'accepted' ? 'bg-green-100 text-green-800' : d.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                          {d.status === 'accepted' ? 'مقبول' : d.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ url: d.url, fileName: d.fileName || d.docType || `مستند ${idx + 1}` })}
                          className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
                          title="معاينة"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700" title="فتح في نافذة جديدة">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {rejectDocState?.appId === showDocsModalApp.id && rejectDocState?.docIndex === idx ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={rejectDocState.reason}
                              onChange={(e) => setRejectDocState(prev => prev ? { ...prev, reason: e.target.value } : null)}
                              placeholder="سبب الرفض (يراه المتقدم — ما المطلوب تحديثه)"
                              className="input text-sm w-48"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setRejectDocState(null)} className="text-xs py-1.5 px-2.5 rounded-lg bg-gray-200">إلغاء</button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...docs]
                                  next[idx] = { ...next[idx], status: 'rejected', rejectionReason: rejectDocState.reason?.trim() || 'لم يُحدد' }
                                  updateDoc(next)
                                }}
                                className="text-xs py-1.5 px-2.5 rounded-lg bg-red-100 text-red-700"
                              >
                                تأكيد الرفض
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => { const next = [...docs]; next[idx] = { ...next[idx], status: 'accepted', rejectionReason: undefined }; updateDoc(next) }}
                              className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700"
                              title="قبول المستند"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectDocState({ appId: showDocsModalApp.id, docIndex: idx, reason: '' })}
                              className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1"
                              title="رفض المستند وطلب نسخة أخرى"
                            >
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs hidden sm:inline">رفض</span>
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )
            })()}
          </div>
        </div>
      )}

      {/* نافذة معاينة المستند */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">{previewDoc.fileName}</p>
              <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 ml-2">
                <ExternalLink className="w-4 h-4" />
              </a>
              <button type="button" onClick={() => setPreviewDoc(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
              {/\.(pdf)$/i.test(previewDoc.fileName) ? (
                <iframe src={previewDoc.url} className="w-full h-[70vh] rounded-lg bg-white" title="معاينة المستند" />
              ) : (
                <img src={previewDoc.url} alt="" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض كل تفاصيل الطلب */}
      {showDetailApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailApp(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">تفاصيل الطلب</h3>
              <button type="button" onClick={() => setShowDetailApp(null)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">المعطيات الشخصية</h4>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div><dt className="text-gray-500">الاسم</dt><dd className="font-medium text-gray-900">{showDetailApp.first_name} {showDetailApp.last_name}</dd></div>
                  <div><dt className="text-gray-500">البريد</dt><dd className="font-medium text-gray-900">{showDetailApp.email || '—'}</dd></div>
                  <div><dt className="text-gray-500">رقم البطاقة</dt><dd className="font-medium text-gray-900">{showDetailApp.national_id || '—'}</dd></div>
                  <div><dt className="text-gray-500">تاريخ الولادة</dt><dd className="font-medium text-gray-900">{showDetailApp.date_of_birth ? new Date(showDetailApp.date_of_birth).toLocaleDateString('ar-TN') : '—'}</dd></div>
                  <div><dt className="text-gray-500">الحالة الاجتماعية</dt><dd className="font-medium text-gray-900">{showDetailApp.marital_status || '—'}</dd></div>
                  <div><dt className="text-gray-500">عدد الأطفال</dt><dd className="font-medium text-gray-900">{showDetailApp.number_of_children ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">الولاية</dt><dd className="font-medium text-gray-900">{showDetailApp.governorate || showDetailApp.current_address || '—'}</dd></div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">الوضعية المالية</h4>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div><dt className="text-gray-500">الدخل الشهري (د.ت)</dt><dd className="font-medium text-gray-900">{showDetailApp.net_monthly_income ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">الالتزامات الشهرية (د.ت)</dt><dd className="font-medium text-gray-900">{showDetailApp.total_monthly_obligations ?? showDetailApp.monthly_obligations ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">القدرة على الدفع (د.ت)</dt><dd className="font-medium text-gray-900">{showDetailApp.maximum_budget ?? '—'}</dd></div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">السكن المطلوب</h4>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div><dt className="text-gray-500">المساحة (م²)</dt><dd className="font-medium text-gray-900">{showDetailApp.required_area ?? showDetailApp.housing_area_custom ?? showDetailApp.housing_area ?? '—'}</dd></div>
                  <div><dt className="text-gray-500">نوع السكن</dt><dd className="font-medium text-gray-900">{showDetailApp.desired_housing_type || showDetailApp.housing_type_model || '—'}</dd></div>
                  <div><dt className="text-gray-500">عدد الغرف</dt><dd className="font-medium text-gray-900">{showDetailApp.number_of_rooms ?? '—'}</dd></div>
                  {showDetailApp.skills && <div><dt className="text-gray-500">المهارات</dt><dd className="font-medium text-gray-900">{showDetailApp.skills}</dd></div>}
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">التقييم</h4>
                <dl className="grid grid-cols-1 gap-2 text-sm">
                  <div><dt className="text-gray-500">النقاط</dt><dd className="font-medium text-gray-900">{showDetailApp.application_score ?? 0}</dd></div>
                  <div><dt className="text-gray-500">الأولوية</dt><dd className="font-medium text-gray-900">{PRIORITY_LABELS[showDetailApp.priority_level] || showDetailApp.priority_level || '—'}</dd></div>
                  <div><dt className="text-gray-500">الحالة</dt><dd className="font-medium text-gray-900">{APP_STATUS_LABELS[showDetailApp.status] || showDetailApp.status}</dd></div>
                  <div><dt className="text-gray-500">تاريخ التقديم</dt><dd className="font-medium text-gray-900">{new Date(showDetailApp.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</dd></div>
                </dl>
              </div>
              {showDetailApp.additional_info && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">معلومات إضافية</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{showDetailApp.additional_info}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة طلب مستندات — اختيار مستندات محددة + رسالة */}
      {requestDocsAppId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white rounded-3xl w-full max-w-[32rem] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col" style={{ margin: 'auto' }}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">طلب مستندات إضافية</h3>
                  <p className="text-sm text-gray-600">اختر المستندات المطلوبة أو اكتب رسالة مخصصة</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setRequestDocsAppId(null); setRequestDocsMessage(''); setRequestDocsSelectedTypes([]); setRequestDocsCustomTypes([]); setRequestDocsCustomInput(''); }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Standard Documents */}
              {requiredDocTypes.filter(d => d.active).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h4 className="text-sm font-semibold text-gray-900">المستندات القياسية</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {requiredDocTypes.filter(d => d.active).map((d) => (
                      <label
                        key={d.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          requestDocsSelectedTypes.includes(d.label_ar)
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={requestDocsSelectedTypes.includes(d.label_ar)}
                          onChange={(e) => {
                            if (e.target.checked) setRequestDocsSelectedTypes(prev => [...prev, d.label_ar])
                            else setRequestDocsSelectedTypes(prev => prev.filter(l => l !== d.label_ar))
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                        />
                        <span className={`text-sm font-medium ${
                          requestDocsSelectedTypes.includes(d.label_ar) ? 'text-primary-900' : 'text-gray-700'
                        }`}>
                          {d.label_ar}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Documents */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-indigo-100">
                    <FilePlus className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">مستندات مخصصة</h4>
                    <p className="text-xs text-gray-600">أضف نوع مستند غير موجود في القائمة. تظهر للمتقدم الحالي فقط</p>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={requestDocsCustomInput}
                    onChange={(e) => setRequestDocsCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const t = requestDocsCustomInput.trim()
                        if (t) {
                          setRequestDocsCustomTypes(prev => [...prev, t])
                          setRequestDocsCustomInput('')
                        }
                      }
                    }}
                    className="flex-1 px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="مثال: شهادة عدم ملكية"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = requestDocsCustomInput.trim()
                      if (t) {
                        setRequestDocsCustomTypes(prev => [...prev, t])
                        setRequestDocsCustomInput('')
                      }
                    }}
                    disabled={!requestDocsCustomInput.trim()}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </button>
                </div>
                {requestDocsCustomTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requestDocsCustomTypes.map((label) => (
                      <div
                        key={label}
                        className="inline-flex items-center gap-2 py-2 pl-3 pr-2 rounded-xl bg-white border border-indigo-200 text-sm font-medium text-gray-800 shadow-sm"
                      >
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => setRequestDocsCustomTypes(prev => prev.filter(l => l !== label))}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="إزالة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Message */}
              <div>
                <label className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-semibold text-gray-900">رسالة إضافية</span>
                  <span className="text-xs text-gray-500">(اختياري)</span>
                </label>
                <textarea
                  value={requestDocsMessage}
                  onChange={(e) => setRequestDocsMessage(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none transition-all"
                  placeholder="مثال: يرجى إرسال المستندات عبر صفحة تفاصيل الطلب قبل نهاية الأسبوع."
                  rows={4}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRequestDocsAppId(null)
                  setRequestDocsMessage('')
                  setRequestDocsSelectedTypes([])
                  setRequestDocsCustomTypes([])
                  setRequestDocsCustomInput('')
                }}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const parts: string[] = []
                  const allSelected = [...requestDocsSelectedTypes, ...requestDocsCustomTypes]
                  if (allSelected.length > 0) {
                    parts.push('المطلوب:')
                    allSelected.forEach(l => parts.push('• ' + l))
                  }
                  if (requestDocsMessage.trim()) parts.push(requestDocsMessage.trim())
                  const fullMessage = parts.join('\n\n') || null
                  const { error } = await supabase.from('housing_applications').update({
                    status: 'documents_requested',
                    documents_requested_message: fullMessage,
                  }).eq('id', requestDocsAppId)
                  if (error) toast.error('فشل التحديث')
                  else {
                    toast.success('ستُعرض الرسالة للمتقدم')
                    setRequestDocsAppId(null)
                    setRequestDocsMessage('')
                    setRequestDocsSelectedTypes([])
                    setRequestDocsCustomTypes([])
                    setRequestDocsCustomInput('')
                    loadData()
                  }
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all"
              >
                إرسال للمتقدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Detail Modal */}
      {showPurchaseDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPurchaseDetail(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">تفاصيل طلب الشراء</h3>
              <button onClick={() => setShowPurchaseDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500">المشروع</p>
                <p className="font-medium text-gray-900">{(showPurchaseDetail.projects || {}).name || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">المستخدم</p>
                <p className="font-medium text-gray-900">{(showPurchaseDetail.profiles || {}).name || (showPurchaseDetail.profiles || {}).email || '—'}</p>
              </div>
              {showPurchaseDetail.form_data && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">بيانات النموذج</h4>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    {Object.entries(showPurchaseDetail.form_data).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium text-gray-900">{String(value || '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showPurchaseDetail.admin_notes && (
                <div>
                  <p className="text-sm text-gray-500">ملاحظات الإدارة</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{showPurchaseDetail.admin_notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">تاريخ الطلب</p>
                <p className="text-sm text-gray-700">{new Date(showPurchaseDetail.created_at).toLocaleDateString('ar-TN')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Documents Modal — قبول / رفض مع سبب */}
      {showPurchaseDocsModal && (() => {
        const purchaseDocs = Array.isArray(showPurchaseDocsModal.documents) ? showPurchaseDocsModal.documents : []
        const docsAsObjects = purchaseDocs.map((doc: any) => typeof doc === 'string' ? (() => { try { return JSON.parse(doc) } catch { return { url: doc, fileName: 'مستند' } } })() : doc)
        const updatePurchaseDocs = async (newDocs: any[]) => {
          const payload = newDocs.map(d => (typeof d === 'object' && d !== null ? d : d))
          const { error } = await supabase.from('project_direct_purchases').update({ documents: payload }).eq('id', showPurchaseDocsModal.id)
          if (error) toast.error('فشل التحديث')
          else {
            setShowPurchaseDocsModal((prev: any) => ({ ...prev, documents: payload }))
            loadData()
            setRejectPurchaseDocState(null)
            toast.success('تم التحديث')
          }
        }
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl p-6" style={{ margin: 'auto' }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900">المستندات المرفوعة</h3>
                <button onClick={() => { setShowPurchaseDocsModal(null); setRejectPurchaseDocState(null); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {showPurchaseDocsModal.documents_note && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900">
                  <span className="font-medium">طلب الإدارة: </span>
                  <span className="whitespace-pre-wrap">{showPurchaseDocsModal.documents_note}</span>
                </div>
              )}
              {docsAsObjects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">لم يتم رفع مستندات بعد</p>
              ) : (
                <ul className="space-y-3">
                  {docsAsObjects.map((parsed: any, idx: number) => {
                    const url = parsed.url || parsed.fileUrl || ''
                    const fileName = parsed.fileName || parsed.name || `مستند ${idx + 1}`
                    const status = parsed.status || 'pending_review'
                    const isRejecting = rejectPurchaseDocState?.purchaseId === showPurchaseDocsModal.id && rejectPurchaseDocState?.docIndex === idx
                    return (
                      <li key={idx} className={`flex flex-wrap items-center justify-between gap-2 py-3 px-3 rounded-xl border ${status === 'rejected' ? 'border-red-200 bg-red-50/80' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                          {parsed.docType && <p className="text-xs text-gray-500">{parsed.docType}</p>}
                          {parsed.rejectionReason && <p className="text-xs text-red-600 mt-1">سبب الرفض: {parsed.rejectionReason}</p>}
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${status === 'accepted' ? 'bg-green-100 text-green-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                            {status === 'accepted' ? 'مقبول' : status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button" onClick={() => setPreviewDoc({ url, fileName })} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700" title="معاينة">
                            <ImageIcon className="w-4 h-4" />
                          </button>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700" title="فتح في تبويب جديد">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {isRejecting ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                value={rejectPurchaseDocState?.reason ?? ''}
                                onChange={(e) => setRejectPurchaseDocState(prev => prev ? { ...prev, reason: e.target.value } : null)}
                                placeholder="سبب الرفض (يراه المستخدم — ما المطلوب تحديثه)"
                                className="input text-sm w-48"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setRejectPurchaseDocState(null)} className="text-xs py-1.5 px-2.5 rounded-lg bg-gray-200">إلغاء</button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = docsAsObjects.map((d: any, i: number) => (i === idx ? { ...d, status: 'rejected', rejectionReason: (rejectPurchaseDocState?.reason?.trim() || 'لم يُحدد') } : d))
                                    updatePurchaseDocs(next)
                                  }}
                                  className="text-xs py-1.5 px-2.5 rounded-lg bg-red-100 text-red-700"
                                >
                                  تأكيد الرفض
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button type="button" onClick={() => { const next = docsAsObjects.map((d: any, i: number) => (i === idx ? { ...d, status: 'accepted', rejectionReason: undefined } : d)); updatePurchaseDocs(next) }} className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700" title="قبول المستند">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setRejectPurchaseDocState({ purchaseId: showPurchaseDocsModal.id, docIndex: idx, reason: '' })} className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1" title="رفض المستند وطلب تحديثه">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs hidden sm:inline">رفض</span>
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )
      })()}

      {/* Request Documents for Purchase */}
      {requestPurchaseDocsId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white rounded-3xl w-full max-w-[32rem] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col" style={{ margin: 'auto' }}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">طلب مستندات إضافية</h3>
                  <p className="text-sm text-gray-600">اختر المستندات المطلوبة أو اكتب رسالة مخصصة</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequestPurchaseDocsId(null)
                    setRequestPurchaseDocsMessage('')
                    setRequestDocsSelectedTypes([])
                    setRequestPurchaseDocsCustomTypes([])
                    setRequestPurchaseDocsCustomInput('')
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Standard Documents */}
              {requiredDocTypes.filter(d => d.active).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h4 className="text-sm font-semibold text-gray-900">المستندات القياسية</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {requiredDocTypes.filter(d => d.active).map((d) => (
                      <label
                        key={d.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          requestDocsSelectedTypes.includes(d.label_ar)
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={requestDocsSelectedTypes.includes(d.label_ar)}
                          onChange={(e) => {
                            if (e.target.checked) setRequestDocsSelectedTypes(prev => [...prev, d.label_ar])
                            else setRequestDocsSelectedTypes(prev => prev.filter(l => l !== d.label_ar))
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500/20"
                        />
                        <span className={`text-sm font-medium ${
                          requestDocsSelectedTypes.includes(d.label_ar) ? 'text-primary-900' : 'text-gray-700'
                        }`}>
                          {d.label_ar}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Documents */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-indigo-100">
                    <FilePlus className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">مستندات مخصصة</h4>
                    <p className="text-xs text-gray-600">أضف نوع مستند غير موجود في القائمة. تظهر للمستخدم الحالي فقط</p>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={requestPurchaseDocsCustomInput}
                    onChange={(e) => setRequestPurchaseDocsCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const t = requestPurchaseDocsCustomInput.trim()
                        if (t) {
                          setRequestPurchaseDocsCustomTypes(prev => [...prev, t])
                          setRequestPurchaseDocsCustomInput('')
                        }
                      }
                    }}
                    className="flex-1 px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="مثال: عقد ملكية"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = requestPurchaseDocsCustomInput.trim()
                      if (t) {
                        setRequestPurchaseDocsCustomTypes(prev => [...prev, t])
                        setRequestPurchaseDocsCustomInput('')
                      }
                    }}
                    disabled={!requestPurchaseDocsCustomInput.trim()}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </button>
                </div>
                {requestPurchaseDocsCustomTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {requestPurchaseDocsCustomTypes.map((label) => (
                      <div
                        key={label}
                        className="inline-flex items-center gap-2 py-2 pl-3 pr-2 rounded-xl bg-white border border-indigo-200 text-sm font-medium text-gray-800 shadow-sm"
                      >
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => setRequestPurchaseDocsCustomTypes(prev => prev.filter(l => l !== label))}
                          className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="إزالة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Message */}
              <div>
                <label className="flex items-center gap-2 mb-2.5">
                  <span className="text-sm font-semibold text-gray-900">رسالة إضافية</span>
                  <span className="text-xs text-gray-500">(اختياري)</span>
                </label>
                <textarea
                  value={requestPurchaseDocsMessage}
                  onChange={(e) => setRequestPurchaseDocsMessage(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none transition-all"
                  placeholder="مثال: يرجى إرسال المستندات المطلوبة."
                  rows={4}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRequestPurchaseDocsId(null)
                  setRequestPurchaseDocsMessage('')
                  setRequestDocsSelectedTypes([])
                  setRequestPurchaseDocsCustomTypes([])
                  setRequestPurchaseDocsCustomInput('')
                }}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const parts: string[] = []
                  const allSelected = [...requestDocsSelectedTypes, ...requestPurchaseDocsCustomTypes]
                  if (allSelected.length > 0) {
                    parts.push('المطلوب:')
                    allSelected.forEach(l => parts.push('• ' + l))
                  }
                  if (requestPurchaseDocsMessage.trim()) parts.push(requestPurchaseDocsMessage.trim())
                  const fullMessage = parts.join('\n\n') || null
                  const { error } = await supabase.from('project_direct_purchases').update({
                    status: 'documents_requested',
                    documents_note: fullMessage,
                  }).eq('id', requestPurchaseDocsId)
                  if (error) toast.error('فشل التحديث')
                  else {
                    toast.success('ستُعرض الرسالة للمستخدم')
                    setRequestPurchaseDocsId(null)
                    setRequestPurchaseDocsMessage('')
                    setRequestDocsSelectedTypes([])
                    setRequestPurchaseDocsCustomTypes([])
                    setRequestPurchaseDocsCustomInput('')
                    loadData()
                  }
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all"
              >
                إرسال للمستخدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Modal for Applications */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white rounded-3xl w-full max-w-[28rem] max-h-[90vh] overflow-y-auto p-6 shadow-xl" style={{ margin: 'auto' }}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">تحديث التقدم</h3>
              <button onClick={() => { setShowProgressModal(null); setProgressStage(''); setProgressPercentage(0); setProgressNotes(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">المرحلة</label>
                <select
                  value={progressStage}
                  onChange={(e) => setProgressStage(e.target.value)}
                  className="input w-full"
                >
                  <option value="">اختر المرحلة</option>
                  {PROGRESS_STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">نسبة الإنجاز (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(parseInt(e.target.value) || 0)}
                  className="input w-full"
                />
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">ملاحظات (يراها المتقدم)</label>
                <textarea
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="input w-full min-h-[80px]"
                  placeholder="مثال: تم الانتهاء من المرحلة الأولى..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowProgressModal(null); setProgressStage(''); setProgressPercentage(0); setProgressNotes(''); }}
                  className="btn-secondary flex-1"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const isPurchase = showProgressModal && 'project_id' in showProgressModal
                    const payload = {
                      progress_stage: progressStage || null,
                      progress_percentage: progressPercentage,
                      progress_notes: progressNotes.trim() || null,
                      progress_updated_at: new Date().toISOString(),
                    }
                    const { error } = isPurchase
                      ? await supabase.from('project_direct_purchases').update(payload).eq('id', showProgressModal.id)
                      : await supabase.from('housing_applications').update(payload).eq('id', showProgressModal.id)
                    if (error) toast.error('فشل التحديث')
                    else {
                      toast.success('تم تحديث التقدم')
                      setShowProgressModal(null)
                      setProgressStage('')
                      setProgressPercentage(0)
                      setProgressNotes('')
                      loadData()
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* تمديد مدة المشروع */}
      {extendProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white rounded-3xl w-full max-w-[28rem] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">تمديد مدة المشروع</h3>
            <p className="text-sm text-gray-600 mb-4">{extendProject.name}</p>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">تاريخ الانتهاء الجديد</label>
            <input
              type="date"
              value={extendEndDate}
              onChange={(e) => setExtendEndDate(e.target.value)}
              className="input w-full mb-4"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setExtendProject(null); setExtendEndDate(''); }} className="btn-secondary flex-1">إلغاء</button>
              <button
                type="button"
                onClick={async () => {
                  if (!extendEndDate) { toast.error('اختر تاريخاً'); return }
                  const { error } = await supabase.from('projects').update({ delivery_date: extendEndDate }).eq('id', extendProject.id)
                  if (error) toast.error('فشل التحديث')
                  else {
                    toast.success('تم تمديد المدة')
                    setExtendProject(null)
                    setExtendEndDate('')
                    loadData()
                  }
                }}
                className="btn-primary flex-1"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
