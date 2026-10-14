type LessonVideoProps = {
  videoUrl: string | null
  title: string
}

export default function LessonVideo({ videoUrl, title }: LessonVideoProps) {
  if (!videoUrl) return null

  return (
    <div className="mt-5 overflow-hidden rounded-xl bg-slate-200">
      <div className="aspect-video">
        <iframe
          className="h-full w-full"
          src={videoUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}