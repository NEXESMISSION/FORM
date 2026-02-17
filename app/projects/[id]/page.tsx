'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Home, Calendar, Download, ShoppingCart, X } from 'lucide-react'
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
    study: 'bg-blue-100 text-blue-800',
    construction_90: 'bg-amber-100 text-amber-800',
    construction_180: 'bg-orange-100 text-orange-800',
    construction_365: 'bg-purple-100 text-purple-800',
    ready: 'bg-primary-100 text-primary-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

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
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-center">
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} />
        </div>
      </header>

      <div className="max-w-[28rem] mx-auto px-4 py-6 pb-32">
        {/* Hero-style card (like Total balance) */}
        <div className="card-gradient mb-6">
          <h1 className="text-xl font-bold text-white mb-2">{project.name}</h1>
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
            {getStatusLabel(project.status)}
          </span>
          {project.expected_price && (
            <p className="text-white/90 text-lg font-semibold mt-3">
              {Number(project.expected_price).toLocaleString()} د.ت
            </p>
          )}
        </div>

        <div className="card rounded-3xl p-5 mb-6">
          {project.description && (
            <p className="text-gray-600 text-sm mb-5">{project.description}</p>
          )}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-primary-600 shrink-0" />
              <span>{project.governorate}، {project.district}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Home className="w-5 h-5 text-primary-600 shrink-0" />
              <span>{project.number_of_units} وحدة</span>
            </div>
            {project.delivery_date && (
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-primary-600 shrink-0" />
                <span>التسليم: {new Date(project.delivery_date).toLocaleDateString('ar-TN')}</span>
              </div>
            )}
          </div>

          {project.completion_percentage > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">الإنجاز</span>
                <span className="font-semibold">{project.completion_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all"
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
              className="btn-secondary rounded-2xl mt-5 inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              تحميل دراسة المشروع (PDF)
            </a>
          )}
        </div>

        {(project.location_lat && project.location_lng) && (
          <div className="card rounded-3xl p-5 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">موقع المشروع</h2>
            <div className="h-52 rounded-2xl overflow-hidden">
              <MapView lat={project.location_lat} lng={project.location_lng} />
            </div>
          </div>
        )}

        <div className="card rounded-3xl p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-2">شراء مباشر</h2>
          <p className="text-gray-500 text-sm mb-5">
            طلب شراء هذا المشروع مباشرة. سنتواصل معك لتأكيد الطلب والشروط.
          </p>
          {user ? (
            <button
              onClick={openPurchaseModal}
              className="btn-primary w-full py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2 font-semibold"
            >
              <ShoppingCart className="w-5 h-5" />
              طلب شراء
            </button>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-500 text-sm mb-4">يرجى تسجيل الدخول لطلب الشراء</p>
              <Link href="/auth/login" className="btn-primary w-full block text-center py-4 rounded-2xl shadow-soft font-semibold">
                تسجيل الدخول
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Modal طلب شراء */}
      {showPurchaseModal && project && user && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up pb-28" onClick={(e) => e.stopPropagation()}>
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
