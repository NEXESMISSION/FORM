'use client'

import { useEffect, useRef } from 'react'

interface MapViewProps {
  lat?: number
  lng?: number
  projects?: Array<{
    id: string
    name: string
    location_lat?: number
    location_lng?: number
    governorate: string
  }>
}

export default function MapView({ lat, lng, projects = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Initialize Google Maps
    // Note: You'll need to add your Google Maps API key
    // For now, we'll show a placeholder with coordinates
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      if (window.google && mapRef.current) {
        const defaultLat = lat || 36.8065
        const defaultLng = lng || 10.1815

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: lat && lng ? 15 : 8,
        })

        // Add marker for single location
        if (lat && lng) {
          new window.google.maps.Marker({
            position: { lat, lng },
            map,
            title: 'Project Location',
          })
        }

        // Add markers for multiple projects
        projects.forEach(project => {
          if (project.location_lat && project.location_lng) {
            new window.google.maps.Marker({
              position: {
                lat: project.location_lat,
                lng: project.location_lng
              },
              map,
              title: project.name,
            })
          }
        })
      }
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [lat, lng, projects])

  return (
    <div className="w-full h-full">
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Google Maps Integration</p>
            <p className="text-sm text-gray-500">
              {lat && lng ? `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Add Google Maps API key to enable map view'}
            </p>
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="w-full h-64 rounded-lg" />
      )}
    </div>
  )
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any
  }
}
