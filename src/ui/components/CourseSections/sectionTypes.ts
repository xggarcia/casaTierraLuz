// Course content is modelled as an ordered list of designed sections.
// Stored as JSON inside the existing `descripcionExtendida` field for
// prototyping (no DB migration). Falls back to plain markdown for legacy data.

export type ImageSide = 'none' | 'left' | 'right' | 'full'
export type BlockKind = 'text' | 'image' | 'video'

export interface CourseSection {
  id: string
  /** Block type. Missing = 'text' (backward compatible with old data). */
  kind?: BlockKind
  heading: string
  body: string // markdown (text blocks)
  imageUrl?: string
  imageSide: ImageSide
  imageWidth?: number // % of its area (default 100)
  imageMargin?: number // px around the image (default 0)
  // video blocks
  videoUrl?: string
  youtubeUrl?: string
}

export interface CourseContent {
  v: 1
  sections: CourseSection[]
}

// Quick-add presets: common course section names
export const SECTION_PRESETS = [
  'El programa',
  'Para quién es',
  'Qué aprenderás',
  'Contenido',
  'Requisitos',
  'El resultado',
] as const

function baseSection(): CourseSection {
  return {
    id: Math.random().toString(36).slice(2, 10),
    heading: '',
    body: '',
    imageUrl: '',
    imageSide: 'none',
    imageWidth: 100,
    imageMargin: 0,
  }
}

export function newSection(heading = ''): CourseSection {
  return { ...baseSection(), kind: 'text', heading }
}

export function newImageBlock(): CourseSection {
  return { ...baseSection(), kind: 'image', imageSide: 'full' }
}

export function newVideoBlock(): CourseSection {
  return { ...baseSection(), kind: 'video' }
}

/** Normalises a section so `kind` is always defined. */
export function blockKind(s: CourseSection): BlockKind {
  return s.kind ?? 'text'
}

/**
 * Parse the stored value. Returns sections if it's our JSON format,
 * otherwise null (caller falls back to rendering the raw markdown).
 */
export function parseContent(raw: string | undefined | null): CourseSection[] | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed) as CourseContent
    if (parsed && parsed.v === 1 && Array.isArray(parsed.sections)) {
      return parsed.sections
    }
  } catch {
    // not our format
  }
  return null
}

export function serializeContent(sections: CourseSection[]): string {
  const content: CourseContent = { v: 1, sections }
  return JSON.stringify(content)
}
