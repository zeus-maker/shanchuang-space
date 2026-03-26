/**
 * 火山引擎 Ark 环境变量（Vite 需 VITE_ 前缀，构建时注入）
 * 官方说明见：https://www.volcengine.com/docs/82379/1298459 （Base URL 及鉴权）
 */

const DEFAULT_ARK_INFERENCE_BASE = 'https://ark.cn-beijing.volces.com/api/v3'

/**
 * 将 Base 规范为「推理域名 + /api/v3」。
 * 常见误配：只填 https://ark.cn-beijing.volces.com，拼出 /images/generations 时返回 404。
 */
export function normalizeVolcengineInferenceBase(input) {
  if (input == null || typeof input !== 'string') return DEFAULT_ARK_INFERENCE_BASE
  let u = input.trim().replace(/\/+$/, '')
  if (!u) return DEFAULT_ARK_INFERENCE_BASE

  const marker = '/api/v3'
  const idx = u.indexOf(marker)
  if (idx !== -1) {
    return u.slice(0, idx + marker.length)
  }

  return `${u}${marker}`
}

export function getVolcengineApiKey() {
  const k = import.meta.env.VITE_VOLCENGINE_API_KEY
  return typeof k === 'string' ? k.trim() : ''
}

export function getVolcengineBaseUrl() {
  const u = import.meta.env.VITE_VOLCENGINE_BASE_URL
  if (typeof u === 'string' && u.trim()) {
    return normalizeVolcengineInferenceBase(u.trim())
  }
  return DEFAULT_ARK_INFERENCE_BASE
}

/** 图片生成路径，默认与 OpenAI 兼容接口一致；见文档「图片生成 API」 */
export function getVolcengineImagePath() {
  const p = import.meta.env.VITE_VOLCENGINE_IMAGE_PATH
  if (typeof p === 'string' && p.trim()) {
    const t = p.trim()
    return t.startsWith('/') ? t : `/${t}`
  }
  return '/images/generations'
}
