/**
 * Robust data fetching utilities with error handling, retry logic, and caching
 */

import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export interface FetchOptions {
  retries?: number
  retryDelay?: number
  showErrorToast?: boolean
  errorMessage?: string
  onError?: (error: Error) => void
}

export interface FetchResult<T> {
  data: T | null
  error: Error | null
  success: boolean
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: FetchOptions = {}
): Promise<T> {
  const { retries = 3, retryDelay = 1000 } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      break
    }
  }

  throw lastError || new Error('Unknown error')
}

/**
 * Safe fetch wrapper with error handling
 */
export async function safeFetch<T>(
  fn: () => Promise<T>,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    retries = 0,
    showErrorToast = true,
    errorMessage = 'حدث خطأ أثناء تحميل البيانات',
    onError,
  } = options

  try {
    const data = retries > 0 
      ? await retryWithBackoff(fn, options)
      : await fn()
    
    return {
      data,
      error: null,
      success: true,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    if (onError) {
      onError(err)
    } else if (showErrorToast) {
      toast.error(errorMessage)
    }
    
    return {
      data: null,
      error: err,
      success: false,
    }
  }
}

/**
 * Fetch housing applications with error handling
 */
export async function fetchHousingApplications(
  userId: string,
  options: FetchOptions = {}
): Promise<FetchResult<any[]>> {
  return safeFetch(
    async () => {
      const { data, error } = await supabase
        .from('housing_applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    {
      errorMessage: 'فشل تحميل الطلبات',
      ...options,
    }
  )
}

/**
 * Fetch required document types
 */
export async function fetchRequiredDocTypes(
  options: FetchOptions = {}
): Promise<FetchResult<Array<{ id: string; label_ar: string }>>> {
  return safeFetch(
    async () => {
      const { data, error } = await supabase
        .from('required_document_types')
        .select('id, label_ar')
        .eq('active', true)
        .order('sort_order', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    {
      errorMessage: 'فشل تحميل أنواع المستندات',
      ...options,
    }
  )
}

/**
 * Fetch user profile
 */
export async function fetchUserProfile(
  userId: string,
  options: FetchOptions = {}
): Promise<FetchResult<any>> {
  return safeFetch(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) throw error
      if (!data) throw new Error('الملف الشخصي غير موجود')
      return data
    },
    {
      errorMessage: 'فشل تحميل الملف الشخصي',
      ...options,
    }
  )
}

/**
 * Fetch direct purchases
 */
export async function fetchDirectPurchases(
  userId: string,
  options: FetchOptions = {}
): Promise<FetchResult<Array<{ purchase: any; projectName: string }>>> {
  return safeFetch(
    async () => {
      const { data: purchases, error: e1 } = await supabase
        .from('project_direct_purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (e1) throw e1
      
      const projectIds = [...new Set((purchases || []).map((p: any) => p.project_id))]
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds)
      
      const nameById = (projects || []).reduce(
        (acc: Record<string, string>, p: any) => {
          acc[p.id] = p.name || '—'
          return acc
        },
        {}
      )
      
      return (purchases || []).map((p: any) => ({
        purchase: p,
        projectName: nameById[p.project_id] || '—',
      }))
    },
    {
      errorMessage: 'فشل تحميل المشتريات المباشرة',
      ...options,
    }
  )
}

/**
 * Fetch single housing application
 */
export async function fetchHousingApplication(
  applicationId: string,
  userId: string,
  options: FetchOptions = {}
): Promise<FetchResult<any>> {
  return safeFetch(
    async () => {
      const { data, error } = await supabase
        .from('housing_applications')
        .select('*')
        .eq('id', applicationId)
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) throw error
      if (!data) throw new Error('الطلب غير موجود')
      return data
    },
    {
      errorMessage: 'فشل تحميل الطلب',
      ...options,
    }
  )
}
