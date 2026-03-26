/**
 * 火山引擎 Ark 环境变量（Vite 需 VITE_ 前缀，构建时注入）
 */

export function getVolcengineApiKey() {
  const k = import.meta.env.VITE_VOLCENGINE_API_KEY
  return typeof k === 'string' ? k.trim() : ''
}

export function getVolcengineBaseUrl() {
  const u = import.meta.env.VITE_VOLCENGINE_BASE_URL
  if (typeof u === 'string' && u.trim()) return u.trim().replace(/\/$/, '')
  return 'https://ark.cn-beijing.volces.com/api/v3'
}
