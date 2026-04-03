/**
 * OpenAI / 聚合接口常见：仅返回 b64_json 或把裸 base64 放在 url 字段。
 * 归一成可预览、可 POST /api/media/cache 的 data URL；已是 http(s)/data:/相对路径则原样返回。
 */
export function normalizeInlineImageUrl (input) {
  if (input == null) return ''
  const s = String(input).trim()
  if (!s) return ''
  if (s.startsWith('data:')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/')) return s
  const cleaned = s.replace(/\s+/g, '')
  if (!cleaned.length) return ''
  if (/^[A-Za-z0-9+/]+=*$/.test(cleaned) && cleaned.length >= 32) {
    return `data:image/png;base64,${cleaned}`
  }
  return s
}
