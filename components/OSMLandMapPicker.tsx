'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon in Next.js (webpack)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const TUNISIA_CENTER: [number, number] = [33.8, 10.2]
const DEFAULT_ZOOM = 6

export interface OSMLandMapPickerProps {
  /** Current value as "lat,lng" or empty */
  value?: string
  /** Called with "lat,lng" and optionally display address for location text */
  onChange: (gps: string, locationLabel?: string) => void
  /** Optional: current text for location (ولاية / معتمدية / عمادة) to avoid overwriting */
  locationText?: string
  className?: string
}

function ParseLatLng(value: string | undefined): [number, number] | null {
  if (!value || !value.trim()) return null
  const parts = value.split(',').map((p) => p.trim())
  if (parts.length < 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return [lat, lng]
}

/** Reverse geocode using OSM Nominatim (no API key). */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ar,en',
        'User-Agent': 'DomobatHousingApp/1.0 (Tunisia housing form)',
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address
    if (!addr) return data.display_name || null
    // Prefer state (ولاية), county (معتمدية), suburb/village
    const parts: string[] = []
    if (addr.state) parts.push(addr.state)
    if (addr.county) parts.push(addr.county)
    if (addr.municipality) parts.push(addr.municipality)
    if (addr.village) parts.push(addr.village)
    if (addr.town) parts.push(addr.town)
    if (parts.length) return parts.join('، ')
    return data.display_name || null
  } catch {
    return null
  }
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      onPick(lat, lng)
    },
  })
  return null
}

export default function OSMLandMapPicker({
  value,
  onChange,
  className = '',
}: OSMLandMapPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const position = ParseLatLng(value)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePick = useCallback(
    async (lat: number, lng: number) => {
      const gps = `${lat.toFixed(5)},${lng.toFixed(5)}`
      onChange(gps)
      setLoading(true)
      try {
        const label = await reverseGeocode(lat, lng)
        if (label) onChange(gps, label)
      } finally {
        setLoading(false)
      }
    },
    [onChange]
  )

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 ${className}`}
        style={{ minHeight: 280 }}
      >
        جاري تحميل الخريطة...
      </div>
    )
  }

  return (
    <div className={className}>
      <p className="text-sm text-gray-600 mb-2">
        انقر على الخريطة لتحديد موقع الأرض. يمكنك أيضاً كتابة الولاية/المعتمدية أعلاه.
      </p>
      <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 280 }}>
        <MapContainer
          center={position || TUNISIA_CENTER}
          zoom={position ? 14 : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && <Marker position={position} />}
          <MapClickHandler onPick={handlePick} />
        </MapContainer>
      </div>
      {value && (
        <p className="text-xs text-gray-500 mt-1">
          الإحداثيات: {value}
          {loading && ' (جاري استخراج العنوان...)'}
        </p>
      )}
    </div>
  )
}
