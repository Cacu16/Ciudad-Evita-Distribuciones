import { parseJwtPayload } from '../lib/jwt'
import { mapConfigToRow, mapConfigRowToConfig, mapProductRowToProduct, mapProductToRow } from '../lib/format'
import type {
  AdminSession,
  AdminUser,
  CatalogPayload,
  Config,
  ConfigRow,
  LoginPayload,
  LoginResponse,
  Product,
  ProductRow,
} from '../types'
import { publicSupabase } from './supabase-public'

class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const FUNCTIONS_BASE = '/.netlify/functions'

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!text) {
    return {} as T
  }

  return JSON.parse(text) as T
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> => {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    ...options,
    headers,
  })

  const data = await parseJsonResponse<{ message?: string } & T>(response)

  if (!response.ok) {
    throw new ApiError(data.message ?? 'No se pudo completar la solicitud.', response.status)
  }

  return data as T
}

const createBackendSession = (payload: LoginResponse): AdminSession => {
  const decoded = parseJwtPayload<{ exp?: number }>(payload.token)
  return {
    token: payload.token,
    user: payload.user,
    expiresAt: decoded?.exp ? decoded.exp * 1000 : payload.expiresAt,
    mode: 'backend',
  }
}

const signInWithSupabaseFallback = async ({ email, password }: LoginPayload): Promise<AdminSession> => {
  if (!publicSupabase) {
    throw new ApiError('No se encontro un backend disponible ni Supabase publico para desarrollo.', 500)
  }

  const { data, error } = await publicSupabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    throw new ApiError(error?.message ?? 'No se pudo iniciar sesion.', 401)
  }

  const { data: profile, error: profileError } = await publicSupabase
    .from('profiles')
    .select('id,email,role,full_name')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    throw new ApiError(profileError.message, 500)
  }

  const role = profile?.role
  if (role !== 'ADMIN') {
    await publicSupabase.auth.signOut()
    throw new ApiError('Tu usuario no tiene permisos de administrador.', 403)
  }

  return {
    token: 'dev-supabase-session',
    expiresAt: Date.now() + 1000 * 60 * 60 * 8,
    mode: 'dev-supabase',
    user: {
      id: data.user.id,
      email: profile?.email ?? data.user.email ?? email,
      role,
      fullName: profile?.full_name ?? '',
    },
  }
}

const getCurrentUserFromFallback = async (): Promise<AdminUser | null> => {
  if (!publicSupabase) {
    return null
  }

  const {
    data: { user },
  } = await publicSupabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await publicSupabase
    .from('profiles')
    .select('id,email,role,full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'ADMIN') {
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name ?? '',
  }
}

export const loginAdmin = async (payload: LoginPayload): Promise<AdminSession> => {
  try {
    const response = await request<LoginResponse>('auth-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return createBackendSession(response)
  } catch (error) {
    if (import.meta.env.DEV && error instanceof TypeError) {
      return signInWithSupabaseFallback(payload)
    }

    throw error
  }
}

export const getCurrentAdmin = async (session: AdminSession): Promise<AdminUser | null> => {
  if (session.mode === 'dev-supabase') {
    return getCurrentUserFromFallback()
  }

  const response = await request<{ user: AdminUser }>('auth-me', { method: 'GET' }, session.token)
  return response.user
}

export const logoutAdmin = async (session: AdminSession | null) => {
  if (session?.mode === 'dev-supabase' && publicSupabase) {
    await publicSupabase.auth.signOut()
  }
}

export const saveAdminProduct = async (
  session: AdminSession,
  product: Product,
  isEditing: boolean,
): Promise<ProductRow> => {
  if (session.mode === 'dev-supabase' && publicSupabase) {
    const payload = mapProductToRow(product)
    const query = isEditing
      ? publicSupabase.from('products').upsert(payload, { onConflict: 'id' }).select('*').single()
      : publicSupabase.from('products').insert(payload).select('*').single()

    const { data, error } = await query

    if (error || !data) {
      throw new ApiError(error?.message ?? 'No se pudo guardar el producto.', 500)
    }

    return data as ProductRow
  }

  return request<ProductRow>(
      'admin-products',
    {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify(mapProductToRow(product)),
    },
    session.token,
  )
}

export const deleteAdminProduct = async (session: AdminSession, productId: string) => {
  if (session.mode === 'dev-supabase' && publicSupabase) {
    const { error } = await publicSupabase.from('products').delete().eq('id', productId)
    if (error) {
      throw new ApiError(error.message, 500)
    }

    return
  }

  await request<{ ok: true }>(
    'admin-products',
    {
      method: 'DELETE',
      body: JSON.stringify({ id: productId }),
    },
    session.token,
  )
}

export const saveAdminConfig = async (session: AdminSession, config: Config): Promise<Config> => {
  if (session.mode === 'dev-supabase' && publicSupabase) {
    const { data, error } = await publicSupabase
      .from('site_config')
      .upsert(mapConfigToRow(config), { onConflict: 'id' })
      .select('*')
      .single()

    if (error || !data) {
      throw new ApiError(error?.message ?? 'No se pudo guardar la configuracion.', 500)
    }

    return mapConfigRowToConfig(data as ConfigRow)
  }

  const response = await request<ConfigRow>(
    'admin-site-config',
    {
      method: 'PUT',
      body: JSON.stringify(mapConfigToRow(config)),
    },
    session.token,
  )

  return mapConfigRowToConfig(response)
}

export const syncLegacyCatalog = async (
  session: AdminSession,
  payload: CatalogPayload,
): Promise<CatalogPayload> => {
  if (session.mode === 'dev-supabase' && publicSupabase) {
    const productsPayload = payload.products.map((product) => mapProductToRow(product))
    const { error: productsError } = await publicSupabase
      .from('products')
      .upsert(productsPayload, { onConflict: 'id' })

    if (productsError) {
      throw new ApiError(productsError.message, 500)
    }

    const { data: configData, error: configError } = await publicSupabase
      .from('site_config')
      .upsert(mapConfigToRow(payload.config), { onConflict: 'id' })
      .select('*')
      .single()

    if (configError || !configData) {
      throw new ApiError(configError?.message ?? 'No se pudo sincronizar la configuracion.', 500)
    }

    return {
      products: payload.products,
      config: mapConfigRowToConfig(configData as ConfigRow),
    }
  }

  const response = await request<{ products: ProductRow[]; config: ConfigRow }>(
    'admin-import-catalog',
    {
      method: 'POST',
      body: JSON.stringify({
        products: payload.products.map((product) => mapProductToRow(product)),
        config: mapConfigToRow(payload.config),
      }),
    },
    session.token,
  )

  return {
    products: response.products.map((item) => mapProductRowToProduct(item)),
    config: mapConfigRowToConfig(response.config),
  }
}

export const isSessionExpired = (session: AdminSession) => session.expiresAt <= Date.now()
