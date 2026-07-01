export const es = {
  // General
  loading: 'Cargando...',
  error: 'Error al cargar los datos',
  notAuthorized: 'No tienes permiso para ver esta página',

  // Header
  nav: {
    products: 'Productos',
    login: 'Iniciar sesión',
    register: 'Registro',
    logout: 'Salir',
    admin: 'Admin',
  },

  // Products
  products: {
    title: 'Productos',
    empty: 'No hay productos disponibles',
    error: 'Error al cargar productos',
    currency: '€',
    filterAll: 'Todas',
    filterEmpty: 'No hay productos en esta categoría.',
    notFound: 'Producto no encontrado',
    noVariants: 'Sin variantes disponibles',
    noColor: 'Sin color',
    noScent: 'Sin olor',
    stock: 'Stock',
    basePrice: 'Precio base',
    variantPrice: 'Precio',
  },

  // Contact
  contact: {
    title: 'Contacto',
    subtitle: 'Escríbenos un mensaje',
    loginRequired: 'Debes iniciar sesión para enviarnos un mensaje.',
    goLogin: 'Iniciar sesión',
    goRegister: 'Registrarse',
    fieldName: 'Nombre',
    fieldTitle: 'Título',
    fieldMessage: 'Mensaje',
    send: 'Enviar',
    sending: 'Enviando…',
    success: 'Mensaje enviado. Gracias por escribirnos.',
    error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
  },

  // Auth
  auth: {
    email: 'Correo electrónico',
    password: 'Contraseña',
    displayName: 'Nombre',
    loginTitle: 'Iniciar sesión',
    registerTitle: 'Registro',
    loginButton: 'Entrar',
    registerButton: 'Registrarse',
    noAccount: '¿No tienes cuenta? Regístrate',
    hasAccount: '¿Ya tienes cuenta? Inicia sesión',
  },

  // Cart
  cart: {
    title: 'Tu carrito',
    subtitle: 'Los productos que estás comprando',
    empty: 'Tu carrito está vacío.',
    goShop: 'Ver la colección',
    loginRequired: 'Debes iniciar sesión para tener un carrito.',
    goLogin: 'Iniciar sesión',
    goRegister: 'Registrarse',
    colProduct: 'Producto',
    colUnitPrice: 'Precio',
    colQuantity: 'Cantidad',
    colLineTotal: 'Total',
    remove: 'Eliminar',
    total: 'Total',
    checkout: 'Finalizar compra',
    loginToAdd: 'Inicia sesión para comprar',
    added: 'Añadido al carrito',
    headerLink: 'Carrito',
    increase: 'Aumentar cantidad',
    decrease: 'Disminuir cantidad',
    close: 'Cerrar',
    viewFull: 'Ver carrito completo',
    updateError: 'No se pudo actualizar el carrito. Vuelve a intentarlo.',
  },

  // Admin
  admin: {
    title: 'Panel de administración',
    colId: 'ID',
    colName: 'Nombre',
    colBasePrice: 'Precio base',
    colVariants: 'Variantes',
    colActive: 'Activo',
    yes: '✓',
    no: '✗',

    // Tabs
    tabProducts: 'Productos',
    tabScents: 'Olores',
    tabColors: 'Colores',

    // Shared actions
    create: 'Crear',
    edit: 'Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    activate: 'Activar',
    deactivate: 'Desactivar',
    silence: 'Silenciar',
    unsilence: 'Mostrar',
    confirmDelete: '¿Seguro que quieres eliminar este elemento?',
    saving: 'Guardando...',
    saveError: 'No se pudo guardar',
    deleteError: 'No se pudo eliminar',
    emptyList: 'No hay elementos',

    // Product form
    productNew: 'Nuevo producto',
    productEdit: 'Editar producto',
    fieldName: 'Nombre',
    fieldShortDesc: 'Descripción corta',
    fieldLongDesc: 'Descripción larga',
    fieldBasePrice: 'Precio base',
    fieldImages: 'Imágenes (una URL por línea)',
    fieldActive: 'Activo',
    fieldFeatured: 'Destacado',

    // Variants section (inside product form)
    variantsTitle: 'Variantes',
    variantNew: 'Añadir variante',
    variantEdit: 'Editar variante',
    variantSave: 'Guardar variante',
    variantCancel: 'Cancelar variante',
    variantDelete: 'Eliminar variante',
    fieldColor: 'Color',
    fieldScent: 'Olor',
    fieldPrice: 'Precio (vacío = hereda precio base)',
    fieldStock: 'Stock',
    noColor: 'Sin color',
    noScent: 'Sin olor',
    colColor: 'Color',
    colScent: 'Olor',
    colPrice: 'Precio',
    colStock: 'Stock',

    // Scent description
    fieldDescription: 'Descripción',
    colDescription: 'Descripción',

    // Scent / Color forms
    scentNew: 'Nuevo olor',
    colorNew: 'Nuevo color',
    fieldHex: 'Color (hex)',
    colHex: 'Hex',

    // Categories panel (inside product form)
    categoriesTitle: 'Categorías',
    categoriesSave: 'Guardar categorías',

    // Categories tab
    tabCategories: 'Categorías',
    categoryNew: 'Nueva categoría',
    categoryAssignTitle: 'Asignar velas a la categoría',
    assign: 'Asignar',

    // Messages tab
    tabMessages: 'Mensajes',
    msgViewActive: 'Activos',
    msgViewArchived: 'Archivados',
    msgColTitle: 'Título',
    msgColBody: 'Mensaje',
    msgColEmail: 'Correo',
    msgColDate: 'Enviado',
    msgMarkRead: 'Marcar como leído',
    msgDelete: 'Eliminar definitivamente',
    msgSelectPrompt: 'Selecciona un mensaje para ver los detalles',
  },
}

export type Translations = typeof es
