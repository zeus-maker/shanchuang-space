/**
 * 将远程图片/视频 URL 以「保存文件」方式下载到本地（非新开标签页播放）
 */

export function sanitizeDownloadFileName (name, fallback = 'download') {
  const s = String(name ?? fallback)
    .replace(/[/\\?%*:|"<>#]/g, '_')
    .replace(/\s+/g, '_')
    .trim()
  return (s || fallback).slice(0, 180)
}

function guessExtFromUrl (url, fallback = 'jpg') {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined)
    const m = u.pathname.match(/\.([a-z0-9]+)$/i)
    if (m) return m[1].toLowerCase()
  } catch { /* ignore */ }
  return fallback
}

export function buildMediaDownloadName (node, index = 0) {
  const url = node.data?.url
  if (!url) return `file_${index + 1}.bin`
  const ext = node.type === 'video' ? 'mp4' : guessExtFromUrl(url, 'jpg')
  const base = String(node.data?.label || node.id || `file_${index + 1}`)
  return `${sanitizeDownloadFileName(base, `file_${index + 1}`)}.${ext}`
}

/**
 * fetch + Blob 触发浏览器下载（需资源允许 CORS）
 */
export async function downloadUrlToFile (url, fileName) {
  const r = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const blob = await r.blob()
  const a = document.createElement('a')
  const href = URL.createObjectURL(blob)
  a.href = href
  a.download = sanitizeDownloadFileName(fileName, 'download.mp4')
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(href)
}

/**
 * 逐个下载，避免同时弹窗过多被拦截；失败则退回 window.open
 */
export async function downloadManyNodesMedia (nodeList, { delayMs = 450 } = {}) {
  let ok = 0
  let opened = 0
  for (let i = 0; i < nodeList.length; i++) {
    const n = nodeList[i]
    const url = n.data?.url
    if (!url) continue
    const name = buildMediaDownloadName(n, i)
    try {
      await downloadUrlToFile(url, name)
      ok++
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
      opened++
    }
    if (i < nodeList.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return { ok, opened }
}
