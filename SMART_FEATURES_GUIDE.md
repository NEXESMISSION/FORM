# Smart Features Guide

This guide explains all the smart/intelligent features added to make the webapp smarter and more user-friendly.

## 🧠 Smart Features Overview

### 1. **Auto-Save** (`useAutoSave`)
Automatically saves form data to localStorage and optionally to server.

**Features:**
- Debounced saving (waits for user to stop typing)
- LocalStorage persistence
- Optional server sync
- Manual save trigger
- Clear saved data

**Usage:**
```typescript
import { useAutoSave } from '@/lib/hooks'

const { isSaving, lastSaved, saveNow, clear } = useAutoSave(formData, {
  key: 'housing-application-form',
  delay: 1000, // Save 1 second after user stops typing
  onSave: async (data) => {
    // Optional: Save to server
    await saveToServer(data)
  },
})
```

### 2. **Smart Caching** (`useSmartCache`)
Intelligent caching with TTL, invalidation, and prefetching.

**Features:**
- Time-to-live (TTL) for cache entries
- Automatic prefetching before expiration
- Cache invalidation
- Subscriptions for cache updates
- Global cache instance

**Usage:**
```typescript
import { useSmartCache } from '@/lib/hooks'

const { data, loading, error, refetch, invalidate } = useSmartCache(
  'applications',
  async () => {
    const result = await fetchApplications()
    return result
  },
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    prefetch: true,
    prefetchThreshold: 60 * 1000, // Prefetch 1 minute before expiry
  }
)
```

### 3. **Optimistic Updates** (`useOptimisticUpdate`)
Update UI immediately, then sync with server. Automatically rolls back on error.

**Features:**
- Instant UI updates
- Automatic rollback on error
- Loading states
- Error handling

**Usage:**
```typescript
import { useOptimisticUpdate } from '@/lib/hooks'

const { data, update, isUpdating, rollback } = useOptimisticUpdate(
  initialData,
  {
    onUpdate: async (newData) => {
      const result = await updateServer(newData)
      return result
    },
    onError: (error, rollbackData) => {
      toast.error('Failed to update')
    },
    onSuccess: (data) => {
      toast.success('Updated successfully')
    },
  }
)

// Update optimistically
await update(newData) // UI updates immediately
```

### 4. **Smart Search** (`useSmartSearch`)
Intelligent search with fuzzy matching, ranking, and debouncing.

**Features:**
- Fuzzy matching algorithm
- Result ranking by relevance
- Debounced search
- Configurable search keys
- Case-insensitive by default

**Usage:**
```typescript
import { useSmartSearch } from '@/lib/hooks'

const { query, setQuery, results, isSearching, resultCount } = useSmartSearch(
  applications,
  {
    keys: ['full_name', 'email', 'id_card_number'],
    threshold: 0.1, // Minimum match score
    debounceMs: 300,
  }
)

<input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Search..."
/>
```

### 5. **Smart Notifications** (`useSmartNotifications`)
Intelligent notification system with priority, grouping, and auto-dismiss.

**Features:**
- Priority levels (low, normal, high, critical)
- Notification grouping
- Auto-dismiss based on priority
- Action buttons
- Notification history

**Usage:**
```typescript
import { useSmartNotifications } from '@/lib/hooks'

const { notify, notifications, clear } = useSmartNotifications()

// Simple notification
notify('تم الحفظ بنجاح', 'success')

// With options
notify('خطأ في الاتصال', 'error', {
  priority: 'high',
  duration: 6000,
  action: {
    label: 'إعادة المحاولة',
    onClick: () => retry(),
  },
  group: 'network-errors',
})
```

### 6. **Form Validation** (`useFormValidation`)
Real-time form validation with immediate feedback.

**Features:**
- Real-time validation
- Field-level validation
- Touch detection
- Error messages
- Validation rules

**Usage:**
```typescript
import { useFormValidation, CommonRules } from '@/lib/hooks'

const {
  data,
  errors,
  isValid,
  touched,
  setValue,
  setTouched,
  validate,
} = useFormValidation(
  { email: '', password: '' },
  {
    email: CommonRules.email(),
    password: CommonRules.required('كلمة المرور مطلوبة'),
  }
)

<input
  value={data.email}
  onChange={(e) => setValue('email', e.target.value)}
  onBlur={() => setTouched('email')}
/>
{errors.email && <span className="error">{errors.email}</span>}
```

### 7. **Prefetching** (`usePrefetch`)
Smart route and data prefetching for faster navigation.

**Features:**
- Route prefetching
- Priority-based prefetching
- Hover-based prefetching
- Batch prefetching

**Usage:**
```typescript
import { usePrefetch } from '@/lib/hooks'

const { prefetch, prefetchOnHover } = usePrefetch('/dashboard/applicant', {
  priority: 'high',
  prefetchOnHover: true,
})

<Link
  href="/dashboard/applicant"
  onMouseEnter={prefetchOnHover}
>
  Dashboard
</Link>
```

## 🎯 Benefits

1. **Better UX** - Instant feedback, auto-save, optimistic updates
2. **Performance** - Caching, prefetching, debouncing
3. **Reliability** - Error recovery, rollback, validation
4. **Intelligence** - Smart search, notifications, caching

## 📝 Integration Examples

### Auto-Save Form
```typescript
function HousingApplicationForm() {
  const [formData, setFormData] = useState({...})
  const { isSaving, lastSaved } = useAutoSave(formData, {
    key: 'housing-form',
    delay: 2000,
  })

  return (
    <form>
      {/* Form fields */}
      {isSaving && <span>جاري الحفظ...</span>}
      {lastSaved && <span>آخر حفظ: {lastSaved.toLocaleTimeString()}</span>}
    </form>
  )
}
```

### Smart Search
```typescript
function ApplicationsList() {
  const [applications, setApplications] = useState([])
  const { query, setQuery, results, isSearching } = useSmartSearch(
    applications,
    { keys: ['full_name', 'email'] }
  )

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isSearching && <Spinner />}
      {results.map(app => <ApplicationCard key={app.id} app={app} />)}
    </div>
  )
}
```

### Optimistic Update
```typescript
function ApplicationStatus({ app }) {
  const { data, update } = useOptimisticUpdate(app, {
    onUpdate: async (newStatus) => {
      return await updateApplicationStatus(app.id, newStatus)
    },
  })

  return (
    <button onClick={() => update({ ...data, status: 'approved' })}>
      Approve {/* Updates immediately */}
    </button>
  )
}
```

## 🚀 Next Steps

1. Integrate auto-save into forms
2. Add smart caching to data fetching
3. Use optimistic updates for status changes
4. Implement smart search in lists
5. Add smart notifications for important events
6. Use prefetching for faster navigation

All hooks are ready to use and can be gradually integrated into existing components!
