import type { Config, ConfigRow, Product, ProductRow } from '../types'

export const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export const sanitizePhoneNumber = (value: string) => value.replace(/\D/g, '')

export const mapProductRowToProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  category: row.category,
  description: row.description,
  presentation: row.presentation,
  price: Number(row.price) || 0,
  featured: Boolean(row.featured),
  image: row.image ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const mapProductToRow = (product: Product): ProductRow => ({
  id: product.id,
  name: product.name,
  category: product.category,
  description: product.description,
  presentation: product.presentation,
  price: product.price,
  featured: product.featured,
  image: product.image || null,
  created_at: product.createdAt,
  updated_at: product.updatedAt,
})

export const mapConfigRowToConfig = (row: ConfigRow): Config => ({
  businessName: row.business_name,
  whatsappNumber: sanitizePhoneNumber(row.whatsapp_number),
  tagline: row.tagline,
  deliveryZone: row.delivery_zone,
  paymentMethods: row.payment_methods,
  minOrder: Number(row.min_order) || 0,
})

export const mapConfigToRow = (config: Config): ConfigRow => ({
  id: 1,
  business_name: config.businessName,
  whatsapp_number: sanitizePhoneNumber(config.whatsappNumber),
  tagline: config.tagline,
  delivery_zone: config.deliveryZone,
  payment_methods: config.paymentMethods,
  min_order: config.minOrder,
})

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }

    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'))
    reader.readAsDataURL(file)
  })

export const clampPage = (page: number, totalPages: number) => {
  if (totalPages <= 0) {
    return 1
  }

  return Math.min(Math.max(page, 1), totalPages)
}
