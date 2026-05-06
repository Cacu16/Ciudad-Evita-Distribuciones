import './style.css'

type Product = {
  id: string
  name: string
  category: string
  description: string
  presentation: string
  price: number
  featured: boolean
  image: string
}

type Cart = Record<string, number>

type Filters = {
  search: string
  category: string
}

type Customer = {
  name: string
  business: string
  phone: string
  address: string
  notes: string
}

type Config = {
  businessName: string
  whatsappNumber: string
  tagline: string
  deliveryZone: string
  paymentMethods: string
  minOrder: number
}

type ProductDraft = {
  id: string | null
  name: string
  category: string
  description: string
  presentation: string
  price: string
  featured: boolean
  image: string
}

type Notice = {
  type: 'success' | 'warning'
  text: string
}

const STORAGE_KEYS = {
  products: 'ced-products',
  cart: 'ced-cart',
  customer: 'ced-customer',
  config: 'ced-config',
  adminPin: 'ced-admin-pin',
} as const

const DEFAULT_ADMIN_PIN = '2468'

const defaultProducts: Product[] = [
  {
    id: 'yerba-canarias',
    name: 'Yerba Canarias',
    category: 'Almacen',
    description: 'Sabor intenso, ideal para reposicion rapida en kioscos y despensas.',
    presentation: '1 kg',
    price: 7800,
    featured: true,
    image: '',
  },
  {
    id: 'aceite-natura',
    name: 'Aceite Natura',
    category: 'Almacen',
    description: 'Botella pet con salida practica para uso diario.',
    presentation: '900 ml',
    price: 3100,
    featured: false,
    image: '',
  },
  {
    id: 'lavandina-ayudin',
    name: 'Lavandina Ayudin',
    category: 'Limpieza',
    description: 'Desinfeccion y limpieza general para el hogar y comercio.',
    presentation: '2 l',
    price: 1850,
    featured: true,
    image: '',
  },
  {
    id: 'detergente-magistral',
    name: 'Detergente Magistral',
    category: 'Limpieza',
    description: 'Rinde mucho y funciona bien para reposicion en volumen.',
    presentation: '750 ml',
    price: 2100,
    featured: false,
    image: '',
  },
  {
    id: 'gaseosa-coca',
    name: 'Coca-Cola',
    category: 'Bebidas',
    description: 'Presentacion familiar para almacenes y autoservicios.',
    presentation: '2.25 l',
    price: 2950,
    featured: true,
    image: '',
  },
  {
    id: 'agua-villa-del-sur',
    name: 'Agua Villa del Sur',
    category: 'Bebidas',
    description: 'Agua sin gas con alta rotacion para pedidos mixtos.',
    presentation: '1.5 l',
    price: 1250,
    featured: false,
    image: '',
  },
]

const defaultCustomer: Customer = {
  name: '',
  business: '',
  phone: '',
  address: '',
  notes: '',
}

const defaultConfig: Config = {
  businessName: 'Ciudad Evita Distribuciones',
  whatsappNumber: '5491132465579',
  tagline: 'Catalogo digital para pedidos rapidos por WhatsApp.',
  deliveryZone: 'Ciudad Evita y alrededores',
  paymentMethods: 'Transferencia, efectivo o Mercado Pago',
  minOrder: 0,
}

const emptyProductDraft = (): ProductDraft => ({
  id: null,
  name: '',
  category: '',
  description: '',
  presentation: '',
  price: '',
  featured: false,
  image: '',
})

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor principal.')
}

const loadState = <T>(key: string, fallback: T): T => {
  try {
    const rawValue = localStorage.getItem(key)
    return rawValue ? (JSON.parse(rawValue) as T) : fallback
  } catch {
    return fallback
  }
}

const saveState = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const storedConfig = loadState<Config>(STORAGE_KEYS.config, defaultConfig)
const initialConfig: Config = {
  ...defaultConfig,
  ...storedConfig,
  whatsappNumber: storedConfig.whatsappNumber?.trim() || defaultConfig.whatsappNumber,
}

const state = {
  products: loadState<Product[]>(STORAGE_KEYS.products, defaultProducts),
  cart: loadState<Cart>(STORAGE_KEYS.cart, {}),
  customer: loadState<Customer>(STORAGE_KEYS.customer, defaultCustomer),
  config: initialConfig,
  adminPin: loadState<string>(STORAGE_KEYS.adminPin, DEFAULT_ADMIN_PIN),
  configDraft: { ...initialConfig },
  adminPinDraft: loadState<string>(STORAGE_KEYS.adminPin, DEFAULT_ADMIN_PIN),
  adminLogin: '',
  isAdminAuthenticated: false,
  isAdminAccessVisible: false,
  adminRevealCount: 0,
  adminRevealStartedAt: 0,
  filters: {
    search: '',
    category: 'Todas',
  } as Filters,
  productDraft: emptyProductDraft(),
  notice: null as Notice | null,
}

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '')

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }

    reader.onerror = () => {
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }

    reader.readAsDataURL(file)
  })

const getCategories = () => {
  const categories = new Set(state.products.map((product) => product.category.trim()).filter(Boolean))
  return ['Todas', ...Array.from(categories).sort((a, b) => a.localeCompare(b))]
}

const getFilteredProducts = () => {
  const query = state.filters.search.trim().toLowerCase()
  return state.products.filter((product) => {
    const matchesCategory =
      state.filters.category === 'Todas' || product.category === state.filters.category
    const searchableText = [
      product.name,
      product.category,
      product.description,
      product.presentation,
    ]
      .join(' ')
      .toLowerCase()
    const matchesSearch = !query || searchableText.includes(query)
    return matchesCategory && matchesSearch
  })
}

const getCartEntries = () =>
  Object.entries(state.cart)
    .map(([productId, quantity]) => ({
      product: state.products.find((item) => item.id === productId),
      quantity,
    }))
    .filter((entry): entry is { product: Product; quantity: number } => Boolean(entry.product))

const getCartCount = () => getCartEntries().reduce((total, entry) => total + entry.quantity, 0)

const getCartTotal = () =>
  getCartEntries().reduce((total, entry) => total + entry.product.price * entry.quantity, 0)

const persistCart = () => {
  saveState(STORAGE_KEYS.cart, state.cart)
}

const persistProducts = () => {
  saveState(STORAGE_KEYS.products, state.products)
}

const persistCustomer = () => {
  saveState(STORAGE_KEYS.customer, state.customer)
}

const persistConfig = () => {
  saveState(STORAGE_KEYS.config, state.config)
}

const persistAdminPin = () => {
  saveState(STORAGE_KEYS.adminPin, state.adminPin)
}

const setNotice = (notice: Notice | null) => {
  state.notice = notice
}

const requireAdminAccess = () => {
  if (state.isAdminAuthenticated) {
    return true
  }

  setNotice({
    type: 'warning',
    text: 'Solo los administradores pueden gestionar el catalogo.',
  })
  render()
  return false
}

const updateCartQuantity = (productId: string, nextQuantity: number) => {
  if (nextQuantity <= 0) {
    delete state.cart[productId]
  } else {
    state.cart[productId] = nextQuantity
  }
  persistCart()
  setNotice(null)
  render()
}

const addToCart = (productId: string) => {
  const currentQuantity = state.cart[productId] ?? 0
  updateCartQuantity(productId, currentQuantity + 1)
}

const clearCart = () => {
  state.cart = {}
  persistCart()
  render()
}

const saveProduct = () => {
  if (!requireAdminAccess()) {
    return
  }

  const editingProductId = state.productDraft.id
  const name = state.productDraft.name.trim()
  const category = state.productDraft.category.trim()
  const description = state.productDraft.description.trim()
  const presentation = state.productDraft.presentation.trim()
  const price = Number(state.productDraft.price)
  const image = state.productDraft.image.trim()

  if (!name || !category || !description || !presentation || !price) {
    setNotice({
      type: 'warning',
      text: 'Completa nombre, categoria, descripcion, presentacion y precio para cargar el producto.',
    })
    render()
    return
  }

  if (editingProductId) {
    state.products = state.products.map((product) =>
      product.id === editingProductId
        ? {
            ...product,
            name,
            category,
            description,
            presentation,
            price,
            featured: state.productDraft.featured,
            image,
          }
        : product,
    )
  } else {
    state.products = [
      {
        id: crypto.randomUUID(),
        name,
        category,
        description,
        presentation,
        price,
        featured: state.productDraft.featured,
        image,
      },
      ...state.products,
    ]
  }
  state.productDraft = emptyProductDraft()
  persistProducts()
  setNotice({
    type: 'success',
    text: editingProductId ? 'Producto actualizado correctamente.' : 'Producto agregado al catalogo.',
  })
  render()
}

const startEditingProduct = (productId: string) => {
  if (!requireAdminAccess()) {
    return
  }

  const product = state.products.find((item) => item.id === productId)

  if (!product) {
    setNotice({
      type: 'warning',
      text: 'No se encontro el producto que querias editar.',
    })
    render()
    return
  }

  state.productDraft = {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    presentation: product.presentation,
    price: String(product.price),
    featured: product.featured,
    image: product.image,
  }
  setNotice({
    type: 'success',
    text: `Editando ${product.name}.`,
  })
  render()
}

const cancelEditingProduct = () => {
  state.productDraft = emptyProductDraft()
  setNotice({
    type: 'success',
    text: 'Edicion cancelada.',
  })
  render()
}

const removeProduct = (productId: string) => {
  if (!requireAdminAccess()) {
    return
  }

  state.products = state.products.filter((product) => product.id !== productId)
  delete state.cart[productId]
  if (state.productDraft.id === productId) {
    state.productDraft = emptyProductDraft()
  }
  persistProducts()
  persistCart()
  setNotice({
    type: 'success',
    text: 'Producto eliminado del catalogo.',
  })
  render()
}

const saveConfig = () => {
  if (!requireAdminAccess()) {
    return
  }

  const adminPinDraft = state.adminPinDraft.trim()

  if (adminPinDraft.length < 4) {
    setNotice({
      type: 'warning',
      text: 'La clave de administrador debe tener al menos 4 caracteres.',
    })
    render()
    return
  }

  const normalizedDraft: Config = {
    businessName: state.configDraft.businessName.trim() || defaultConfig.businessName,
    whatsappNumber: sanitizePhoneNumber(state.configDraft.whatsappNumber),
    tagline: state.configDraft.tagline.trim() || defaultConfig.tagline,
    deliveryZone: state.configDraft.deliveryZone.trim() || defaultConfig.deliveryZone,
    paymentMethods: state.configDraft.paymentMethods.trim() || defaultConfig.paymentMethods,
    minOrder: Number(state.configDraft.minOrder) || 0,
  }

  state.config = normalizedDraft
  state.configDraft = { ...normalizedDraft }
  state.adminPin = adminPinDraft
  state.adminPinDraft = adminPinDraft
  persistConfig()
  persistAdminPin()
  setNotice({
    type: 'success',
    text: 'Configuracion guardada. El boton de WhatsApp ya usara estos datos.',
  })
  render()
}

const loginAdmin = () => {
  if (state.adminLogin.trim() !== state.adminPin) {
    setNotice({
      type: 'warning',
      text: 'La clave de administrador no coincide.',
    })
    render()
    return
  }

  state.isAdminAuthenticated = true
  state.adminLogin = ''
  setNotice({
    type: 'success',
    text: 'Acceso de administrador habilitado.',
  })
  render()
}

const logoutAdmin = () => {
  state.isAdminAuthenticated = false
  state.adminLogin = ''
  state.isAdminAccessVisible = false
  state.adminRevealCount = 0
  state.adminRevealStartedAt = 0
  setNotice({
    type: 'success',
    text: 'Sesion de administrador cerrada.',
  })
  render()
}

const revealAdminAccess = () => {
  const now = Date.now()

  if (!state.adminRevealStartedAt || now - state.adminRevealStartedAt > 6000) {
    state.adminRevealStartedAt = now
    state.adminRevealCount = 0
  }

  state.adminRevealCount += 1

  if (state.adminRevealCount < 5) {
    return
  }

  state.isAdminAccessVisible = true
  state.adminRevealCount = 0
  state.adminRevealStartedAt = 0
  setNotice({
    type: 'success',
    text: 'Acceso de administrador visible.',
  })
  render()
}

const buildWhatsappMessage = () => {
  const cartEntries = getCartEntries()
  const lines = [
    `Hola ${state.config.businessName}, quiero hacer este pedido:`,
    '',
    ...cartEntries.map(
      (entry) =>
        `- ${entry.product.name} x${entry.quantity} (${entry.product.presentation}) - ${currency.format(entry.product.price * entry.quantity)}`,
    ),
    '',
    `Total estimado: ${currency.format(getCartTotal())}`,
    '',
    'Datos del cliente:',
    `- Nombre: ${state.customer.name || 'Sin completar'}`,
    `- Comercio / referencia: ${state.customer.business || 'Sin completar'}`,
    `- Telefono: ${state.customer.phone || 'Sin completar'}`,
    `- Direccion: ${state.customer.address || 'Sin completar'}`,
    `- Observaciones: ${state.customer.notes || 'Sin observaciones'}`,
  ]

  return lines.join('\n')
}

const openWhatsappOrder = () => {
  const whatsappNumber = sanitizePhoneNumber(state.config.whatsappNumber)
  const cartEntries = getCartEntries()

  if (!whatsappNumber) {
    setNotice({
      type: 'warning',
      text: 'Primero guarda un numero de WhatsApp en la configuracion del negocio.',
    })
    render()
    return
  }

  if (!cartEntries.length) {
    setNotice({
      type: 'warning',
      text: 'Agrega al menos un producto al carrito antes de enviar el pedido.',
    })
    render()
    return
  }

  if (!state.customer.name.trim() || !state.customer.phone.trim()) {
    setNotice({
      type: 'warning',
      text: 'Completa al menos nombre y telefono del cliente para enviar el pedido.',
    })
    render()
    return
  }

  if (state.config.minOrder > 0 && getCartTotal() < state.config.minOrder) {
    setNotice({
      type: 'warning',
      text: `El pedido minimo configurado es ${currency.format(state.config.minOrder)}.`,
    })
    render()
    return
  }

  const message = encodeURIComponent(buildWhatsappMessage())
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

  setNotice({
    type: 'success',
    text: 'Se abrio WhatsApp con el pedido listo para enviar.',
  })
  render()
}

const renderProductCards = () => {
  const products = getFilteredProducts()

  if (!products.length) {
    return `
      <div class="empty-state">
        <p>No hay productos que coincidan con la busqueda.</p>
        <span>Prueba con otra categoria o limpia el filtro.</span>
      </div>
    `
  }

  return products
    .map((product) => {
      const quantity = state.cart[product.id] ?? 0
      const productMedia = product.image
        ? `
            <div class="product-card__media">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" />
            </div>
          `
        : `
            <div class="product-card__media product-card__media--placeholder">
              <span>Sin foto</span>
            </div>
          `

      return `
        <article class="product-card">
          <div class="product-card__top">
            <div>
              <span class="chip">${escapeHtml(product.category)}</span>
              ${product.featured ? '<span class="chip chip--featured">Destacado</span>' : ''}
            </div>
            ${
              state.isAdminAuthenticated
                ? `
                  <div class="admin-card-actions">
                    <button class="ghost-button" type="button" data-edit-product="${product.id}">
                      Editar
                    </button>
                    <button class="ghost-button ghost-button--danger" type="button" data-remove-product="${product.id}">
                      Quitar
                    </button>
                  </div>
                `
                : ''
            }
          </div>
          ${productMedia}
          <div class="product-card__body">
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="product-meta">
              <span>${escapeHtml(product.presentation)}</span>
              <strong>${currency.format(product.price)}</strong>
            </div>
          </div>
          <div class="product-card__actions">
            <button class="ghost-button" type="button" data-decrease-product="${product.id}" ${quantity === 0 ? 'disabled' : ''}>
              -
            </button>
            <span class="quantity-pill">${quantity}</span>
            <button class="primary-button" type="button" data-add-product="${product.id}">
              ${quantity > 0 ? 'Sumar' : 'Agregar'}
            </button>
          </div>
        </article>
      `
    })
    .join('')
}

const renderCartItems = () => {
  const entries = getCartEntries()

  if (!entries.length) {
    return `
      <div class="empty-state empty-state--compact">
        <p>El carrito esta vacio.</p>
        <span>Selecciona productos del catalogo para empezar.</span>
      </div>
    `
  }

  return entries
    .map(
      (entry) => `
        <div class="cart-item">
          <div>
            <h4>${escapeHtml(entry.product.name)}</h4>
            <p>${escapeHtml(entry.product.presentation)}</p>
          </div>
          <div class="cart-item__aside">
            <strong>${currency.format(entry.product.price * entry.quantity)}</strong>
            <div class="stepper">
              <button type="button" class="ghost-button" data-cart-decrease="${entry.product.id}">-</button>
              <span>${entry.quantity}</span>
              <button type="button" class="ghost-button" data-cart-increase="${entry.product.id}">+</button>
            </div>
          </div>
        </div>
      `,
    )
    .join('')
}

const render = () => {
  const categories = getCategories()
  const cartCount = getCartCount()
  const cartTotal = getCartTotal()
  const noticeClass = state.notice ? `notice notice--${state.notice.type}` : 'notice notice--hidden'
  const minOrderLabel =
    state.config.minOrder > 0 ? currency.format(state.config.minOrder) : 'Sin minimo configurado'
  const shouldShowAdminSection = state.isAdminAuthenticated || state.isAdminAccessVisible
  const isEditingProduct = Boolean(state.productDraft.id)
  const adminSectionContent = state.isAdminAuthenticated
    ? `
        <div class="section-heading">
          <div>
            <span class="section-kicker">Gestion interna</span>
            <h2>Configurar negocio y cargar productos</h2>
          </div>
          <button class="ghost-button" type="button" id="logout-admin">
            Cerrar acceso admin
          </button>
        </div>

        <div class="admin-grid">
          <form id="config-form" class="form-card">
            <h3>Configuracion del negocio</h3>
            <label>
              <span>Nombre comercial</span>
              <input data-config-field="businessName" value="${escapeHtml(state.configDraft.businessName)}" placeholder="Ciudad Evita Distribuciones" />
            </label>
            <label>
              <span>Numero de WhatsApp</span>
              <input data-config-field="whatsappNumber" value="${escapeHtml(state.configDraft.whatsappNumber)}" placeholder="54911..." />
            </label>
            <label>
              <span>Bajada o frase principal</span>
              <input data-config-field="tagline" value="${escapeHtml(state.configDraft.tagline)}" placeholder="Catalogo digital para pedidos rapidos" />
            </label>
            <label>
              <span>Zona de entrega</span>
              <input data-config-field="deliveryZone" value="${escapeHtml(state.configDraft.deliveryZone)}" placeholder="Ciudad Evita y alrededores" />
            </label>
            <label>
              <span>Medios de pago</span>
              <input data-config-field="paymentMethods" value="${escapeHtml(state.configDraft.paymentMethods)}" placeholder="Transferencia, efectivo..." />
            </label>
            <label>
              <span>Pedido minimo</span>
              <input data-config-field="minOrder" type="number" min="0" step="100" value="${state.configDraft.minOrder}" />
            </label>
            <label>
              <span>Clave de administrador</span>
              <input data-admin-field="pinDraft" type="password" value="${escapeHtml(state.adminPinDraft)}" placeholder="Nueva clave de acceso" />
            </label>
            <button class="primary-button" type="submit">Guardar configuracion</button>
          </form>

          <form id="product-form" class="form-card">
            <h3>${isEditingProduct ? 'Editar producto' : 'Cargar producto'}</h3>
            ${
              isEditingProduct
                ? `
                    <p class="admin-note">Estas modificando un producto existente. Guarda los cambios para actualizarlo.</p>
                  `
                : ''
            }
            <label>
              <span>Nombre</span>
              <input data-product-field="name" value="${escapeHtml(state.productDraft.name)}" placeholder="Ej: Azucar Ledesma" />
            </label>
            <label>
              <span>Categoria</span>
              <input data-product-field="category" value="${escapeHtml(state.productDraft.category)}" placeholder="Ej: Almacen" />
            </label>
            <label>
              <span>Descripcion</span>
              <textarea data-product-field="description" rows="3" placeholder="Describe el producto y su salida comercial.">${escapeHtml(state.productDraft.description)}</textarea>
            </label>
            <label>
              <span>Presentacion</span>
              <input data-product-field="presentation" value="${escapeHtml(state.productDraft.presentation)}" placeholder="Ej: 1 kg / pack x6" />
            </label>
            <label>
              <span>Precio</span>
              <input data-product-field="price" type="number" min="1" step="1" value="${escapeHtml(state.productDraft.price)}" placeholder="Ej: 3500" />
            </label>
            <label>
              <span>Foto del producto</span>
              <input data-product-upload="image" type="file" accept="image/*" />
            </label>
            ${
              state.productDraft.image
                ? `
                  <div class="product-image-preview">
                    <img src="${state.productDraft.image}" alt="Vista previa del producto" />
                    <button class="ghost-button" type="button" id="clear-product-image">
                      Quitar foto
                    </button>
                  </div>
                `
                : `
                  <div class="product-image-preview product-image-preview--empty">
                    <span>Cuando selecciones una imagen, la vista previa aparece aca.</span>
                  </div>
                `
            }
            <label class="checkbox-row">
              <input data-product-field="featured" type="checkbox" ${state.productDraft.featured ? 'checked' : ''} />
              <span>Marcar como destacado</span>
            </label>
            <div class="form-actions">
              <button class="primary-button" type="submit">${isEditingProduct ? 'Guardar cambios' : 'Agregar al catalogo'}</button>
              ${
                isEditingProduct
                  ? `
                      <button class="ghost-button" type="button" id="cancel-product-edit">
                        Cancelar edicion
                      </button>
                    `
                  : ''
              }
            </div>
          </form>
        </div>
      `
    : `
        <div class="section-heading">
          <div>
            <span class="section-kicker">Gestion interna</span>
            <h2>Acceso solo para administradores</h2>
          </div>
          <p class="admin-note">Los clientes solo pueden comprar. La carga y edicion de productos queda bloqueada.</p>
        </div>

        <form id="admin-login-form" class="form-card admin-login-card">
          <h3>Ingresar como administrador</h3>
          <label>
            <span>Clave de acceso</span>
            <input data-admin-field="login" type="password" value="${escapeHtml(state.adminLogin)}" placeholder="Ingresa tu clave" />
          </label>
          <button class="primary-button" type="submit">Entrar al panel</button>
        </form>
      `

  app.innerHTML = `
    <div class="page-shell">
      <header class="hero-section">
        <div class="hero-copy">
          <span class="eyebrow">Catalogo digital</span>
          <h1 id="admin-reveal-trigger">${escapeHtml(state.config.businessName)}</h1>
          <p class="hero-text">${escapeHtml(state.config.tagline)}</p>
          <div class="hero-badges">
            <span>${escapeHtml(state.config.deliveryZone)}</span>
            <span>${escapeHtml(state.config.paymentMethods)}</span>
            <span>Pedido minimo: ${minOrderLabel}</span>
          </div>
        </div>

        <aside class="hero-panel">
          <p class="hero-panel__label">Resumen rapido</p>
          <div class="hero-panel__metric">
            <strong>${state.products.length}</strong>
            <span>productos cargados</span>
          </div>
          <div class="hero-panel__metric">
            <strong>${cartCount}</strong>
            <span>items en carrito</span>
          </div>
          <div class="hero-panel__metric">
            <strong>${currency.format(cartTotal)}</strong>
            <span>total estimado</span>
          </div>
        </aside>
      </header>

      <div class="${noticeClass}">
        <span>${state.notice ? escapeHtml(state.notice.text) : ''}</span>
      </div>

      <main class="layout-grid">
        <section class="catalog-panel">
          <div class="section-heading">
            <div>
              <span class="section-kicker">Compra</span>
              <h2>Catalogo para clientes</h2>
            </div>
            <div class="filters">
              <label>
                <span>Buscar</span>
                <input id="search-input" type="search" value="${escapeHtml(state.filters.search)}" placeholder="Yerba, detergente, gaseosa..." />
              </label>
              <label>
                <span>Categoria</span>
                <select id="category-filter">
                  ${categories
                    .map(
                      (category) =>
                        `<option value="${escapeHtml(category)}" ${category === state.filters.category ? 'selected' : ''}>${escapeHtml(category)}</option>`,
                    )
                    .join('')}
                </select>
              </label>
            </div>
          </div>

          <div class="product-grid">
            ${renderProductCards()}
          </div>
        </section>

        <aside class="cart-panel">
          <div class="section-heading section-heading--compact">
            <div>
              <span class="section-kicker">Pedido</span>
              <h2>Carrito</h2>
            </div>
            <button class="ghost-button" type="button" id="clear-cart" ${cartCount === 0 ? 'disabled' : ''}>
              Vaciar
            </button>
          </div>

          <div class="cart-items">
            ${renderCartItems()}
          </div>

          <div class="cart-summary">
            <div>
              <span>Total estimado</span>
              <strong>${currency.format(cartTotal)}</strong>
            </div>
            <p>El pedido se abre en WhatsApp para que puedas terminar la venta y coordinar entrega.</p>
          </div>

          <form id="customer-form" class="form-card">
            <h3>Datos del cliente</h3>
            <label>
              <span>Nombre y apellido</span>
              <input name="name" data-customer-field="name" value="${escapeHtml(state.customer.name)}" placeholder="Ej: Maria Gomez" />
            </label>
            <label>
              <span>Comercio o referencia</span>
              <input name="business" data-customer-field="business" value="${escapeHtml(state.customer.business)}" placeholder="Ej: Almacen Lo de Marta" />
            </label>
            <label>
              <span>Telefono</span>
              <input name="phone" data-customer-field="phone" value="${escapeHtml(state.customer.phone)}" placeholder="Ej: 11 5555 5555" />
            </label>
            <label>
              <span>Direccion</span>
              <input name="address" data-customer-field="address" value="${escapeHtml(state.customer.address)}" placeholder="Ej: Crovara 1234" />
            </label>
            <label>
              <span>Observaciones</span>
              <textarea name="notes" data-customer-field="notes" rows="4" placeholder="Horarios, piso, entrecalles...">${escapeHtml(state.customer.notes)}</textarea>
            </label>
            <button class="primary-button primary-button--full" type="button" id="send-order">
              Enviar pedido por WhatsApp
            </button>
          </form>
        </aside>
      </main>

      ${
        shouldShowAdminSection
          ? `
              <section class="admin-section">
                ${adminSectionContent}
              </section>
            `
          : ''
      }
    </div>
  `
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement

  if (target.id === 'admin-reveal-trigger') {
    revealAdminAccess()
    return
  }

  const addButton = target.closest<HTMLElement>('[data-add-product]')
  if (addButton?.dataset.addProduct) {
    addToCart(addButton.dataset.addProduct)
    return
  }

  const decreaseProductButton = target.closest<HTMLElement>('[data-decrease-product]')
  if (decreaseProductButton?.dataset.decreaseProduct) {
    const productId = decreaseProductButton.dataset.decreaseProduct
    const currentQuantity = state.cart[productId] ?? 0
    updateCartQuantity(productId, currentQuantity - 1)
    return
  }

  const cartIncreaseButton = target.closest<HTMLElement>('[data-cart-increase]')
  if (cartIncreaseButton?.dataset.cartIncrease) {
    addToCart(cartIncreaseButton.dataset.cartIncrease)
    return
  }

  const cartDecreaseButton = target.closest<HTMLElement>('[data-cart-decrease]')
  if (cartDecreaseButton?.dataset.cartDecrease) {
    const productId = cartDecreaseButton.dataset.cartDecrease
    const currentQuantity = state.cart[productId] ?? 0
    updateCartQuantity(productId, currentQuantity - 1)
    return
  }

  const removeProductButton = target.closest<HTMLElement>('[data-remove-product]')
  if (removeProductButton?.dataset.removeProduct) {
    removeProduct(removeProductButton.dataset.removeProduct)
    return
  }

  const editProductButton = target.closest<HTMLElement>('[data-edit-product]')
  if (editProductButton?.dataset.editProduct) {
    startEditingProduct(editProductButton.dataset.editProduct)
    return
  }

  if (target.id === 'clear-cart') {
    clearCart()
    return
  }

  if (target.id === 'send-order') {
    openWhatsappOrder()
    return
  }

  if (target.id === 'logout-admin') {
    logoutAdmin()
    return
  }

  if (target.id === 'clear-product-image') {
    state.productDraft = {
      ...state.productDraft,
      image: '',
    }
    render()
    return
  }

  if (target.id === 'cancel-product-edit') {
    cancelEditingProduct()
  }
})

app.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

  if (target.id === 'search-input') {
    state.filters.search = target.value
    render()
    return
  }

  if (target.id === 'category-filter') {
    state.filters.category = target.value
    render()
    return
  }

  const customerField = target.dataset.customerField as keyof Customer | undefined
  if (customerField) {
    state.customer[customerField] = target.value
    persistCustomer()
    return
  }

  const configField = target.dataset.configField as keyof Config | undefined
  if (configField) {
    const value = target instanceof HTMLInputElement && target.type === 'number' ? Number(target.value) : target.value
    state.configDraft = {
      ...state.configDraft,
      [configField]: value,
    }
    return
  }

  const adminField = target.dataset.adminField
  if (adminField === 'login') {
    state.adminLogin = target.value
    return
  }

  if (adminField === 'pinDraft') {
    state.adminPinDraft = target.value
    return
  }

  const productField = target.dataset.productField as keyof ProductDraft | undefined
  if (productField) {
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value
    state.productDraft = {
      ...state.productDraft,
      [productField]: value,
    }
  }
})

app.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement

  if (target.dataset.productUpload !== 'image') {
    return
  }

  const file = target.files?.[0]

  if (!file) {
    state.productDraft = {
      ...state.productDraft,
      image: '',
    }
    render()
    return
  }

  if (!file.type.startsWith('image/')) {
    setNotice({
      type: 'warning',
      text: 'Selecciona un archivo de imagen valido.',
    })
    render()
    return
  }

  if (file.size > 1_500_000) {
    setNotice({
      type: 'warning',
      text: 'La imagen es muy pesada. Intenta con una foto de menos de 1.5 MB.',
    })
    render()
    return
  }

  try {
    const image = await readFileAsDataUrl(file)
    state.productDraft = {
      ...state.productDraft,
      image,
    }
    setNotice({
      type: 'success',
      text: 'Foto cargada en la vista previa del producto.',
    })
  } catch {
    setNotice({
      type: 'warning',
      text: 'No se pudo cargar la foto seleccionada.',
    })
  }

  render()
})

app.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement

  if (form.id === 'config-form') {
    saveConfig()
    return
  }

  if (form.id === 'admin-login-form') {
    loginAdmin()
    return
  }

  if (form.id === 'product-form') {
    saveProduct()
  }
})

render()
