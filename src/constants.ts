import type { Config, Customer, Filters, ProductDraft } from './types'

export const STORAGE_KEYS = {
  cart: 'ced-cart',
  customer: 'ced-customer',
  authSession: 'ced-admin-session',
  legacyProducts: 'ced-products',
  legacyConfig: 'ced-config',
} as const

export const DEFAULT_CONFIG: Config = {
  businessName: 'Ciudad Evita Distribuciones',
  whatsappNumber: '5491132465579',
  tagline: 'Catalogo digital para pedidos rapidos por WhatsApp.',
  deliveryZone: 'Ciudad Evita y alrededores',
  paymentMethods: 'Transferencia, efectivo o Mercado Pago',
  minOrder: 0,
}

export const DEFAULT_CUSTOMER: Customer = {
  name: '',
  business: '',
  phone: '',
  address: '',
  notes: '',
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  category: 'all',
  featured: 'all',
  sort: 'featured',
  perPage: 6,
  page: 1,
}

export const EMPTY_PRODUCT_DRAFT = (): ProductDraft => ({
  id: null,
  name: '',
  category: '',
  description: '',
  presentation: '',
  price: '',
  featured: false,
  image: '',
})

export const PUBLIC_PAGE_SIZE_OPTIONS = [6, 9, 12]

export const PRODUCT_IMAGE_MAX_BYTES = 700_000

export const MOBILE_BREAKPOINT = 960
