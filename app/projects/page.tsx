'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Search, ChevronDown, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'

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
  const [profile, setProfile] = useState<{ role: string } | null>(null)

  useEffect(() => {
    loadProjects()
  }, [statusFilter])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data || null))
      } else {
        setProfile(null)
      }
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('domobat_show_welcome') === '1') {
      sessionStorage.removeItem('domobat_show_welcome')
      toast.success('مرحباً بك! اختر مشروعاً لبدء طلبك.')
    }
  }, [])

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

  // Group by city (governorate), keep order stable
  const projectsByCity = filteredProjects.reduce<Record<string, typeof filteredProjects>>((acc, p) => {
    const city = (p.governorate || '').trim() || 'أخرى'
    if (!acc[city]) acc[city] = []
    acc[city].push(p)
    return acc
  }, {})
  const cityOrder = [...new Set(filteredProjects.map((p) => (p.governorate || '').trim() || 'أخرى'))]

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

  const LAYOUT_MAX = 'max-w-[28rem] mx-auto px-4 sm:px-5'

  return (
    <div className="min-h-screen bg-gold-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gold-50/95 border-b-2 border-gold-300 safe-top">
        <div className={`${LAYOUT_MAX} w-full min-h-[8rem] flex items-center justify-between py-1.5`}>
          <div className="w-12" />
          <Image src="/logo.png" alt="DOMOBAT" width={200} height={200} className="rounded-2xl object-contain shrink-0 w-36 h-36 sm:w-40 sm:h-40 max-h-[8rem]" priority />
          {profile?.role === 'admin' ? (
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gold-400 bg-white text-gold-900 text-sm font-medium hover:bg-gold-50 hover:border-gold-500 transition-colors"
              aria-label="لوحة الإدارة"
            >
              <Settings className="w-4 h-4" />
              الإدارة
            </Link>
          ) : <div className="w-10" />}
        </div>
      </header>

      <main className={`${LAYOUT_MAX} flex-1 w-full pt-6 pb-28`}>
        <section className="mb-6 text-center sm:text-right">
          <h1 className="text-lg font-bold text-gold-950">المشاريع</h1>
          <p className="text-gold-900 text-sm mt-0.5">تصفح واحجز وحدة في مشاريع السكن الاقتصادي</p>
        </section>

        <section className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث (اسم، ولاية)..."
              className="w-full pl-4 pr-10 py-2.5 text-sm bg-white border-2 border-gold-200 rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 outline-none transition placeholder:text-gold-400 text-gold-950"
            />
          </div>
          <div className="relative sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-4 pr-9 py-2.5 text-sm bg-white border-2 border-gold-200 rounded-xl appearance-none focus:border-gold-500 focus:ring-2 focus:ring-gold-400/30 outline-none transition text-gold-900"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-500 pointer-events-none" aria-hidden />
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner w-8 h-8 text-gold-600" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <section className="bg-white rounded-2xl border-2 border-gold-200 shadow-md p-10 text-center">
            <Building2 className="w-12 h-12 text-gold-300 mx-auto mb-3" />
            <p className="text-gold-800 text-sm">{searchQuery.trim() ? 'لا توجد نتائج' : 'لا توجد مشاريع حالياً'}</p>
          </section>
        ) : (
          <div className="space-y-8 pb-4" dir="rtl">
            {cityOrder.filter((city) => projectsByCity[city]?.length).map((city) => (
              <section key={city}>
                <h2 className="text-base font-bold text-gold-950 mb-3 text-right">{city}</h2>
                <div
                  className="overflow-x-auto overflow-y-hidden -mx-4 px-4"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="flex gap-4 pb-2" style={{ direction: 'rtl' }}>
                    {projectsByCity[city].map((project, index) => (
                      <div
                        key={project.id}
                        className="flex-none w-[85%] max-w-[18rem] bg-white rounded-2xl border-2 border-gold-200 overflow-hidden shadow-md hover:shadow-lg hover:border-gold-300 transition-all"
                      >
                        <Link href={`/projects/${project.id}`} className="block">
                          <div className="aspect-[21/10] bg-gold-100 relative overflow-hidden rounded-t-2xl">
                            {(() => {
                              const imgUrl = project.thumbnail_url || (Array.isArray(project.image_urls) && project.image_urls.length > 0 ? project.image_urls[0] : null)
                              return imgUrl ? (
                                <Image
                                  src={imgUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="18rem"
                                  priority={index === 0 && city === cityOrder[0]}
                                  unoptimized={imgUrl?.includes('media.prefabex.com')}
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Building2 className="w-12 h-12 text-gold-300" />
                                </div>
                              )
                            })()}
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-gold-950 line-clamp-2 text-sm">{project.name}</h3>
                            <p className="text-xs text-gold-700 mt-0.5">{project.district || ''}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(project.status)}`}>
                                {getProjectTiming(project) === 'منتهي' ? 'منتهي' : getStatusLabel(project.status)}
                              </span>
                              {getProjectTiming(project) && getProjectTiming(project) !== 'منتهي' && (
                                <span className="text-xs text-gold-600">{getProjectTiming(project)}</span>
                              )}
                              {project.expected_price && (
                                <span className="text-xs font-semibold text-gold-700">
                                  {Number(project.expected_price).toLocaleString()} د.ت
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                        <div className="px-3 pb-3">
                          <Link
                            href={`/projects/${project.id}`}
                            className="block w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-b from-gold-400 to-gold-600 text-white text-center shadow-md hover:from-gold-500 hover:to-gold-700 hover:shadow-lg active:scale-[0.99] transition-all"
                          >
                            احجز
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      {user && <BottomNav />}
    </div>
  )
}
