const { badRequest, noContent, ok, serverError, unauthorized } = require('./_lib/http.cjs')
const { requireAdmin } = require('./_lib/auth.cjs')
const { upsertProducts, upsertSiteConfig } = require('./_lib/supabase.cjs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent()
  }

  if (event.httpMethod !== 'POST') {
    return badRequest('Metodo no soportado.')
  }

  try {
    await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')
    const products = Array.isArray(body.products) ? body.products : []
    const config = body.config

    if (!products.length) {
      return badRequest('No se recibieron productos para sincronizar.')
    }

    if (!config) {
      return badRequest('Falta la configuracion del negocio.')
    }

    const [savedProducts, savedConfig] = await Promise.all([
      upsertProducts(products),
      upsertSiteConfig({
        id: 1,
        ...config,
      }),
    ])

    return ok({
      products: savedProducts,
      config: savedConfig,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo sincronizar el catalogo.'
    if (message.includes('token') || message.includes('sesion') || message.includes('permisos')) {
      return unauthorized(message)
    }

    return serverError(message)
  }
}
