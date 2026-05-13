export type AppRole = 'ADMIN' | 'USER'

export type Product = {
  id: string
  name: string
  category: string
  description: string
  presentation: string
  price: number
  featured: boolean
  image: string
  createdAt?: string
  updatedAt?: string
}

export type ProductRow = {
  id: string
  name: string
  category: string
  description: string
  presentation: string
  price: number
  featured: boolean
  image: string | null
  created_at?: string
  updated_at?: string
}

export type Config = {
  businessName: string
  whatsappNumber: string
  tagline: string
  deliveryZone: string
  paymentMethods: string
  minOrder: number
}

export type ConfigRow = {
  id: number
  business_name: string
  whatsapp_number: string
  tagline: string
  delivery_zone: string
  payment_methods: string
  min_order: number
  updated_at?: string
}

export type Customer = {
  name: string
  business: string
  phone: string
  address: string
  notes: string
}

export type Cart = Record<string, number>

export type ProductDraft = {
  id: string | null
  name: string
  category: string
  description: string
  presentation: string
  price: string
  featured: boolean
  image: string
}

export type ProductDraftErrors = Partial<Record<keyof Omit<ProductDraft, 'id' | 'featured' | 'image'>, string>>

export type ConfigDraftErrors = Partial<Record<keyof Config, string>>

export type LoginErrors = {
  email?: string
  password?: string
  form?: string
}

export type Notice = {
  type: 'success' | 'warning' | 'info'
  text: string
}

export type Filters = {
  search: string
  category: string
  featured: 'all' | 'featured' | 'regular'
  sort: 'featured' | 'name-asc' | 'price-asc' | 'price-desc'
  perPage: number
  page: number
}

export type AdminUser = {
  id: string
  email: string
  role: AppRole
  fullName?: string
}

export type SessionMode = 'backend' | 'dev-supabase'

export type AdminSession = {
  token: string
  expiresAt: number
  user: AdminUser
  mode: SessionMode
}

export type AuthState = {
  session: AdminSession | null
  isBootstrapping: boolean
  isSubmitting: boolean
  errors: LoginErrors
  email: string
  password: string
}

export type Route = 'store' | 'admin'

export type ConfirmState =
  | {
      type: 'delete-product'
      productId: string
      productName: string
    }
  | null

export type AppState = {
  route: Route
  products: Product[]
  config: Config
  configDraft: Config
  configErrors: ConfigDraftErrors
  cart: Cart
  customer: Customer
  filters: Filters
  productDraft: ProductDraft
  productErrors: ProductDraftErrors
  auth: AuthState
  notice: Notice | null
  isLoadingCatalog: boolean
  isSavingProduct: boolean
  isSavingConfig: boolean
  isDeletingProduct: boolean
  isSyncingLegacy: boolean
  isCartDrawerOpen: boolean
  confirmState: ConfirmState
}

export type CatalogPayload = {
  products: Product[]
  config: Config
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  token: string
  expiresAt: number
  user: AdminUser
}
