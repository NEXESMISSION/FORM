# Quick Start Guide - Using the New Utilities

This guide shows you how to use the new utilities and hooks in your components.

## 📦 Importing Utilities

### Single Import (Recommended)
```typescript
import { 
  fetchHousingApplications,
  validateHousingApplication,
  debounce,
  useApplicationData 
} from '@/lib/utils'
```

### Separate Imports
```typescript
import { fetchHousingApplications } from '@/lib/utils/dataFetching'
import { validateHousingApplication } from '@/lib/utils/validation'
import { debounce } from '@/lib/utils/performance'
import { useApplicationData } from '@/lib/hooks/useApplicationData'
```

## 🔄 Data Fetching

### Before
```typescript
const [applications, setApplications] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('housing_applications')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      setApplications(data || [])
    } catch (e) {
      setError(e)
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }
  load()
}, [user.id])
```

### After
```typescript
import { fetchHousingApplications } from '@/lib/utils/dataFetching'

const result = await fetchHousingApplications(userId, {
  retries: 3,
  showErrorToast: true,
})

if (result.success) {
  setApplications(result.data)
}
```

### Or Use the Hook
```typescript
import { useApplicationData } from '@/lib/hooks/useApplicationData'

function MyComponent() {
  const { applications, loading, error, refresh } = useApplicationData()
  
  // All data is loaded automatically
  // Refresh with: refresh()
}
```

## ✅ Form Validation

### Before
```typescript
const [errors, setErrors] = useState({})

const validate = () => {
  const newErrors = {}
  if (!formData.full_name) {
    newErrors.full_name = 'الاسم مطلوب'
  }
  if (!formData.email || !formData.email.includes('@')) {
    newErrors.email = 'البريد الإلكتروني غير صحيح'
  }
  // ... more validation
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### After
```typescript
import { validateHousingApplication, CommonRules } from '@/lib/utils/validation'

const validation = validateHousingApplication(formData)
if (!validation.valid) {
  // Show errors
  Object.entries(validation.errors).forEach(([field, error]) => {
    toast.error(error)
  })
  return
}
```

## 🚀 Performance Optimization

### Debounce Search Input
```typescript
import { debounce } from '@/lib/utils/performance'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  
  useEffect(() => {
    if (debouncedSearch) {
      // This only runs 300ms after user stops typing
      performSearch(debouncedSearch)
    }
  }, [debouncedSearch])
  
  return (
    <input 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  )
}
```

## 📤 File Upload

### Before
```typescript
const [uploading, setUploading] = useState(false)
const [progress, setProgress] = useState(0)

const handleUpload = async (files) => {
  setUploading(true)
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Upload logic...
      setProgress(((i + 1) / files.length) * 100)
    }
    toast.success('تم الرفع')
  } catch (e) {
    toast.error('فشل الرفع')
  } finally {
    setUploading(false)
  }
}
```

### After
```typescript
import { useFileUpload } from '@/lib/hooks/useFileUpload'

function UploadComponent() {
  const { uploadFiles, uploading, progress } = useFileUpload()
  
  const handleUpload = async (e) => {
    const result = await uploadFiles(e.target.files, {
      bucket: 'documents',
      path: `user/${userId}/docs`,
      maxSize: 10 * 1024 * 1024,
      onProgress: (p) => console.log(`${p}%`),
    })
    
    if (result.success) {
      // Files uploaded successfully
    }
  }
  
  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {uploading && <div>Progress: {progress}%</div>}
    </div>
  )
}
```

## 🎯 State Management

### Array State
```typescript
import { useArrayState } from '@/lib/utils/stateManagement'

function ListComponent() {
  const [items, { push, remove, update, clear }] = useArrayState<string>([])
  
  return (
    <div>
      <button onClick={() => push('New Item')}>Add</button>
      <button onClick={() => remove(0)}>Remove First</button>
      <button onClick={() => clear()}>Clear All</button>
    </div>
  )
}
```

### Toggle State
```typescript
import { useToggle } from '@/lib/utils/stateManagement'

function ToggleComponent() {
  const [isOpen, toggle, setIsOpen] = useToggle(false)
  
  return (
    <div>
      <button onClick={toggle}>Toggle</button>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && <div>Content</div>}
    </div>
  )
}
```

### Async State
```typescript
import { useAsyncState } from '@/lib/utils/stateManagement'

function DataComponent() {
  const [data, execute, loading, error, reset] = useAsyncState(null)
  
  const loadData = () => {
    execute(fetchData())
  }
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && <div>{JSON.stringify(data)}</div>}
      <button onClick={loadData}>Load</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

## 🛡️ Error Handling

### Before
```typescript
try {
  const result = await someOperation()
} catch (error) {
  console.error(error)
  toast.error('حدث خطأ')
}
```

### After
```typescript
import { handleError, ErrorCodes, createAppError } from '@/lib/utils/errorHandling'

try {
  const result = await someOperation()
} catch (error) {
  await handleError(error, {
    showToast: true,
    log: true,
    context: { operation: 'someOperation' },
  })
}
```

## 🔄 Migration Checklist

- [ ] Replace manual data fetching with `fetchHousingApplications()` etc.
- [ ] Replace form validation with `validateHousingApplication()`
- [ ] Add debounce to search inputs
- [ ] Replace file upload logic with `useFileUpload()` hook
- [ ] Use state management hooks instead of manual state
- [ ] Add error boundaries to components
- [ ] Use error handling utilities

## 📚 More Examples

See `IMPROVEMENTS_SUMMARY.md` for detailed documentation of all utilities.
