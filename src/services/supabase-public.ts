import { createClient } from '@supabase/supabase-js'
import { DEFAULT_CONFIG } from '../constants'
import { mapConfigRowToConfig, mapProductRowToProduct } from '../lib/format'
import type { CatalogPayload, ConfigRow, ProductRow } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const hasPublicSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const publicSupabase = hasPublicSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

export const loadCatalogFromSupabase = async (): Promise<CatalogPayload> => {
  if (!publicSupabase) {
    throw new Error('Faltan las variables publicas de Supabase.')
  }

  const [productsResult, configResult] = await Promise.all([
    publicSupabase
      .from('products')
      .select('id,name,category,description,presentation,price,featured,image,created_at,updated_at')
      .order('featured', { ascending: false })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false }),
    publicSupabase
      .from('site_config')
      .select('id,business_name,whatsapp_number,tagline,delivery_zone,payment_methods,min_order,updated_at')
      .eq('id', 1)
      .maybeSingle(),
  ])

  if (productsResult.error) {
    throw productsResult.error
  }

  if (configResult.error) {
    throw configResult.error
  }

  return {
    products: (productsResult.data ?? []).map((row) => mapProductRowToProduct(row as ProductRow)),
    config: configResult.data ? mapConfigRowToConfig(configResult.data as ConfigRow) : { ...DEFAULT_CONFIG },
  }
}

export const subscribeToCatalog = (onChange: () => void) => {
  if (!publicSupabase) {
    return () => undefined
  }

  const channel = publicSupabase
    .channel('catalog-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_config',
      },
      onChange,
    )
    .subscribe()

  return () => {
    void publicSupabase.removeChannel(channel)
  }
}
