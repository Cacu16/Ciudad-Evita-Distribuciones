const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const json = (statusCode, payload, extraHeaders = {}) => ({
  statusCode,
  headers: {
    ...baseHeaders,
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
})

const ok = (payload) => json(200, payload)

const created = (payload) => json(201, payload)

const badRequest = (message) => json(400, { message })

const unauthorized = (message = 'No autorizado.') => json(401, { message })

const forbidden = (message = 'No tienes permisos para esta accion.') => json(403, { message })

const serverError = (message = 'Ocurrio un error inesperado.') => json(500, { message })

const noContent = () => ({
  statusCode: 204,
  headers: {
    ...baseHeaders,
  },
  body: '',
})

module.exports = {
  baseHeaders,
  json,
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  noContent,
}
