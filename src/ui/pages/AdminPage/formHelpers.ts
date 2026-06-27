import type { Course, Certification } from '../../../domain/entities/Course'
export { calcDuration } from '../../utils/dateUtils'

export const ALL_TAGS = ['formacion', 'demo', 'realtime', 'produccion-audiovisual', 'arquitectura', 'automocion']
export const DEFAULT_DRAFT_ROLE = 'profesor_simple' as const

export type AdminScope = { organizationIds: string[]; isSuperAdmin: boolean }

export type FormState = {
  titulo: string
  slug: string
  descripcion: string
  descripcionExtendida: string
  tipoEtiqueta: string
  tags: string[]
  horas: string
  fechaInicio: string
  fechaFin: string
  linkImagen: string
  selectedImageId: string | null
  selectedHeroVideoId: string | null
  heroVideoUrl: string
  selectedTrailerVideoId: string | null
  trailerVideoUrl: string
  trailerYoutubeUrl: string
  featured: boolean
  precio: string
  instructor: string
  certification: Certification | ''
  isPublic: boolean
  isArchived: boolean
  organizationId: string
}

export const emptyForm = (defaultOrgId: string): FormState => ({
  titulo: '', slug: '', descripcion: '', descripcionExtendida: '',
  tipoEtiqueta: '', tags: [], horas: '', fechaInicio: '', fechaFin: '',
  linkImagen: '', selectedImageId: null,
  selectedHeroVideoId: null, heroVideoUrl: '',
  selectedTrailerVideoId: null, trailerVideoUrl: '', trailerYoutubeUrl: '',
  featured: false, precio: '',
  instructor: '', certification: '', isPublic: false, isArchived: false,
  organizationId: defaultOrgId,
})

export function courseToForm(c: Course): FormState {
  return {
    titulo:               c.titulo.es,
    slug:                 c.slug,
    descripcion:          c.descripcion.es,
    descripcionExtendida: c.descripcionExtendida.es,
    tipoEtiqueta:         c.tipoEtiqueta.es,
    tags:                 [...c.tags],
    horas:                c.horas != null ? String(c.horas) : '',
    fechaInicio:          c.fechaInicio ?? '',
    fechaFin:             c.fechaFin ?? '',
    linkImagen:           c.linkImagen,
    selectedImageId:      c.imageId ?? null,
    selectedHeroVideoId:  c.heroVideoId ?? null,
    heroVideoUrl:         c.heroVideoUrl ?? '',
    selectedTrailerVideoId: c.trailerVideoId ?? null,
    trailerVideoUrl:      c.trailerVideoUrl ?? '',
    trailerYoutubeUrl:    c.trailerYoutubeUrl ?? '',
    featured:             c.featured,
    precio:               c.precio,
    instructor:           c.instructor,
    certification:        c.certification ?? '',
    isPublic:             c.isPublic,
    isArchived:           c.isArchived,
    organizationId:       c.organizationId,
  }
}

// Build a Course-shaped object from the form state, for faithful previewing.
export function formToCourse(f: FormState): Course {
  return {
    id: -1,
    slug: f.slug,
    titulo: loc(f.titulo),
    descripcion: loc(f.descripcion),
    descripcionExtendida: loc(f.descripcionExtendida),
    tipoEtiqueta: loc(f.tipoEtiqueta),
    tags: [...f.tags],
    horas: f.horas ? parseInt(f.horas, 10) : undefined,
    fechaInicio: (f.fechaInicio || undefined) as Course['fechaInicio'],
    fechaFin: (f.fechaFin || undefined) as Course['fechaFin'],
    linkImagen: f.linkImagen,
    imageId: f.selectedImageId ?? undefined,
    featured: f.featured,
    precio: f.precio,
    instructor: f.instructor,
    orden: 0,
    certification: (f.certification || undefined) as Certification | undefined,
    organizationId: f.organizationId,
    isPublic: f.isPublic,
    isArchived: f.isArchived,
    heroVideoId: f.selectedHeroVideoId ?? undefined,
    heroVideoUrl: f.heroVideoUrl || undefined,
    trailerVideoId: f.selectedTrailerVideoId ?? undefined,
    trailerVideoUrl: f.trailerVideoUrl || undefined,
    trailerYoutubeUrl: f.trailerYoutubeUrl || undefined,
  }
}

export const toSlug = (s: string) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const loc = (v: string) => ({ ca: v, es: v, en: v })
