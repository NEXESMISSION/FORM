/**
 * Custom hook for file upload with progress tracking and error handling
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { validateFiles, fileListToArray, formatFileSize } from '@/lib/utils/fileUpload'
import { executeAsync } from '@/lib/utils/asyncOperations'
import toast from 'react-hot-toast'

export interface FileUploadState {
  uploading: boolean
  progress: number
  error: Error | null
  uploadedFiles: Array<{ url: string; fileName: string }>
}

export interface UploadOptions {
  bucket: string
  path: string
  maxSize?: number
  allowedTypes?: string[]
  onProgress?: (progress: number) => void
}

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    uploading: false,
    progress: 0,
    error: null,
    uploadedFiles: [],
  })

  const uploadFiles = useCallback(
    async (files: FileList | File[], options: UploadOptions) => {
      const fileArray = Array.isArray(files) ? files : fileListToArray(files)
      
      if (fileArray.length === 0) {
        toast.error('لم يتم اختيار أي ملفات')
        return { success: false, files: [] }
      }

      // Validate files
      const validation = validateFiles(fileArray, {
        maxSize: options.maxSize || 10 * 1024 * 1024,
        allowedTypes: options.allowedTypes || [],
      })

      if (!validation.valid) {
        validation.errors.forEach((error) => toast.error(error))
        return { success: false, files: [] }
      }

      setState({
        uploading: true,
        progress: 0,
        error: null,
        uploadedFiles: [],
      })

      const uploadedFiles: Array<{ url: string; fileName: string }> = []
      const totalFiles = validation.validFiles.length

      try {
        for (let i = 0; i < validation.validFiles.length; i++) {
          const file = validation.validFiles[i]
          const ext = file.name.split('.').pop() || 'bin'
          const filePath = `${options.path}/${Date.now()}-${i}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from(options.bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw uploadError
          }

          const { data: { publicUrl } } = supabase.storage
            .from(options.bucket)
            .getPublicUrl(filePath)

          uploadedFiles.push({
            url: publicUrl,
            fileName: file.name,
          })

          const progress = ((i + 1) / totalFiles) * 100
          setState((prev) => ({
            ...prev,
            progress,
            uploadedFiles: [...uploadedFiles],
          }))

          if (options.onProgress) {
            options.onProgress(progress)
          }
        }

        setState({
          uploading: false,
          progress: 100,
          error: null,
          uploadedFiles,
        })

        toast.success(`تم رفع ${uploadedFiles.length} ملف بنجاح`)
        return { success: true, files: uploadedFiles }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        setState({
          uploading: false,
          progress: 0,
          error: err,
          uploadedFiles: [],
        })
        toast.error(`فشل رفع الملفات: ${err.message}`)
        return { success: false, files: [] }
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
      uploadedFiles: [],
    })
  }, [])

  return {
    ...state,
    uploadFiles,
    reset,
  }
}
