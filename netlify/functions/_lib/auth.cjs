const { getEnv } = require('./env.cjs')
const { verifyToken } = require('./jwt.cjs')
const { getProfileById } = require('./supabase.cjs')

const getBearerToken = (headers = {}) => {
  const authorization = headers.authorization || headers.Authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice('Bearer '.length).trim()
}

const requireAdmin = async (event) => {
  const token = getBearerToken(event.headers)
  if (!token) {
    throw new Error('Falta el token de acceso.')
  }

  const env = getEnv()
  const payload = verifyToken(token, env.appJwtSecret)
  const profile = await getProfileById(payload.sub)

  if (!profile || profile.role !== 'ADMIN') {
    throw new Error('Tu sesion no tiene permisos de administrador.')
  }

  return {
    token,
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      fullName: profile.full_name || '',
    },
    payload,
  }
}

module.exports = {
  getBearerToken,
  requireAdmin,
}
