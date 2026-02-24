'use client'

const DEFAULT_VIDEO_ID = 'gUbNlN_SqpE'

function getVideoId(): string | null {
  const id = (process.env.NEXT_PUBLIC_LANDING_VIDEO_ID || DEFAULT_VIDEO_ID).trim()
  return id || null
}

export default function LandingVideo() {
  const videoId = getVideoId()

  if (!videoId) return null

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`

  return (
    <div className="w-full max-w-lg mx-auto mb-6">
      <div className="aspect-video rounded-xl overflow-hidden border-2 border-gold-300 bg-gold-100">
        <iframe
          src={embedUrl}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
