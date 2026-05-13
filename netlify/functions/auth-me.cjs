const { noContent, ok, unauthorized } = require('./_lib/http.cjs')
const { requireAdmin } = require('./_lib/auth.cjs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent()
  }

  if (event.httpMethod !== 'GET') {
    return unauthorized('Metodo no soportado.')
  }

  try {
    const { user } = await requireAdmin(event)
    return ok({ user })
  } catch (error) {
    return unauthorized(error instanceof Error ? error.message : 'Sesion invalida.')
  }
}
