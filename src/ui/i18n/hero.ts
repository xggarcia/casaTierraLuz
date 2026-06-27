import type { Language } from '../contexts/LanguageContext'

export interface HeroItem {
  label: string
  title: string
  description: string
  cta: string
  image: string
  video?: string
  courseSlug?: string
}

export const HERO_CONTENT: Record<Language, HeroItem[]> = {
  ca: [
    {
      label: 'Unreal Engine × ComfyUI',
      title: 'Simulació virtual\ni render amb IA',
      description: 'Entorns interactius en temps real amb Unreal Engine i flux de render accelerat per intel·ligència artificial. De la simulació al frame final.',
      cta: 'Veure curs',
      image: 'hero.jpg',
      video: 'hero-video.mp4',
      courseSlug: 'master-virtual-production',
    },
    {
      label: 'Blender × Stylized',
      title: 'Materials estilitzats\nen Blender',
      description: 'Disseny de shaders, texturitzat procedural i look development per a projectes amb estètica estilitzada. De NPR a producció animada.',
      cta: 'Veure curs',
      image: 'hero-2.jpg',
      video: 'hero-video-2.mp4',
      courseSlug: 'substance-3d-suite',
    },
    {
      label: 'Broadcast × Real-time',
      title: "D'Unreal Engine\nal render i la integració en TV",
      description: 'Producció virtual per a broadcast: pipeline en temps real, integració amb plató, càmeres trackejades i sortida directa a antena.',
      cta: 'Veure curs',
      image: 'hero-3.jpg',
      video: 'hero-video-3.mp4',
      courseSlug: 'workshop-vp-intensivo',
    },
  ],
  es: [
    {
      label: 'Unreal Engine × ComfyUI',
      title: 'Simulación virtual\ny render con IA',
      description: 'Entornos interactivos en tiempo real con Unreal Engine y flujo de render acelerado por inteligencia artificial. De la simulación al frame final.',
      cta: 'Ver curso',
      image: 'hero.jpg',
      video: 'hero-video.mp4',
      courseSlug: 'master-virtual-production',
    },
    {
      label: 'Blender × Stylized',
      title: 'Materiales estilizados\nen Blender',
      description: 'Diseño de shaders, texturizado procedural y look development para proyectos con estética estilizada. De NPR a producción animada.',
      cta: 'Ver curso',
      image: 'hero-2.jpg',
      video: 'hero-video-2.mp4',
      courseSlug: 'substance-3d-suite',
    },
    {
      label: 'Broadcast × Real-time',
      title: 'De Unreal Engine\nal render y la integración en TV',
      description: 'Producción virtual para broadcast: pipeline en tiempo real, integración con plató, cámaras trackeadas y salida directa a antena.',
      cta: 'Ver curso',
      image: 'hero-3.jpg',
      video: 'hero-video-3.mp4',
      courseSlug: 'workshop-vp-intensivo',
    },
  ],
  en: [
    {
      label: 'Unreal Engine × ComfyUI',
      title: 'Virtual simulation\nand AI-powered render',
      description: 'Real-time interactive environments in Unreal Engine with an AI-accelerated rendering workflow. From simulation to final frame.',
      cta: 'View course',
      image: 'hero.jpg',
      video: 'hero-video.mp4',
      courseSlug: 'master-virtual-production',
    },
    {
      label: 'Blender × Stylized',
      title: 'Stylized materials\nin Blender',
      description: 'Shader design, procedural texturing and look development for stylized projects. From NPR to animated production.',
      cta: 'View course',
      image: 'hero-2.jpg',
      video: 'hero-video-2.mp4',
      courseSlug: 'substance-3d-suite',
    },
    {
      label: 'Broadcast × Real-time',
      title: 'From Unreal Engine\nto TV render and integration',
      description: 'Virtual production for broadcast: real-time pipeline, studio integration, tracked cameras and direct on-air output.',
      cta: 'View course',
      image: 'hero-3.jpg',
      video: 'hero-video-3.mp4',
      courseSlug: 'workshop-vp-intensivo',
    },
  ],
}
