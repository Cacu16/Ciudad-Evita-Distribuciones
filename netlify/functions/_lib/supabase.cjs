const { getEnv } = require('./env.cjs')

const parseResponse = async (response) => {
  const text = await response.text()
  if (!text) {
    return null
  }

  return JSON.parse(text)
}

const requestSupabase = async (path, options = {}, keyType = 'service') => {
  const env = getEnv()
  const key = keyType === 'service' ? env.supabaseServiceRoleKey : env.supabaseAnonKey
  const url = `${env.supabaseUrl}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {}),
    },
  })

  const data = await parseResponse(response)
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || 'Error al consultar Supabase.'
    throw new Error(message)
  }

  return data
}

const authenticateWithPassword = async (email, password) => {
  const env = getEnv()
  const response = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const data = await parseResponse(response)

  if (!response.ok) {
    const message = data?.error_description || data?.message || 'Credenciales invalidas.'
    throw new Error(message)
  }

  return data
}

const getProfileById = async (userId) => {
  const data = await requestSupabase(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,role,full_name`,
    {
      method: 'GET',
    },
    'service',
  )

  return Array.isArray(data) ? data[0] || null : null
}

const upsertProducts = async (products) => {
  const data = await requestSupabase(
    '/rest/v1/products?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(products),
    },
    'service',
  )

  return Array.isArray(data) ? data : []
}

const insertProduct = async (product) => {
  const data = await requestSupabase(
    '/rest/v1/products',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(product),
    },
    'service',
  )

  return Array.isArray(data) ? data[0] || null : data
}

const updateProduct = async (product) => {
  const payload = { ...product }
  delete payload.id

  const data = await requestSupabase(
    `/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    },
    'service',
  )

  return Array.isArray(data) ? data[0] || null : data
}

const deleteProduct = async (productId) => {
  await requestSupabase(
    `/rest/v1/products?id=eq.${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    },
    'service',
  )
}

const upsertSiteConfig = async (config) => {
  const data = await requestSupabase(
    '/rest/v1/site_config?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(config),
    },
    'service',
  )

  return Array.isArray(data) ? data[0] || null : data
}

module.exports = {
  authenticateWithPassword,
  getProfileById,
  insertProduct,
  updateProduct,
  deleteProduct,
  upsertProducts,
  upsertSiteConfig,
}
