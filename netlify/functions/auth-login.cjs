const { badRequest, created, forbidden, noContent, serverError } = require('./_lib/http.cjs')
const { signToken } = require('./_lib/jwt.cjs')
const { getEnv } = require('./_lib/env.cjs')
const { authenticateWithPassword, getProfileById } = require('./_lib/supabase.cjs')

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent()
  }

  if (event.httpMethod !== 'POST') {
    return badRequest('Metodo no soportado.')
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return badRequest('Completa email y contrasena.')
    }

    const authData = await authenticateWithPassword(email, password)
    const user = authData.user

    if (!user?.id) {
      return forbidden('No se pudo validar la cuenta.')
    }

    const profile = await getProfileById(user.id)

    if (!profile || profile.role !== 'ADMIN') {
      return forbidden('Tu usuario no tiene permisos de administrador.')
    }

    const env = getEnv()
    const token = signToken(
      {
        sub: profile.id,
        email: profile.email,
        role: profile.role,
      },
      env.appJwtSecret,
    )

    return created({
      token,
      expiresAt: (Math.floor(Date.now() / 1000) + 60 * 60 * 8) * 1000,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        fullName: profile.full_name || '',
      },
    })
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'No se pudo iniciar sesion.')
  }
}
