type LessonVideoProps = {
  videoUrl: string | null
  title: string
}

function getEmbedUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl)
    const hostname = url.hostname.replace('www.', '')

    if (hostname === 'youtube.com' && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v')
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }

    if (hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1)
      if (videoId) return `https://www.youtube.com/embed/${videoId}`
    }
  } catch {
    return videoUrl
  }

  return videoUrl
}

export default function LessonVideo({ videoUrl, title }: LessonVideoProps) {
  if (!videoUrl) return null

  const embedUrl = getEmbedUrl(videoUrl)

  return (
    <div className="mt-5 overflow-hidden rounded-xl bg-slate-200">
      <div className="aspect-video">
        <iframe
          className="h-full w-full"
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}