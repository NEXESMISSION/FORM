'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Building2, X, Search, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'
import DirectPurchaseForm from '@/components/DirectPurchaseForm'

// Simplified filter: one dropdown. "construction" groups 90/180/365.
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'كل المشاريع' },
  { value: 'study', label: 'قيد الدراسة' },
  { value: 'construction', label: 'قيد البناء' },
  { value: 'ready', label: 'جاهز للبيع' },
]

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [purchaseModalProject, setPurchaseModalProject] = useState<any>(null)

  useEffect(() => {
    loadProjects()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [statusFilter])

  const loadProjects = async () => {
    setLoading(true)
    try {
      let query = supabase.from('projects').select('*')
      if (statusFilter === 'construction') {
        query = query.in('status', ['construction_90', 'construction_180', 'construction_365'])
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch {
      toast.error('فشل تحميل المشاريع')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = searchQuery.trim()
    ? projects.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (p.governorate || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          (p.district || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : projects

  const openPurchaseModal = (proj: any) => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }
    setPurchaseModalProject(proj)
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      study: 'قيد الدراسة',
      construction_90: 'بناء 90 يوم',
      construction_180: 'بناء 180 يوم',
      construction_365: 'بناء سنة',
      ready: 'جاهز للبيع',
    }
    return map[status] || status
  }
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      study: 'bg-primary-100 text-primary-800',
      construction_90: 'bg-amber-100 text-amber-800',
      construction_180: 'bg-orange-100 text-orange-800',
      construction_365: 'bg-purple-100 text-purple-800',
      ready: 'bg-emerald-100 text-emerald-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getProjectTiming = (p: any) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = p.delivery_date ? new Date(p.delivery_date) : null
    if (!end) return null
    end.setHours(0, 0, 0, 0)
    const start = p.start_date ? new Date(p.start_date) : null
    if (start) start.setHours(0, 0, 0, 0)
    const t = today.getTime()
    const e = end.getTime()
    const s = start ? start.getTime() : null
    if (t > e) return 'منتهي'
    if (s != null && t < s) {
      const days = Math.ceil((s - t) / (24 * 60 * 60 * 1000))
      return `يبدأ بعد ${days} يوم`
    }
    const days = Math.ceil((e - t) / (24 * 60 * 60 * 1000))
    return `متبقي ${days} يوم`
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-center">
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} />
        </div>
      </header>

      <div className="max-w-[28rem] mx-auto px-4 py-6 pb-32">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-1">شراء مباشر</h1>
          <p className="text-gray-500 text-sm">تصفح المشاريع واطلب الشراء مباشرة</p>
        </div>

        {/* Filter: dropdown + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الولاية..."
              className="form-input pr-10 text-sm py-2.5"
            />
          </div>
          <div className="relative min-w-[10rem]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input appearance-none pl-4 pr-10 py-2.5 text-sm bg-white w-full"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" aria-hidden />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner w-8 h-8" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card rounded-3xl text-center py-12">
            <Building2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card rounded-2xl flex gap-4 p-0 overflow-hidden active:scale-[0.99]"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-gray-100 relative overflow-hidden">
                  {project.thumbnail_url ? (
                    <Image
                      src={project.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-4 pe-4 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{project.governorate}، {project.district}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getProjectTiming(project) === 'منتهي' ? 'منتهي' : getStatusLabel(project.status)}
                    </span>
                    {getProjectTiming(project) && (
                      <span className="text-xs text-gray-600">{getProjectTiming(project)}</span>
                    )}
                    {project.expected_price && (
                      <span className="text-sm font-medium text-primary-600">
                        {Number(project.expected_price).toLocaleString()} د.ت
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center pe-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      openPurchaseModal(project)
                    }}
                    disabled={!user}
                    className="action-circle-btn disabled:opacity-50"
                    title="طلب شراء"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* Modal طلب شراء — centred for PWA */}
      {purchaseModalProject && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slide-up pb-28" style={{ margin: 'auto' }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">طلب شراء</h2>
                <p className="text-sm text-gray-500 mt-0.5">{purchaseModalProject.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setPurchaseModalProject(null)} 
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors" 
                aria-label="إغلاق"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 pb-32">
              <DirectPurchaseForm
                project={purchaseModalProject}
                userId={user.id}
                onSuccess={() => setPurchaseModalProject(null)}
                onCancel={() => setPurchaseModalProject(null)}
              />
            </div>
          </div>
        </div>
      )}
      {user && <BottomNav />}
    </div>
  )
}
