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
    notFound: 'Producto no encontrado',
    noVariants: 'Sin variantes disponibles',
    noColor: 'Sin color',
    noScent: 'Sin olor',
    stock: 'Stock',
    basePrice: 'Precio base',
    variantPrice: 'Precio',
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

    // Scent / Color forms
    scentNew: 'Nuevo olor',
    colorNew: 'Nuevo color',
    fieldHex: 'Color (hex)',
    colHex: 'Hex',
  },
}

export type Translations = typeof es
