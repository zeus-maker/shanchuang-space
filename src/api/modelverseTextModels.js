/**
 * UCloud Modelverse 文本模型列表（OpenAI 兼容 GET /v1/models）
 */

/**
 * @param {string} baseUrl 如 https://api.modelverse.cn
 * @param {string} apiKey
 * @returns {Promise<{ key: string, label: string }[]>}
 */
export async function fetchModelverseTextModels(baseUrl, apiKey) {
  const origin = String(baseUrl || '').replace(/\/+$/, '')
  if (!origin || !apiKey) return []

  const url = `${origin}/v1/models`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  const body = await res.json()
  const raw = body.data
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .map((m) => {
      const id = m?.id || m?.name || m?.model
      if (!id) return null
      return { key: id, label: id }
    })
    .filter(Boolean)
}
