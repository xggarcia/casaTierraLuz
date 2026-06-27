import { useState } from 'react'

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return match ? match[1] : null
}

export function TrailerYouTube({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const youtubeId = getYouTubeId(url)
  if (!youtubeId) return null
  const thumb = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
  return (
    <div className="course-page-trailer">
      <span className="course-page-trailer-label">Trailer</span>
      <div className="course-page-trailer-frame" onClick={() => setPlaying(true)}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&color=white`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img className="course-page-trailer-thumb" src={thumb} alt="Trailer" />
            <div className="course-page-trailer-overlay" />
            <button type="button" className="course-page-trailer-play" aria-label="Reproducir trailer">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function TrailerVideo({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="course-page-trailer">
      <span className="course-page-trailer-label">Trailer</span>
      <div className="course-page-trailer-frame" onClick={() => setPlaying(true)}>
        {playing ? (
          <video
            ref={el => { if (el) el.play() }}
            src={url}
            controls
            autoPlay
            className="course-page-trailer-native"
          />
        ) : (
          <>
            <video src={url} className="course-page-trailer-thumb" preload="metadata" muted />
            <div className="course-page-trailer-overlay" />
            <button type="button" className="course-page-trailer-play" aria-label="Reproducir trailer">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
