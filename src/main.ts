import './style.css'
import { DEFAULT_CONFIG, EMPTY_PRODUCT_DRAFT, MOBILE_BREAKPOINT, PRODUCT_IMAGE_MAX_BYTES, STORAGE_KEYS } from './constants'
import { currency, readFileAsDataUrl, sanitizePhoneNumber } from './lib/format'
import { removeStorage } from './lib/storage'
import {
  deleteAdminProduct,
  getCurrentAdmin,
  isSessionExpired,
  loginAdmin,
  logoutAdmin,
  saveAdminConfig,
  saveAdminProduct,
  syncLegacyCatalog,
} from './services/api'
import { hasPublicSupabaseConfig, loadCatalogFromSupabase, subscribeToCatalog } from './services/supabase-public'
import {
  applyCatalog,
  createInitialState,
  getLegacyConfig,
  getLegacyProducts,
  persistCart,
  persistCustomer,
  persistSession,
  selectCartEntries,
  selectCartTotal,
} from './state'
import type { Config, ConfigDraftErrors, Notice, Product, ProductDraftErrors } from './types'
import { renderApp } from './ui'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('No se encontro el contenedor principal.')
}

const state = createInitialState()
let noticeTimer: number | null = null
let unsubscribeRealtime: () => void = () => {}

const render = () => {
  app.innerHTML = renderApp(state)
}

const setNotice = (notice: Notice | null, autoHide = true) => {
  state.notice = notice

  if (noticeTimer) {
    window.clearTimeout(noticeTimer)
    noticeTimer = null
  }

  if (notice && autoHide) {
    noticeTimer = window.setTimeout(() => {
      state.notice = null
      render()
    }, 4200)
  }
}

const syncRouteFromHash = () => {
  state.route = window.location.hash.startsWith('#/admin') ? 'admin' : 'store'
  state.isCartDrawerOpen = false
}

const setStoreRoute = () => {
  window.location.hash = '#/'
}

const setAdminRoute = () => {
  window.location.hash = '#/admin'
}

const resetFilters = () => {
  state.filters = {
    ...state.filters,
    search: '',
    category: 'all',
    featured: 'all',
    sort: 'featured',
    page: 1,
  }
}

const ensureAdmin = () => {
  if (state.auth.session?.user.role === 'ADMIN') {
    return state.auth.session
  }

  setNotice(
    {
      type: 'warning',
      text: 'Necesitas iniciar sesion como administrador para continuar.',
    },
    true,
  )
  setAdminRoute()
  render()
  return null
}

const setCartQuantity = (productId: string, nextQuantity: number) => {
  if (nextQuantity <= 0) {
    delete state.cart[productId]
  } else {
    state.cart[productId] = nextQuantity
  }

  persistCart(state.cart)
  render()
}

const addToCart = (productId: string) => {
  const current = state.cart[productId] ?? 0
  setCartQuantity(productId, current + 1)
}

const clearCart = () => {
  state.cart = {}
  persistCart(state.cart)
  render()
}

const updateCustomerField = (field: keyof typeof state.customer, value: string) => {
  state.customer[field] = value
  persistCustomer(state.customer)
}

const validateProductDraft = (): ProductDraftErrors => {
  const errors: ProductDraftErrors = {}

  if (!state.productDraft.name.trim()) {
    errors.name = 'Ingresa un nombre.'
  }

  if (!state.productDraft.category.trim()) {
    errors.category = 'Ingresa una categoria.'
  }

  if (!state.productDraft.description.trim()) {
    errors.description = 'Agrega una descripcion breve.'
  }

  if (!state.productDraft.presentation.trim()) {
    errors.presentation = 'Completa la presentacion.'
  }

  if (!state.productDraft.price.trim() || Number(state.productDraft.price) <= 0) {
    errors.price = 'Ingresa un precio valido.'
  }

  return errors
}

const validateConfigDraft = (): ConfigDraftErrors => {
  const errors: ConfigDraftErrors = {}

  if (!state.configDraft.businessName.trim()) {
    errors.businessName = 'Ingresa el nombre del negocio.'
  }

  if (!sanitizePhoneNumber(state.configDraft.whatsappNumber)) {
    errors.whatsappNumber = 'Ingresa un numero de WhatsApp valido.'
  }

  if (!state.configDraft.tagline.trim()) {
    errors.tagline = 'Ingresa una bajada principal.'
  }

  if (!state.configDraft.deliveryZone.trim()) {
    errors.deliveryZone = 'Ingresa la zona de entrega.'
  }

  if (!state.configDraft.paymentMethods.trim()) {
    errors.paymentMethods = 'Ingresa al menos un medio de pago.'
  }

  if (Number(state.configDraft.minOrder) < 0) {
    errors.minOrder = 'El pedido minimo no puede ser negativo.'
  }

  return errors
}

const buildWhatsappMessage = () => {
  const cartEntries = selectCartEntries(state.products, state.cart)
  const lines = [
    `Hola ${state.config.businessName}, quiero hacer este pedido:`,
    '',
    ...cartEntries.map(
      (entry) =>
        `- ${entry.product.name} x${entry.quantity} (${entry.product.presentation}) - ${currency.format(entry.product.price * entry.quantity)}`,
    ),
    '',
    `Total estimado: ${currency.format(selectCartTotal(state.products, state.cart))}`,
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
  const cartEntries = selectCartEntries(state.products, state.cart)
  const whatsappNumber = sanitizePhoneNumber(state.config.whatsappNumber)

  if (!cartEntries.length) {
    setNotice({
      type: 'warning',
      text: 'Agrega al menos un producto antes de enviar el pedido.',
    })
    render()
    return
  }

  if (!whatsappNumber) {
    setNotice({
      type: 'warning',
      text: 'El negocio todavia no tiene un WhatsApp configurado.',
    })
    render()
    return
  }

  if (!state.customer.name.trim() || !state.customer.phone.trim()) {
    setNotice({
      type: 'warning',
      text: 'Completa al menos nombre y telefono para abrir el pedido.',
    })
    render()
    return
  }

  const total = selectCartTotal(state.products, state.cart)
  if (state.config.minOrder > 0 && total < state.config.minOrder) {
    setNotice({
      type: 'warning',
      text: `El pedido minimo configurado es ${currency.format(state.config.minOrder)}.`,
    })
    render()
    return
  }

  const encodedMessage = encodeURIComponent(buildWhatsappMessage())
  window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer')
  setNotice({
    type: 'success',
    text: 'WhatsApp se abrio con el pedido listo para enviar.',
  })
  render()
}

const loadCatalog = async (silent = false) => {
  if (!hasPublicSupabaseConfig) {
    state.isLoadingCatalog = false
    state.products = []
    state.config = { ...DEFAULT_CONFIG }
    state.configDraft = { ...DEFAULT_CONFIG }
    setNotice({
      type: 'warning',
      text: 'Faltan las variables publicas de Supabase para cargar el catalogo compartido.',
    })
    render()
    return
  }

  if (!silent) {
    state.isLoadingCatalog = true
    render()
  }

  try {
    const payload = await loadCatalogFromSupabase()
    applyCatalog(state, payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar el catalogo.'
    setNotice({
      type: 'warning',
      text: `No se pudo cargar el catalogo. ${message}`,
    })
  } finally {
    state.isLoadingCatalog = false
    render()
  }
}

const restoreSession = async () => {
  const currentSession = state.auth.session

  if (!currentSession || isSessionExpired(currentSession)) {
    state.auth.session = null
    persistSession(null)
    state.auth.isBootstrapping = false
    return
  }

  try {
    const user = await getCurrentAdmin(currentSession)
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Tu sesion ya no tiene permisos de administrador.')
    }

    state.auth.session = {
      ...currentSession,
      user,
    }
  } catch {
    state.auth.session = null
    persistSession(null)
  } finally {
    state.auth.isBootstrapping = false
  }
}

const submitAdminLogin = async () => {
  const email = state.auth.email.trim()
  const password = state.auth.password
  const errors: typeof state.auth.errors = {}

  if (!email) {
    errors.email = 'Ingresa tu email.'
  }

  if (!password) {
    errors.password = 'Ingresa tu contrasena.'
  }

  state.auth.errors = errors

  if (Object.keys(errors).length > 0) {
    render()
    return
  }

  state.auth.isSubmitting = true
  state.auth.errors = {}
  render()

  try {
    const session = await loginAdmin({ email, password })
    state.auth.session = session
    state.auth.email = ''
    state.auth.password = ''
    persistSession(session)
    setNotice({
      type: 'success',
      text: 'Sesion iniciada. Ya puedes gestionar el catalogo.',
    })
    setAdminRoute()
  } catch (error) {
    state.auth.errors.form = error instanceof Error ? error.message : 'No se pudo iniciar sesion.'
  } finally {
    state.auth.isSubmitting = false
    render()
  }
}

const closeAdminSession = async () => {
  await logoutAdmin(state.auth.session)
  state.auth.session = null
  state.auth.password = ''
  state.auth.errors = {}
  persistSession(null)
  setNotice({
    type: 'success',
    text: 'Sesion cerrada.',
  })
  setStoreRoute()
  render()
}

const saveProduct = async () => {
  const session = ensureAdmin()
  if (!session) {
    return
  }

  state.productErrors = validateProductDraft()
  if (Object.keys(state.productErrors).length > 0) {
    render()
    return
  }

  state.isSavingProduct = true
  render()

  const isEditing = Boolean(state.productDraft.id)
  const product: Product = {
    id: state.productDraft.id ?? crypto.randomUUID(),
    name: state.productDraft.name.trim(),
    category: state.productDraft.category.trim(),
    description: state.productDraft.description.trim(),
    presentation: state.productDraft.presentation.trim(),
    price: Number(state.productDraft.price),
    featured: state.productDraft.featured,
    image: state.productDraft.image.trim(),
  }

  try {
    await saveAdminProduct(session, product, isEditing)
    state.productDraft = EMPTY_PRODUCT_DRAFT()
    state.productErrors = {}
    setNotice({
      type: 'success',
      text: isEditing ? 'Producto actualizado correctamente.' : 'Producto publicado correctamente.',
    })
    await loadCatalog(true)
  } catch (error) {
    setNotice({
      type: 'warning',
      text: error instanceof Error ? error.message : 'No se pudo guardar el producto.',
    })
  } finally {
    state.isSavingProduct = false
    render()
  }
}

const saveConfig = async () => {
  const session = ensureAdmin()
  if (!session) {
    return
  }

  state.configErrors = validateConfigDraft()
  if (Object.keys(state.configErrors).length > 0) {
    render()
    return
  }

  state.isSavingConfig = true
  render()

  try {
    const normalizedConfig: Config = {
      businessName: state.configDraft.businessName.trim(),
      whatsappNumber: sanitizePhoneNumber(state.configDraft.whatsappNumber),
      tagline: state.configDraft.tagline.trim(),
      deliveryZone: state.configDraft.deliveryZone.trim(),
      paymentMethods: state.configDraft.paymentMethods.trim(),
      minOrder: Number(state.configDraft.minOrder) || 0,
    }

    const nextConfig = await saveAdminConfig(session, normalizedConfig)
    state.config = nextConfig
    state.configDraft = { ...nextConfig }
    state.configErrors = {}
    setNotice({
      type: 'success',
      text: 'Configuracion guardada y publicada.',
    })
    await loadCatalog(true)
  } catch (error) {
    setNotice({
      type: 'warning',
      text: error instanceof Error ? error.message : 'No se pudo guardar la configuracion.',
    })
  } finally {
    state.isSavingConfig = false
    render()
  }
}

const startEditProduct = (productId: string) => {
  const product = state.products.find((item) => item.id === productId)
  if (!product) {
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
  state.productErrors = {}
  window.scrollTo({ top: 0, behavior: 'smooth' })
  render()
}

const requestDeleteProduct = (productId: string, productName: string) => {
  state.confirmState = {
    type: 'delete-product',
    productId,
    productName,
  }
  render()
}

const confirmDeleteProduct = async () => {
  const session = ensureAdmin()
  if (!session || state.confirmState?.type !== 'delete-product') {
    return
  }

  state.isDeletingProduct = true
  render()

  try {
    const deletingProductId = state.confirmState.productId
    await deleteAdminProduct(session, deletingProductId)
    delete state.cart[deletingProductId]
    persistCart(state.cart)
    if (state.productDraft.id === deletingProductId) {
      state.productDraft = EMPTY_PRODUCT_DRAFT()
    }
    state.confirmState = null
    setNotice({
      type: 'success',
      text: 'Producto eliminado del catalogo.',
    })
    await loadCatalog(true)
  } catch (error) {
    setNotice({
      type: 'warning',
      text: error instanceof Error ? error.message : 'No se pudo eliminar el producto.',
    })
  } finally {
    state.isDeletingProduct = false
    render()
  }
}

const syncLegacy = async () => {
  const session = ensureAdmin()
  if (!session) {
    return
  }

  const legacyProducts = getLegacyProducts()
  const legacyConfig = getLegacyConfig()

  if (!legacyProducts.length) {
    setNotice({
      type: 'warning',
      text: 'Este navegador no tiene un catalogo local anterior para subir.',
    })
    render()
    return
  }

  state.isSyncingLegacy = true
  render()

  try {
    await syncLegacyCatalog(session, {
      products: legacyProducts,
      config: legacyConfig ?? state.config,
    })
    removeStorage(STORAGE_KEYS.legacyProducts)
    removeStorage(STORAGE_KEYS.legacyConfig)
    setNotice({
      type: 'success',
      text: 'El catalogo local se publico correctamente en Supabase.',
    })
    await loadCatalog(true)
  } catch (error) {
    setNotice({
      type: 'warning',
      text: error instanceof Error ? error.message : 'No se pudo subir el catalogo local.',
    })
  } finally {
    state.isSyncingLegacy = false
    render()
  }
}

const handleFilterChange = (field: 'search' | 'category' | 'featured' | 'sort' | 'perPage' | 'page', value: string) => {
  if (field === 'perPage') {
    state.filters.perPage = Number(value) || state.filters.perPage
    state.filters.page = 1
    render()
    return
  }

  if (field === 'page') {
    state.filters.page = Number(value) || 1
    render()
    return
  }

  state.filters = {
    ...state.filters,
    [field]: value,
    page: 1,
  }
  render()
}

const handleProductImage = async (input: HTMLInputElement) => {
  const file = input.files?.[0]

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
      text: 'Selecciona una imagen valida.',
    })
    render()
    return
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    setNotice({
      type: 'warning',
      text: 'La foto supera 700 KB. Usa una imagen mas liviana para mantener la app agil.',
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
    render()
  } catch (error) {
    setNotice({
      type: 'warning',
      text: error instanceof Error ? error.message : 'No se pudo cargar la imagen.',
    })
    render()
  }
}

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement

  if (target.id === 'dismiss-notice') {
    setNotice(null, false)
    render()
    return
  }

  const addButton = target.closest<HTMLElement>('[data-add-product]')
  if (addButton?.dataset.addProduct) {
    addToCart(addButton.dataset.addProduct)
    return
  }

  const productQtyButton = target.closest<HTMLElement>('[data-product-qty]')
  if (productQtyButton?.dataset.productQty && productQtyButton.dataset.delta) {
    const current = state.cart[productQtyButton.dataset.productQty] ?? 0
    setCartQuantity(productQtyButton.dataset.productQty, current + Number(productQtyButton.dataset.delta))
    return
  }

  const cartQtyButton = target.closest<HTMLElement>('[data-cart-qty]')
  if (cartQtyButton?.dataset.cartQty && cartQtyButton.dataset.delta) {
    const current = state.cart[cartQtyButton.dataset.cartQty] ?? 0
    setCartQuantity(cartQtyButton.dataset.cartQty, current + Number(cartQtyButton.dataset.delta))
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

  if (target.id === 'clear-filters') {
    resetFilters()
    render()
    return
  }

  const pageButton = target.closest<HTMLElement>('[data-page]')
  if (pageButton?.dataset.page) {
    handleFilterChange('page', pageButton.dataset.page)
    return
  }

  if (target.id === 'open-cart-drawer') {
    state.isCartDrawerOpen = true
    render()
    return
  }

  if (target.id === 'close-cart-drawer') {
    state.isCartDrawerOpen = false
    render()
    return
  }

  if (target.id === 'logout-admin') {
    void closeAdminSession()
    return
  }

  if (target.id === 'cancel-product-edit') {
    state.productDraft = EMPTY_PRODUCT_DRAFT()
    state.productErrors = {}
    render()
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

  if (target.id === 'sync-legacy-data') {
    void syncLegacy()
    return
  }

  const editButton = target.closest<HTMLElement>('[data-edit-product]')
  if (editButton?.dataset.editProduct) {
    startEditProduct(editButton.dataset.editProduct)
    return
  }

  const deleteButton = target.closest<HTMLElement>('[data-delete-product]')
  if (deleteButton?.dataset.deleteProduct && deleteButton.dataset.productName) {
    requestDeleteProduct(deleteButton.dataset.deleteProduct, deleteButton.dataset.productName)
    return
  }

  if (target.id === 'cancel-confirmation') {
    state.confirmState = null
    render()
    return
  }

  if (target.id === 'confirm-delete-product') {
    void confirmDeleteProduct()
  }
})

app.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

  if (target.id === 'search-input') {
    handleFilterChange('search', target.value)
    return
  }

  if (target.id === 'category-filter') {
    handleFilterChange('category', target.value)
    return
  }

  if (target.id === 'featured-filter') {
    handleFilterChange('featured', target.value)
    return
  }

  if (target.id === 'sort-filter') {
    handleFilterChange('sort', target.value)
    return
  }

  if (target.id === 'per-page-filter') {
    handleFilterChange('perPage', target.value)
    return
  }

  const customerField = target.dataset.customerField as keyof typeof state.customer | undefined
  if (customerField) {
    updateCustomerField(customerField, target.value)
    return
  }

  const adminField = target.dataset.adminField
  if (adminField === 'email') {
    state.auth.email = target.value
    if (state.auth.errors.email || state.auth.errors.form) {
      state.auth.errors = { ...state.auth.errors, email: undefined, form: undefined }
      render()
    }
    return
  }

  if (adminField === 'password') {
    state.auth.password = target.value
    if (state.auth.errors.password || state.auth.errors.form) {
      state.auth.errors = { ...state.auth.errors, password: undefined, form: undefined }
      render()
    }
    return
  }

  const configField = target.dataset.configField as keyof Config | undefined
  if (configField) {
    const value =
      target instanceof HTMLInputElement && target.type === 'number' ? Number(target.value) || 0 : target.value
    state.configDraft = {
      ...state.configDraft,
      [configField]: value,
    }
    if (state.configErrors[configField]) {
      state.configErrors = { ...state.configErrors, [configField]: undefined }
      render()
    }
    return
  }

  const productField = target.dataset.productField as keyof typeof state.productDraft | undefined
  if (productField) {
    const value =
      target instanceof HTMLInputElement && target.type === 'checkbox' ? target.checked : target.value
    state.productDraft = {
      ...state.productDraft,
      [productField]: value,
    }
    if (typeof value === 'string' && state.productErrors[productField as keyof ProductDraftErrors]) {
      state.productErrors = {
        ...state.productErrors,
        [productField]: undefined,
      }
      render()
    }
  }
})

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement
  if (target.dataset.productUpload === 'image') {
    void handleProductImage(target)
  }
})

app.addEventListener('submit', (event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement

  if (form.id === 'admin-login-form') {
    void submitAdminLogin()
    return
  }

  if (form.id === 'product-form') {
    void saveProduct()
    return
  }

  if (form.id === 'config-form') {
    void saveConfig()
  }
})

window.addEventListener('hashchange', () => {
  syncRouteFromHash()
  render()
})

window.addEventListener('resize', () => {
  if (window.innerWidth >= MOBILE_BREAKPOINT && state.isCartDrawerOpen) {
    state.isCartDrawerOpen = false
    render()
  }
})

const boot = async () => {
  syncRouteFromHash()
  render()
  await Promise.all([restoreSession(), loadCatalog()])
  unsubscribeRealtime = subscribeToCatalog(() => {
    void loadCatalog(true)
  })
  render()
}

void boot()

window.addEventListener('beforeunload', () => {
  unsubscribeRealtime()
})
