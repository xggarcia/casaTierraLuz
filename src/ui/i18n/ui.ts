import type { Language } from '../../domain/entities/Language'

export const UI_TEXT: Record<Language, {
  calendar: string
  login: string
  enroll: string
  moreInfo: string
  viewFullCourse: string
  share: string
  send: string
  cancel: string
  calendarTitle: string
  price: string
  duration: string
  schedule: string
  instructor: string
  start: string
  end: string
  name: string
  surname: string
  email: string
  phone: string
  enrollSent: string
  thankYou: string
  confirmationAt: string
  consultar: string
  tbd: string
  flexible: string
  toConfirm: string
  months: string[]
  // Adquirir + Solicitar información
  acquire: string
  acquireConfirmFree: string
  acquireSuccess: string
  acquirePaid: string
  requestInfo: string
  observations: string
  infoSent: string
  infoThankYou: string
  // Mis Cursos
  goToCourse: string
  myCourses: string
  allCourses: string
  acquired: string
  noAcquired: string
}> = {
  ca: {
    calendar: 'Calendari',
    login: 'Log In',
    enroll: "Inscriure's",
    moreInfo: 'Més informació',
    viewFullCourse: 'Veure curs complet',
    share: 'Compartir',
    send: 'Enviar inscripció',
    cancel: 'Cancel·lar',
    calendarTitle: "Calendari d'Esdeveniments 2026",
    price: 'Preu',
    duration: 'Durada',
    schedule: 'Horari',
    instructor: 'Instructor',
    start: 'Inici',
    end: 'Fi',
    name: 'Nom',
    surname: 'Cognoms',
    email: 'Correu electrònic',
    phone: 'Telèfon (opcional)',
    enrollSent: 'Inscripció enviada!',
    thankYou: 'Gràcies',
    confirmationAt: 'Rebràs confirmació a',
    consultar: 'Gratis',
    tbd: 'Per definir',
    flexible: 'Flexible',
    toConfirm: 'Per confirmar',
    months: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
    acquire: 'Adquirir',
    acquireConfirmFree: 'Vols adquirir aquest curs gratuïtament?',
    acquireSuccess: 'Curs adquirit!',
    acquirePaid: 'Pròximament disponible',
    requestInfo: 'Sol·licitar informació',
    observations: 'Observacions',
    infoSent: 'Sol·licitud enviada!',
    infoThankYou: 'Ens posarem en contacte aviat.',
    goToCourse: 'Anar al curs',
    myCourses: 'Els meus cursos',
    allCourses: 'Cursos',
    acquired: 'Adquirit',
    noAcquired: 'Encara no has adquirit cap curs.',
  },
  es: {
    calendar: 'Calendario',
    login: 'Log In',
    enroll: 'Inscribirse',
    moreInfo: 'Más información',
    viewFullCourse: 'Ver curso completo',
    share: 'Compartir',
    send: 'Enviar inscripción',
    cancel: 'Cancelar',
    calendarTitle: 'Calendario de Eventos 2026',
    price: 'Precio',
    duration: 'Duración',
    schedule: 'Horario',
    instructor: 'Instructor',
    start: 'Inicio',
    end: 'Fin',
    name: 'Nombre',
    surname: 'Apellidos',
    email: 'Correo electrónico',
    phone: 'Teléfono (opcional)',
    enrollSent: '¡Inscripción enviada!',
    thankYou: 'Gracias',
    confirmationAt: 'Recibirás confirmación en',
    consultar: 'Gratis',
    tbd: 'Por definir',
    flexible: 'Flexible',
    toConfirm: 'Por confirmar',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    acquire: 'Adquirir',
    acquireConfirmFree: '¿Adquirir este curso gratuitamente?',
    acquireSuccess: '¡Curso adquirido!',
    acquirePaid: 'Próximamente disponible',
    requestInfo: 'Solicitar información',
    observations: 'Observaciones',
    infoSent: '¡Solicitud enviada!',
    infoThankYou: 'Nos pondremos en contacto pronto.',
    goToCourse: 'Ir al curso',
    myCourses: 'Mis cursos',
    allCourses: 'Cursos',
    acquired: 'Adquirido',
    noAcquired: 'Todavía no has adquirido ningún curso.',
  },
  en: {
    calendar: 'Calendar',
    login: 'Log In',
    enroll: 'Enroll',
    moreInfo: 'More info',
    viewFullCourse: 'View full course',
    share: 'Share',
    send: 'Send enrollment',
    cancel: 'Cancel',
    calendarTitle: 'Events Calendar 2026',
    price: 'Price',
    duration: 'Duration',
    schedule: 'Schedule',
    instructor: 'Instructor',
    start: 'Start',
    end: 'End',
    name: 'Name',
    surname: 'Surname',
    email: 'Email',
    phone: 'Phone (optional)',
    enrollSent: 'Enrollment sent!',
    thankYou: 'Thank you',
    confirmationAt: "You'll receive confirmation at",
    consultar: 'Gratis',
    tbd: 'TBD',
    flexible: 'Flexible',
    toConfirm: 'To be confirmed',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    acquire: 'Acquire',
    acquireConfirmFree: 'Acquire this course for free?',
    acquireSuccess: 'Course acquired!',
    acquirePaid: 'Coming soon',
    requestInfo: 'Request information',
    observations: 'Comments',
    infoSent: 'Request sent!',
    infoThankYou: "We'll be in touch soon.",
    goToCourse: 'Go to course',
    myCourses: 'My courses',
    allCourses: 'Courses',
    acquired: 'Acquired',
    noAcquired: "You haven't acquired any courses yet.",
  },
}
