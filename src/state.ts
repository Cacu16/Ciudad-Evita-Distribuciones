import { DEFAULT_CONFIG, DEFAULT_CUSTOMER, DEFAULT_FILTERS, EMPTY_PRODUCT_DRAFT, STORAGE_KEYS } from './constants'
import { clampPage } from './lib/format'
import { loadStorage, saveStorage } from './lib/storage'
import type {
  AdminSession,
  AppState,
  CatalogPayload,
  Cart,
  Config,
  Customer,
  Filters,
  Product,
} from './types'

export const getLegacyProducts = () => loadStorage<Product[]>(STORAGE_KEYS.legacyProducts, [])

export const getLegacyConfig = () => loadStorage<Config | null>(STORAGE_KEYS.legacyConfig, null)

export const createInitialState = (): AppState => ({
  route: window.location.hash.startsWith('#/admin') ? 'admin' : 'store',
  products: [],
  config: { ...DEFAULT_CONFIG },
  configDraft: { ...DEFAULT_CONFIG },
  configErrors: {},
  cart: loadStorage<Cart>(STORAGE_KEYS.cart, {}),
  customer: loadStorage<Customer>(STORAGE_KEYS.customer, DEFAULT_CUSTOMER),
  filters: { ...DEFAULT_FILTERS },
  productDraft: EMPTY_PRODUCT_DRAFT(),
  productErrors: {},
  auth: {
    session: loadStorage<AdminSession | null>(STORAGE_KEYS.authSession, null),
    isBootstrapping: true,
    isSubmitting: false,
    errors: {},
    email: '',
    password: '',
  },
  notice: null,
  isLoadingCatalog: true,
  isSavingProduct: false,
  isSavingConfig: false,
  isDeletingProduct: false,
  isSyncingLegacy: false,
  isCartDrawerOpen: false,
  confirmState: null,
})

export const persistSession = (session: AdminSession | null) => {
  if (session) {
    saveStorage(STORAGE_KEYS.authSession, session)
    return
  }

  localStorage.removeItem(STORAGE_KEYS.authSession)
}

export const persistCart = (cart: Cart) => {
  saveStorage(STORAGE_KEYS.cart, cart)
}

export const persistCustomer = (customer: Customer) => {
  saveStorage(STORAGE_KEYS.customer, customer)
}

export const selectCategories = (products: Product[]) =>
  Array.from(new Set(products.map((product) => product.category.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  )

export const selectFilteredProducts = (products: Product[], filters: Filters) => {
  const query = filters.search.trim().toLowerCase()

  return [...products]
    .filter((product) => {
      const matchesCategory = filters.category === 'all' || product.category === filters.category
      const matchesFeatured =
        filters.featured === 'all' ||
        (filters.featured === 'featured' ? product.featured : !product.featured)

      const searchableText = [product.name, product.category, product.description, product.presentation]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !query || searchableText.includes(query)
      return matchesCategory && matchesFeatured && matchesSearch
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case 'name-asc':
          return left.name.localeCompare(right.name)
        case 'price-asc':
          return left.price - right.price
        case 'price-desc':
          return right.price - left.price
        case 'featured':
        default:
          return Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name)
      }
    })
}

export const selectPagination = (products: Product[], filters: Filters) => {
  const totalItems = products.length
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.perPage))
  const page = clampPage(filters.page, totalPages)
  const startIndex = (page - 1) * filters.perPage
  const endIndex = startIndex + filters.perPage

  return {
    totalItems,
    totalPages,
    page,
    items: products.slice(startIndex, endIndex),
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: Math.min(endIndex, totalItems),
  }
}

export const selectCartEntries = (products: Product[], cart: Cart) =>
  Object.entries(cart)
    .map(([productId, quantity]) => ({
      product: products.find((item) => item.id === productId),
      quantity,
    }))
    .filter((entry): entry is { product: Product; quantity: number } => Boolean(entry.product))

export const selectCartCount = (products: Product[], cart: Cart) =>
  selectCartEntries(products, cart).reduce((total, entry) => total + entry.quantity, 0)

export const selectCartTotal = (products: Product[], cart: Cart) =>
  selectCartEntries(products, cart).reduce((total, entry) => total + entry.product.price * entry.quantity, 0)

export const applyCatalog = (state: AppState, payload: CatalogPayload) => {
  state.products = payload.products
  state.config = payload.config
  state.configDraft = { ...payload.config }

  const filtered = selectFilteredProducts(state.products, state.filters)
  const pagination = selectPagination(filtered, state.filters)
  state.filters.page = pagination.page
}
