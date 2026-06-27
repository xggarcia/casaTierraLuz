import type { Language, LocalizedText } from './Language'

// Formato YYYY-MM-DD — TypeScript rechaza cualquier otra cadena
export type ISODate = `${number}-${number}-${number}`

export type Category = 'realtime' | 'produccion-audiovisual' | 'arquitectura' | 'automocion'
export type CourseType = 'formacion' | 'demo'
export type Certification = 'epic' | 'unreal'

export interface Course {
  id: number
  slug: string
  titulo: LocalizedText
  descripcion: LocalizedText
  descripcionExtendida: LocalizedText
  tipoEtiqueta: LocalizedText
  tags: string[]
  horas?: number
  fechaInicio?: ISODate
  fechaFin?: ISODate
  linkImagen: string      // poblado desde JOIN con course_images, no guardado en courses
  imageId?: string        // FK → course_images.id (la única fuente de imagen)
  featured: boolean
  precio: string
  instructor: string
  orden: number
  certification?: Certification
  organizationId: string  // FK → organizations.id
  isPublic: boolean       // público = visible para todos; privado = solo miembros de la org
  isArchived: boolean     // archivado = oculto de la web activa, visible en /cursos
  heroVideoId?: string    // FK → course_videos.id
  heroVideoUrl?: string   // poblado vía JOIN
  trailerVideoId?: string // FK → course_videos.id
  trailerVideoUrl?: string // poblado vía JOIN
  trailerYoutubeUrl?: string
}

export interface UnrealArticle {
  titulo: LocalizedText
  descripcion: LocalizedText
  descripcionExtendida: LocalizedText
  tipoEtiqueta: LocalizedText
  linkImagen: string
}

export const CATEGORIES: Category[] = ['realtime', 'produccion-audiovisual', 'arquitectura', 'automocion']

export const CATEGORY_LABELS: Record<Language, Record<Category, string>> = {
  ca: {
    'realtime': 'Realtime',
    'produccion-audiovisual': 'Producció Audiovisual',
    'arquitectura': 'Arquitectura',
    'automocion': 'Automoció',
  },
  es: {
    'realtime': 'Realtime',
    'produccion-audiovisual': 'Producción Audiovisual',
    'arquitectura': 'Arquitectura',
    'automocion': 'Automoción',
  },
  en: {
    'realtime': 'Realtime',
    'produccion-audiovisual': 'Audiovisual Production',
    'arquitectura': 'Architecture',
    'automocion': 'Automotive',
  },
}
