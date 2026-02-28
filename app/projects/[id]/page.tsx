'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Home, Calendar, Download, X, ChevronRight } from 'lucide-react'

/** Extract YouTube video ID from URL or return as-is if already an ID */
function youtubeVideoId(urlOrId: string): string | null {
  const s = (urlOrId || '').trim()
  if (!s) return null
  const match = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : (s.length <= 20 ? s : null)
}
import toast from 'react-hot-toast'
import MapView from '@/components/MapView'
import BottomNav from '@/components/BottomNav'
import DirectPurchaseForm from '@/components/DirectPurchaseForm'

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    study: 'قيد الدراسة',
    construction_90: 'بناء (90 يوم)',
    construction_180: 'بناء (180 يوم)',
    construction_365: 'بناء (سنة)',
    ready: 'جاهز للبيع',
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    study: 'bg-primary-100 text-primary-800',
    construction_90: 'bg-amber-100 text-amber-800',
    construction_180: 'bg-orange-100 text-orange-800',
    construction_365: 'bg-purple-100 text-purple-800',
    ready: 'bg-primary-100 text-primary-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getProjectTiming(project: any) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = project.start_date ? new Date(project.start_date) : null
  const end = project.delivery_date ? new Date(project.delivery_date) : null
  if (!end) return null
  end.setHours(0, 0, 0, 0)
  if (start) start.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()
  const endTime = end.getTime()
  const startTime = start ? start.getTime() : null
  if (todayTime > endTime) return { label: 'منتهي', isFinished: true }
  if (startTime != null && todayTime < startTime) {
    const days = Math.ceil((startTime - todayTime) / (24 * 60 * 60 * 1000))
    return { label: `يبدأ بعد ${days} يوم`, isFinished: false }
  }
  const days = Math.ceil((endTime - todayTime) / (24 * 60 * 60 * 1000))
  return { label: `متبقي ${days} يوم`, isFinished: false }
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadProject()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [params.id])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setProject(data)
    } catch {
      toast.error('فشل تحميل المشروع')
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }

  const openPurchaseModal = () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      router.push('/auth/login')
      return
    }
    setShowPurchaseModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 min-h-[8rem] flex items-center justify-between py-1.5">
          <Link href="/projects" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium">
            <ChevronRight className="w-5 h-5" />
            المشاريع
          </Link>
          <Image src="/logo.png" alt="DOMOBAT" width={200} height={200} className="rounded-2xl object-contain shrink-0 w-36 h-36 sm:w-40 sm:h-40 max-h-[8rem]" priority />
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto">
        {/* Image slider — horizontal swipe + dots */}
        {(() => {
          const urls = Array.isArray(project.image_urls) && project.image_urls.length > 0
            ? project.image_urls
            : (project.thumbnail_url ? [project.thumbnail_url] : [])
          if (urls.length === 0) {
            return (
              <section className="aspect-[3/2] max-h-72 bg-gray-200 flex items-center justify-center mx-4">
                <Home className="w-12 h-12 text-gray-400" />
              </section>
            )
          }
          return (
            <section className="relative">
              <div
                ref={sliderRef}
                className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex mx-0 scroll-smooth"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onScroll={() => {
                  const el = sliderRef.current
                  if (!el || urls.length <= 1) return
                  const w = el.offsetWidth
                  const idx = Math.round(el.scrollLeft / w)
                  setImageIndex(Math.min(idx, urls.length - 1))
                }}
              >
                {urls.map((src: string, i: number) => (
                  <div
                    key={i}
                    className="relative aspect-[3/2] max-h-72 bg-gray-100 overflow-hidden shrink-0 w-full snap-center snap-always"
                  >
                    <Image
                      src={src}
                      alt={`${project.name} ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 28rem) 100vw, 28rem"
                      priority={i === 0}
                      unoptimized={src?.includes('media.prefabex.com')}
                    />
                  </div>
                ))}
              </div>
              {urls.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {urls.map((_: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`صورة ${i + 1}`}
                      className={`w-2 h-2 rounded-full transition-all pointer-events-auto ${
                        i === imageIndex ? 'bg-white scale-125 shadow' : 'bg-white/60'
                      }`}
                      onClick={() => {
                        const el = sliderRef.current
                        if (el) {
                          const w = el.offsetWidth
                          el.scrollTo({ left: i * w, behavior: 'smooth' })
                          setImageIndex(i)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })()}

        {/* Title and info below images */}
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(project.status)}`}>
              {getProjectTiming(project)?.isFinished ? 'منتهي' : getStatusLabel(project.status)}
            </span>
            {getProjectTiming(project)?.label && getProjectTiming(project)?.label !== 'منتهي' && (
              <span className="text-xs text-gray-500">{getProjectTiming(project)!.label}</span>
            )}
          </div>
          {project.expected_price && (
            <p className="text-primary-600 font-semibold mt-2">{Number(project.expected_price).toLocaleString()} د.ت</p>
          )}
        </div>

        <div className="px-4 pt-4 space-y-5" style={{ paddingBottom: 'calc(12rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Description & info */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5">
            {project.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{project.description}</p>
            )}
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-700 text-sm">
                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                <span>{project.governorate}، {project.district}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 text-sm">
                <Home className="w-4 h-4 text-primary-500 shrink-0" />
                <span>{project.number_of_units} وحدة</span>
              </li>
              {project.delivery_date && (
                <li className="flex items-center gap-3 text-gray-700 text-sm">
                  <Calendar className="w-4 h-4 text-primary-500 shrink-0" />
                  <span>التسليم: {new Date(project.delivery_date).toLocaleDateString('ar-TN')}</span>
                </li>
              )}
            </ul>
            {project.completion_percentage > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">الإنجاز</span>
                  <span className="font-semibold text-gray-900">{project.completion_percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${project.completion_percentage}%` }}
                  />
                </div>
              </div>
            )}
            {project.study_pdf_url && (
              <a
                href={project.study_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Download className="w-4 h-4" />
                تحميل دراسة المشروع (PDF)
              </a>
            )}
          </section>

          {/* Map */}
          {(project.location_lat && project.location_lng) && (
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h2 className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">موقع المشروع</h2>
              <div className="h-48">
                <MapView lat={project.location_lat} lng={project.location_lng} />
              </div>
            </section>
          )}

          {/* YouTube videos */}
          {Array.isArray(project.video_urls) && project.video_urls.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h2 className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">فيديوهات المشروع</h2>
              <div className="p-4 space-y-4">
                {project.video_urls.map((urlOrId: string, i: number) => {
                  const id = youtubeVideoId(urlOrId)
                  if (!id) return null
                  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`
                  return (
                    <div key={i} className="aspect-video overflow-hidden bg-gray-100">
                      <iframe
                        src={embedUrl}
                        title={`فيديو ${i + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Floating احجز — no background bar; hidden when purchase popup is open */}
      {!showPurchaseModal && (
        <div
          className="fixed left-0 right-0 z-[60] max-w-[28rem] mx-auto px-4 pointer-events-none"
          style={{
            bottom: user
              ? 'calc(7rem + env(safe-area-inset-bottom, 0px))'
              : 'max(1rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="pointer-events-auto">
            {user ? (
              <button
                onClick={openPurchaseModal}
                className="w-full py-3.5 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition-colors"
              >
                احجز
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="block w-full py-3.5 rounded-xl font-semibold bg-primary-600 text-white hover:bg-primary-700 text-center shadow-lg transition-colors"
              >
                تسجيل الدخول للاحتيار
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Modal طلب شراء — centred for PWA */}
      {showPurchaseModal && project && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-slide-up pb-28" style={{ margin: 'auto' }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">طلب شراء</h2>
                <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPurchaseModal(false)} 
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors" 
                aria-label="إغلاق"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 pb-32">
              <DirectPurchaseForm
                project={project}
                userId={user.id}
                onSuccess={() => setShowPurchaseModal(false)}
                onCancel={() => setShowPurchaseModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      {user && <BottomNav />}
    </div>
  )
}
