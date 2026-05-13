const { createHmac, timingSafeEqual } = require('node:crypto')

const toBase64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

const signToken = (payload, secret, expiresInSeconds = 60 * 60 * 8) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const issuedAt = Math.floor(Date.now() / 1000)
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(tokenPayload))
  const content = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', secret).update(content).digest('base64url')
  return `${content}.${signature}`
}

const verifyToken = (token, secret) => {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Token invalido.')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const content = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createHmac('sha256', secret).update(content).digest('base64url')

  const left = Buffer.from(signature)
  const right = Buffer.from(expectedSignature)

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error('La firma del token no es valida.')
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload))
  if (!payload.exp || Date.now() >= payload.exp * 1000) {
    throw new Error('El token expiro.')
  }

  return payload
}

module.exports = {
  signToken,
  verifyToken,
}
