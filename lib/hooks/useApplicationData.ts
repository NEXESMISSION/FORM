/**
 * Custom hook for managing application data with loading states and error handling
 */

import { useState, useEffect, useCallback } from 'react'
import {
  fetchHousingApplications,
  fetchRequiredDocTypes,
  fetchDirectPurchases,
  fetchUserProfile,
  type FetchResult,
} from '@/lib/utils/dataFetching'
import { supabase } from '@/lib/supabase'

export interface ApplicationDataState {
  applications: any[]
  directPurchases: Array<{ purchase: any; projectName: string }>
  requiredDocTypes: Array<{ id: string; label_ar: string }>
  user: any
  profile: any
  loading: boolean
  error: Error | null
}

export function useApplicationData() {
  const [state, setState] = useState<ApplicationDataState>({
    applications: [],
    directPurchases: [],
    requiredDocTypes: [],
    user: null,
    profile: null,
    loading: true,
    error: null,
  })

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('المستخدم غير موجود')
      }

      // Fetch all data in parallel
      const [applicationsResult, docTypesResult, purchasesResult, profileResult] = await Promise.all([
        fetchHousingApplications(user.id, { showErrorToast: false }),
        fetchRequiredDocTypes({ showErrorToast: false }),
        fetchDirectPurchases(user.id, { showErrorToast: false }),
        fetchUserProfile(user.id, { showErrorToast: false }),
      ])

      // Check for errors
      const errors: Error[] = []
      if (!applicationsResult.success && applicationsResult.error) {
        errors.push(applicationsResult.error)
      }
      if (!docTypesResult.success && docTypesResult.error) {
        errors.push(docTypesResult.error)
      }
      if (!purchasesResult.success && purchasesResult.error) {
        errors.push(purchasesResult.error)
      }
      if (!profileResult.success && profileResult.error) {
        errors.push(profileResult.error)
      }

      if (errors.length > 0) {
        throw errors[0] // Throw first error
      }

      setState({
        applications: applicationsResult.data || [],
        directPurchases: purchasesResult.data || [],
        requiredDocTypes: docTypesResult.data || [],
        user,
        profile: profileResult.data || null,
        loading: false,
        error: null,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }))
    }
  }, [])

  const refresh = useCallback(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...state,
    refresh,
    reload: refresh,
  }
}
