/**
 * 本地媒体服务客户端：与 server/index.mjs 配合，优先使用本地文件，失败再刷新远程并缓存
 */

/** 媒体 API 根（空则使用相对路径 /api/media，由 Vite/nginx 反代） */
export function getMediaApiBase () {
  const raw = import.meta.env.VITE_MEDIA_API_URL
  if (raw === 'false' || raw === '0') return ''
  if (raw != null && String(raw).trim()) return String(raw).replace(/\/$/, '')
  return ''
}

export function mediaFileUrlFromKey (localKey) {
  if (!localKey) return ''
  const [pid, ...rest] = String(localKey).split('/')
  const filename = rest.join('/')
  if (!pid || !filename) return ''
  const base = getMediaApiBase()
  const path = `/api/media/file/${encodeURIComponent(pid)}/${encodeURIComponent(filename)}`
  return base ? `${base}${path}` : path
}

/**
 * HEAD 检测本地缓存是否存在
 */
export async function headLocalMedia (localKey) {
  if (!localKey) return false
  const [pid, ...rest] = String(localKey).split('/')
  const filename = rest.join('/')
  if (!pid || !filename) return false
  const base = getMediaApiBase()
  const url = base
    ? `${base}/api/media/file/${encodeURIComponent(pid)}/${encodeURIComponent(filename)}`
    : `/api/media/file/${encodeURIComponent(pid)}/${encodeURIComponent(filename)}`
  try {
    const r = await fetch(url, { method: 'HEAD' })
    return r.ok
  } catch {
    return false
  }
}

/**
 * 请求服务端下载远程资源到 uploads
 * @returns {Promise<string|null>} localKey 如 project_xxx/abc.mp4
 */
export async function cacheRemoteToServer (projectId, sourceUrl, kind = 'image') {
  if (!sourceUrl || typeof sourceUrl !== 'string') return null
  if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) return null
  const base = getMediaApiBase()
  const url = base ? `${base}/api/media/cache` : '/api/media/cache'
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: projectId || 'default',
        sourceUrl,
        kind: kind === 'video' ? 'video' : 'image'
      })
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok || !data.ok || !data.localKey) {
      return null
    }
    return data.localKey
  } catch {
    return null
  }
}

/**
 * 图片预览 URL：有本地 key 则优先本地，否则用远程
 */
export function resolveImagePreviewUrl (sourceUrl, localKey) {
  if (localKey) return mediaFileUrlFromKey(localKey)
  return sourceUrl || ''
}
