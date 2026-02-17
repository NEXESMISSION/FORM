'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { BarChart3, Users, Home, LogOut, Plus, Download, Edit, X } from 'lucide-react'
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

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'applications' | 'projects' | 'reports'>('applications')
  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [requestDocsAppId, setRequestDocsAppId] = useState<string | null>(null)
  const [requestDocsMessage, setRequestDocsMessage] = useState('')
  const [filters, setFilters] = useState({
    governorate: '',
    priority: '',
    status: '',
    incomeRange: '',
    bank: '',
  })

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
    } catch {
      toast.error('فشل تحميل البيانات')
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

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] sm:max-w-2xl md:max-w-4xl mx-auto px-4 h-20 flex justify-between items-center">
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 text-sm font-medium hover:text-gray-900 py-2"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </header>

      <div className="max-w-[28rem] sm:max-w-2xl md:max-w-4xl mx-auto px-4 py-6 pb-10">
        {/* إحصائيات */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="card rounded-2xl p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
            <p className="text-sm text-gray-600">الطلبات</p>
          </div>
          <div className="card rounded-2xl p-4">
            <p className="text-2xl font-bold text-red-600">{stats.highPriority}</p>
            <p className="text-sm text-gray-600">أولوية عالية</p>
          </div>
          <div className="card rounded-2xl p-4">
            <p className="text-2xl font-bold text-primary-600">{stats.totalProjects}</p>
            <p className="text-sm text-gray-600">المشاريع</p>
          </div>
        </div>

        {/* تبويبات */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {[
            { id: 'applications', label: 'الطلبات', icon: Users },
            { id: 'projects', label: 'المشاريع', icon: Home },
            { id: 'reports', label: 'التقارير', icon: BarChart3 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`pill shrink-0 flex items-center gap-2 ${activeTab === id ? 'pill-active' : 'pill-inactive'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* تبويب الطلبات */}
        {activeTab === 'applications' && (
          <div className="card rounded-3xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">طلبات السكن</h2>
              <span className="text-sm text-gray-500">{filteredApplications.length} طلب</span>
            </div>

            {/* فلاتر — متجاوبة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-5">
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
                          <select
                            value={app.status}
                            onChange={(e) => updateAppStatus(app.id, e.target.value)}
                            className="input text-sm py-2 w-36"
                          >
                            {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { setRequestDocsAppId(app.id); setRequestDocsMessage((app as any).documents_requested_message || ''); }}
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
                    <select
                      value={app.status}
                      onChange={(e) => updateAppStatus(app.id, e.target.value)}
                      className="input text-sm py-2 flex-1 min-w-0"
                    >
                      {Object.entries(APP_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setRequestDocsAppId(app.id); setRequestDocsMessage((app as any).documents_requested_message || ''); }}
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
                {projects.map((project) => (
                  <div key={project.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card hover:shadow-soft transition-shadow">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">{project.name}</h3>
                    <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                      <div>{project.governorate}، {project.district}</div>
                      <div>{project.number_of_units} وحدة</div>
                      {project.expected_price && (
                        <div>{Number(project.expected_price).toLocaleString('ar-TN')} د.ت</div>
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
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        project.status === 'ready' ? 'bg-green-100 text-green-800' :
                        project.status === 'study' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {PROJECT_STATUS_LABELS[project.status] || project.status}
                      </span>
                      <button
                        onClick={() => { setEditingProject(project); setShowProjectForm(true); }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        تعديل
                      </button>
                    </div>
                  </div>
                ))}
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

        {/* تبويب التقارير */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="card rounded-3xl p-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
                <h2 className="text-lg font-bold text-gray-900">تقرير الطلب الشهري حسب الجهة</h2>
                <button className="btn-secondary py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto text-sm">
                  <Download className="w-4 h-4" />
                  تصدير PDF
                </button>
              </div>
              <div className="space-y-4">
                {Object.entries(governorateStats)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([gov, count]) => (
                    <div key={gov}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="font-medium text-gray-800">{gov}</span>
                        <span className="text-gray-600">{count} طلب ({stats.totalApplications ? ((count as number) / stats.totalApplications * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-primary-500 h-3 rounded-full transition-all"
                          style={{ width: `${stats.totalApplications ? (count as number) / stats.totalApplications * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">تقرير القدرة الشرائية</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">دخل منخفض (&lt;500 د.ت)</span>
                      <span className="font-semibold">{purchasingPowerStats.low}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-red-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? purchasingPowerStats.low / stats.totalApplications * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">دخل متوسط (500-1500 د.ت)</span>
                      <span className="font-semibold">{purchasingPowerStats.medium}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? purchasingPowerStats.medium / stats.totalApplications * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">دخل مرتفع (≥1500 د.ت)</span>
                      <span className="font-semibold">{purchasingPowerStats.high}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-green-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? purchasingPowerStats.high / stats.totalApplications * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card rounded-3xl p-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">تقرير نوع السكن</h3>
                <div className="space-y-4">
                  {Object.entries(housingTypeStats).map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="text-gray-700">{type}</span>
                        <span className="font-semibold">{count} ({stats.totalApplications ? ((count / stats.totalApplications) * 100).toFixed(1) : 0}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-primary-500 h-2.5 rounded-full"
                          style={{ width: `${stats.totalApplications ? (count / stats.totalApplications) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card rounded-3xl p-5 lg:col-span-2">
                <h3 className="text-base font-semibold text-gray-900 mb-4">توزيع الأولويات</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">أولوية عالية</span>
                      <span className="font-semibold">{stats.highPriority}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-red-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? stats.highPriority / stats.totalApplications * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">أولوية متوسطة</span>
                      <span className="font-semibold">{applications.filter(a => a.priority_level === 'medium').length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? (applications.filter(a => a.priority_level === 'medium').length / stats.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="text-gray-700">أولوية عادية</span>
                      <span className="font-semibold">{applications.filter(a => a.priority_level === 'normal').length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gray-500 h-2.5 rounded-full"
                        style={{ width: `${stats.totalApplications ? (applications.filter(a => a.priority_level === 'normal').length / stats.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* نافذة طلب مستندات */}
      {requestDocsAppId && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setRequestDocsAppId(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-[28rem] sm:max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">طلب مستندات إضافية</h3>
            <p className="text-sm text-gray-600 mb-3">ستُعرض هذه الرسالة للمتقدم. اذكر المستندات المطلوبة وكيفية إرسالها.</p>
            <textarea
              value={requestDocsMessage}
              onChange={(e) => setRequestDocsMessage(e.target.value)}
              className="input w-full mb-4 min-h-[100px]"
              placeholder="مثال: يرجى إرسال: 1) نسخة البطاقة 2) شهادة الدخل. يمكن الإرسال عبر..."
              rows={4}
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRequestDocsAppId(null); setRequestDocsMessage(''); }} className="btn-secondary flex-1">إلغاء</button>
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.from('housing_applications').update({
                    status: 'documents_requested',
                    documents_requested_message: requestDocsMessage.trim() || null,
                  }).eq('id', requestDocsAppId)
                  if (error) toast.error('فشل التحديث')
                  else {
                    toast.success('ستُعرض الرسالة للمتقدم')
                    setRequestDocsAppId(null)
                    setRequestDocsMessage('')
                    loadData()
                  }
                }}
                className="btn-primary flex-1"
              >
                إرسال للمتقدم
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
