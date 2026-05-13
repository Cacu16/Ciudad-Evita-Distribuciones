const { badRequest, created, noContent, ok, serverError, unauthorized } = require('./_lib/http.cjs')
const { requireAdmin } = require('./_lib/auth.cjs')
const { deleteProduct, insertProduct, updateProduct } = require('./_lib/supabase.cjs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent()
  }

  try {
    await requireAdmin(event)

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      if (!body.name || !body.category || !body.description || !body.presentation || !body.price) {
        return badRequest('Faltan campos obligatorios para crear el producto.')
      }

      const product = await insertProduct(body)
      return created(product)
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}')
      if (!body.id) {
        return badRequest('Falta el ID del producto a actualizar.')
      }

      const product = await updateProduct(body)
      return ok(product)
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}')
      if (!body.id) {
        return badRequest('Falta el ID del producto a eliminar.')
      }

      await deleteProduct(body.id)
      return ok({ ok: true })
    }

    return badRequest('Metodo no soportado.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo procesar la operacion.'
    if (message.includes('token') || message.includes('sesion') || message.includes('permisos')) {
      return unauthorized(message)
    }

    return serverError(message)
  }
}
