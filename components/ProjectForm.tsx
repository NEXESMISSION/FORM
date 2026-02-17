'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Save, X } from 'lucide-react'

const TUNISIAN_GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
  'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia',
  'Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
]

interface ProjectFormProps {
  project?: any
  onClose: () => void
  onSuccess: () => void
}

export default function ProjectForm({ project, onClose, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    governorate: project?.governorate || '',
    district: project?.district || '',
    location_lat: project?.location_lat || '',
    location_lng: project?.location_lng || '',
    housing_type: project?.housing_type || 'apartment',
    number_of_units: project?.number_of_units || '',
    expected_price: project?.expected_price || '',
    completion_percentage: project?.completion_percentage || 0,
    delivery_date: project?.delivery_date || '',
    status: project?.status || 'study',
    land_cost: project?.land_cost || '',
    construction_cost: project?.construction_cost || '',
    total_cost: project?.total_cost || '',
    project_duration_months: project?.project_duration_months || '',
    expected_return_percentage: project?.expected_return_percentage || '',
    risk_level: project?.risk_level || 'medium',
  })

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please login first')
        return
      }

      const submitData: any = {
        ...formData,
        number_of_units: parseInt(formData.number_of_units) || 0,
        expected_price: formData.expected_price ? parseFloat(formData.expected_price) : null,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
        land_cost: formData.land_cost ? parseFloat(formData.land_cost) : null,
        construction_cost: formData.construction_cost ? parseFloat(formData.construction_cost) : null,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        project_duration_months: formData.project_duration_months ? parseInt(formData.project_duration_months) : null,
        expected_return_percentage: formData.expected_return_percentage ? parseFloat(formData.expected_return_percentage) : null,
        completion_percentage: parseInt(formData.completion_percentage.toString()) || 0,
        delivery_date: formData.delivery_date || null,
        created_by: user.id,
      }

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(submitData)
          .eq('id', project.id)
        if (error) throw error
        toast.success('Project updated successfully!')
      } else {
        const { error } = await supabase
          .from('projects')
          .insert(submitData)
        if (error) throw error
        toast.success('Project created successfully!')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {project ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="form-input"
                rows={3}
              />
            </div>

            <div>
              <label className="form-label">Governorate *</label>
              <select
                value={formData.governorate}
                onChange={(e) => updateField('governorate', e.target.value)}
                className="form-input"
                required
              >
                <option value="">Select...</option>
                {TUNISIAN_GOVERNORATES.map(gov => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => updateField('district', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.location_lat}
                onChange={(e) => updateField('location_lat', e.target.value)}
                className="form-input"
                placeholder="36.8065"
              />
            </div>

            <div>
              <label className="form-label">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.location_lng}
                onChange={(e) => updateField('location_lng', e.target.value)}
                className="form-input"
                placeholder="10.1815"
              />
            </div>

            <div>
              <label className="form-label">Housing Type *</label>
              <select
                value={formData.housing_type}
                onChange={(e) => updateField('housing_type', e.target.value)}
                className="form-input"
                required
              >
                <option value="apartment">Apartment</option>
                <option value="individual">Individual Housing</option>
              </select>
            </div>

            <div>
              <label className="form-label">Number of Units *</label>
              <input
                type="number"
                min="1"
                value={formData.number_of_units}
                onChange={(e) => updateField('number_of_units', e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Expected Price (TND)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_price}
                onChange={(e) => updateField('expected_price', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="form-input"
                required
              >
                <option value="study">Under Study</option>
                <option value="construction_90">Construction (90 days)</option>
                <option value="construction_180">Construction (180 days)</option>
                <option value="construction_365">Construction (1 year)</option>
                <option value="ready">Ready for Sale</option>
              </select>
            </div>

            <div>
              <label className="form-label">Completion Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.completion_percentage}
                onChange={(e) => updateField('completion_percentage', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Delivery Date</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => updateField('delivery_date', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Land Cost (TND)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.land_cost}
                onChange={(e) => updateField('land_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Construction Cost (TND)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.construction_cost}
                onChange={(e) => updateField('construction_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Total Cost (TND)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => updateField('total_cost', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Project Duration (months)</label>
              <input
                type="number"
                min="0"
                value={formData.project_duration_months}
                onChange={(e) => updateField('project_duration_months', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Expected Return (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.expected_return_percentage}
                onChange={(e) => updateField('expected_return_percentage', e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Risk Level</label>
              <select
                value={formData.risk_level}
                onChange={(e) => updateField('risk_level', e.target.value)}
                className="form-input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <span className="spinner"></span> : <><Save className="w-4 h-4 mr-2 inline" />Save Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
