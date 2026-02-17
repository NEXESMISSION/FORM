'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Building2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'
import DirectPurchaseForm from '@/components/DirectPurchaseForm'

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'كل المشاريع' },
  { key: 'study', label: 'قيد الدراسة' },
  { key: 'construction_90', label: 'بناء 90 يوم' },
  { key: 'construction_180', label: 'بناء 180 يوم' },
  { key: 'construction_365', label: 'بناء سنة' },
  { key: 'ready', label: 'جاهز للبيع' },
]

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [purchaseModalProject, setPurchaseModalProject] = useState<any>(null)

  useEffect(() => {
    loadProjects()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [filter])

  const loadProjects = async () => {
    try {
      let query = supabase.from('projects').select('*')
      if (filter !== 'all') query = query.eq('status', filter)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setProjects(data || [])
    } catch {
      toast.error('فشل تحميل المشاريع')
    } finally {
      setLoading(false)
    }
  }

  const openPurchaseModal = (proj: any) => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }
    setPurchaseModalProject(proj)
  }

  const getStatusLabel = (status: string) => FILTERS.find(f => f.key === status)?.label || status
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      study: 'bg-blue-100 text-blue-800',
      construction_90: 'bg-amber-100 text-amber-800',
      construction_180: 'bg-orange-100 text-orange-800',
      construction_365: 'bg-purple-100 text-purple-800',
      ready: 'bg-primary-100 text-primary-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-center">
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} />
        </div>
      </header>

      <div className="max-w-[28rem] mx-auto px-4 py-6 pb-32">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">شراء مباشر</h1>
          <p className="text-gray-500 text-sm">تصفح المشاريع واطلب الشراء مباشرة</p>
        </div>

        {/* Horizontal scrollable pill filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 -mx-4 px-4">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`pill shrink-0 ${filter === key ? 'pill-active' : 'pill-inactive'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner w-8 h-8" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card rounded-3xl text-center py-12">
            <Building2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد مشاريع</p>
          </div>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card rounded-2xl flex items-center gap-4 p-4 active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{project.governorate}، {project.district}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                    {project.expected_price && (
                      <span className="text-sm font-medium text-primary-600">
                        {Number(project.expected_price).toLocaleString()} د.ت
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    openPurchaseModal(project)
                  }}
                  disabled={!user}
                  className="action-circle-btn shrink-0 disabled:opacity-50"
                  title="طلب شراء"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* Modal طلب شراء */}
      {purchaseModalProject && user && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setPurchaseModalProject(null)}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up pb-28" onClick={(e) => e.stopPropagation()}>
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
