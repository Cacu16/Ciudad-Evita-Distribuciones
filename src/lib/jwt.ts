type JwtPayload = {
  exp?: number
}

export const parseJwtPayload = <T extends JwtPayload>(token: string): T | null => {
  try {
    const [, payload] = token.split('.')

    if (!payload) {
      return null
    }

    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = atob(padded)
    return JSON.parse(decoded) as T
  } catch {
    return null
  }
}
