import type { LocalizedText } from '../domain/entities/Language'
import type { Category, UnrealArticle } from '../domain/entities/Course'

const loc = (es: string): LocalizedText => ({ ca: es, es, en: es })

export const UNREAL_ARTICLES: Record<Category, UnrealArticle> = {
  realtime: {
    titulo: loc('¿Por qué Unreal Engine para Realtime?'),
    descripcion: loc('Descubre por qué Unreal Engine de Epic Games es la plataforma líder mundial para producción en tiempo real, rendering interactivo y experiencias inmersivas.'),
    descripcionExtendida: loc('Unreal Engine 5 de Epic Games revoluciona la producción en tiempo real con tecnologías como Lumen (iluminación global dinámica totalmente en tiempo real), Nanite (geometría virtualizada con millones de polígonos), y un sistema de rendering que permite crear experiencias fotorealistas sin tiempos de espera. Utilizado por estudios de cine como ILM, The Third Floor y más para Virtual Production en series como The Mandalorian. UE5 elimina la barrera entre pre-renderizado y tiempo real, permitiendo iterar creativamente al instante.'),
    tipoEtiqueta: loc('Información'),
    linkImagen: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1400&q=80',
  },
  'produccion-audiovisual': {
    titulo: loc('¿Por qué Unreal Engine para Producción Audiovisual?'),
    descripcion: loc('Unreal Engine de Epic Games transforma la producción audiovisual con Virtual Production, cinematografía virtual y flujos de trabajo revolucionarios.'),
    descripcionExtendida: loc('Epic Games ha convertido Unreal Engine 5 en el estándar de la industria audiovisual moderna. Producciones de Hollywood como The Mandalorian, Westworld, Batman y cientos más usan UE5 para Virtual Production, eliminando pantallas verdes y permitiendo que directores y cinematógrafos vean el resultado final en tiempo real durante el rodaje. Tecnologías como LED walls con nDisplay, Camera Tracking, Color Grading en tiempo real, y el sistema Sequencer para edición no lineal hacen de UE5 la herramienta definitiva.'),
    tipoEtiqueta: loc('Información'),
    linkImagen: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80',
  },
  arquitectura: {
    titulo: loc('¿Por qué Unreal Engine para Arquitectura?'),
    descripcion: loc('Unreal Engine de Epic Games revoluciona la visualización arquitectónica con renders en tiempo real, recorridos virtuales interactivos y presentaciones inmersivas.'),
    descripcionExtendida: loc('Unreal Engine 5 ha transformado la industria arquitectónica permitiendo a estudios crear visualizaciones fotorealistas en tiempo real. Con Lumen, los arquitectos pueden ver cambios de iluminación natural a lo largo del día instantáneamente. Nanite permite importar modelos CAD con millones de polígonos sin optimización. Estudios como Zaha Hadid Architects, BIG y Foster+Partners usan UE5 para presentaciones interactivas a clientes donde pueden explorar espacios en VR, cambiar materiales al instante, y tomar decisiones de diseño en tiempo real.'),
    tipoEtiqueta: loc('Información'),
    linkImagen: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
  },
  automocion: {
    titulo: loc('¿Por qué Unreal Engine para Automoción?'),
    descripcion: loc('Unreal Engine de Epic Games impulsa la industria automotriz con configuradores en tiempo real, HMI de vehículos, simulación y experiencias de marketing inmersivas.'),
    descripcionExtendida: loc('La industria automotriz ha adoptado Unreal Engine 5 como su plataforma de referencia. BMW, Mercedes-Benz, Audi, Porsche, Ferrari y prácticamente todos los fabricantes premium usan UE5 para configuradores de vehículos en tiempo real, desarrollo de interfaces HMI para pantallas de vehículos, simuladores de conducción para testing y training, y visualización de diseño antes de producir prototipos físicos.'),
    tipoEtiqueta: loc('Información'),
    linkImagen: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  },
}
