const { badRequest, noContent, ok, serverError, unauthorized } = require('./_lib/http.cjs')
const { requireAdmin } = require('./_lib/auth.cjs')
const { upsertSiteConfig } = require('./_lib/supabase.cjs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent()
  }

  if (event.httpMethod !== 'PUT') {
    return badRequest('Metodo no soportado.')
  }

  try {
    await requireAdmin(event)
    const body = JSON.parse(event.body || '{}')

    if (!body.business_name || !body.whatsapp_number || !body.tagline || !body.delivery_zone || !body.payment_methods) {
      return badRequest('Faltan datos obligatorios de la configuracion.')
    }

    const config = await upsertSiteConfig({
      id: 1,
      ...body,
    })

    return ok(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la configuracion.'
    if (message.includes('token') || message.includes('sesion') || message.includes('permisos')) {
      return unauthorized(message)
    }

    return serverError(message)
  }
}
