import ReactMarkdown from 'react-markdown'
import type { CourseSection } from './sectionTypes'
import { blockKind } from './sectionTypes'
import { TrailerVideo, TrailerYouTube } from './Trailer'

function TextBlock({ s }: { s: CourseSection }) {
  const hasImage = Boolean(s.imageUrl) && s.imageSide !== 'none'
  const split = hasImage && (s.imageSide === 'left' || s.imageSide === 'right')
  return (
    <section className={`course-section${split ? ` course-section--split course-section--${s.imageSide}` : ''}`}>
      <div className="course-section-text">
        {s.heading && <h2 className="course-section-heading">{s.heading}</h2>}
        <div className="course-page-description--md">
          <ReactMarkdown>{s.body}</ReactMarkdown>
        </div>
      </div>
      {hasImage && (
        <div className={`course-section-media${s.imageSide === 'full' ? ' course-section-media--full' : ''}`}>
          <img
            src={s.imageUrl}
            alt={s.heading || ''}
            loading="lazy"
            style={{ width: `${s.imageWidth ?? 100}%`, margin: `${s.imageMargin ?? 0}px` }}
          />
        </div>
      )}
    </section>
  )
}

function ImageBlock({ s }: { s: CourseSection }) {
  if (!s.imageUrl) return null
  return (
    <section className="course-section course-block-image">
      <img
        src={s.imageUrl}
        alt={s.heading || ''}
        loading="lazy"
        style={{ width: `${s.imageWidth ?? 100}%`, margin: `${s.imageMargin ?? 0}px auto` }}
      />
    </section>
  )
}

function VideoBlock({ s }: { s: CourseSection }) {
  if (s.videoUrl) return <section className="course-section"><TrailerVideo url={s.videoUrl} /></section>
  if (s.youtubeUrl) return <section className="course-section"><TrailerYouTube url={s.youtubeUrl} /></section>
  return null
}

export function CourseSectionsView({ sections }: { sections: CourseSection[] }) {
  return (
    <div className="course-sections">
      {sections.map(s => {
        const kind = blockKind(s)
        if (kind === 'image') return <ImageBlock key={s.id} s={s} />
        if (kind === 'video') return <VideoBlock key={s.id} s={s} />
        return <TextBlock key={s.id} s={s} />
      })}
    </div>
  )
}
