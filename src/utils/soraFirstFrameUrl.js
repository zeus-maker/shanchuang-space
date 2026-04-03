/**
 * Sora2 图生视频：Modelverse 要求 first_frame_url 为公网 http(s)，不接受 base64 data URL。
 * 非 http(s) 时通过本地媒体服务 POST /api/media/sora-frame-upload 上传到火山 TOS。
 */
import { getMediaApiBase } from '@/utils/localMediaServer.js'

/** @param {string} [s] */
export function isPublicHttpImageUrl (s) {
  if (!s || typeof s !== 'string') return false
  const t = s.trim()
  return /^https?:\/\//i.test(t) && !t.startsWith('data:')
}

/**
 * @param {string} raw - 公网 URL 或 data:image/*;base64,...
 * @param {{ projectId?: string }} [opts]
 * @returns {Promise<{ url: string, width?: number, height?: number }>} 上传首帧时可能带服务端解析的宽高
 */
export async function ensurePublicUrlForSoraFirstFrame (raw, opts = {}) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Sora 图生视频需要首帧图片。')
  }
  const s = raw.trim()
  if (isPublicHttpImageUrl(s)) return { url: s }

  if (!/^data:image\/[\w+.-]+;base64,/i.test(s)) {
    throw new Error(
      'Sora 图生视频首帧需为公网图片链接（http/https），或本地上传的图片（data URL）。请更换首帧来源或启动已配置火山 TOS 的媒体服务。'
    )
  }

  const base = getMediaApiBase()
  const path = '/api/media/sora-frame-upload'
  const fetchUrl = base ? `${base}${path}` : path
  const r = await fetch(fetchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataUrl: s,
      projectId: opts.projectId || 'default'
    })
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok || !data.ok || !data.url) {
    const hint =
      data.error ||
      (r.status === 503
        ? '媒体服务未配置火山 TOS，无法上传首帧。'
        : `上传失败（HTTP ${r.status}）`)
    throw new Error(
      `${hint} 也可在节点中直接使用公网图片 URL 作为首帧。`
    )
  }
  const publicUrl = String(data.url).trim()
  const width = Number(data.width)
  const height = Number(data.height)
  const out = { url: publicUrl }
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    out.width = Math.round(width)
    out.height = Math.round(height)
  }
  return out
}
