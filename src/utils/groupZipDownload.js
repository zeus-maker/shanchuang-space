/**
 * 将多个节点上的图片/视频 URL 打包为单个 zip（需资源支持 CORS，否则写入 .url.txt）
 */
import JSZip from 'jszip'

export function guessExtFromUrl (url, fallback = 'jpg') {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined)
    const m = u.pathname.match(/\.([a-z0-9]+)$/i)
    if (m) return m[1].toLowerCase()
  } catch { /* ignore */ }
  return fallback
}

/**
 * @param {Array<{ id: string, type: string, data?: { url?: string, label?: string } }>} nodeList
 * @param {string} [groupLabel] 组标题，用作 zip 内文件夹名
 * @returns {Promise<{ blob: Blob, fileName: string, embedded: number, linkOnly: number }>}
 */
export async function zipGroupMediaNodes (nodeList, groupLabel = '素材包') {
  const zip = new JSZip()
  const safeFolder = String(groupLabel || '素材包').replace(/[/\\?%*:|"<>]/g, '_') || '素材包'
  const folder = zip.folder(safeFolder)
  let embedded = 0
  let linkOnly = 0

  for (let i = 0; i < nodeList.length; i++) {
    const n = nodeList[i]
    const url = n.data?.url
    if (!url) continue
    const baseLabel = String(n.data?.label || n.id || `file_${i + 1}`).replace(/[/\\?%*:|"<>]/g, '_')
    const ext = n.type === 'video' ? 'mp4' : guessExtFromUrl(url, 'jpg')
    const name = `${baseLabel}_${i + 1}.${ext}`
    try {
      const r = await fetch(url, { mode: 'cors' })
      if (!r.ok) throw new Error('bad status')
      const buf = await r.arrayBuffer()
      folder.file(name, buf)
      embedded++
    } catch {
      folder.file(`${baseLabel}_${i + 1}.url.txt`, url)
      linkOnly++
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  const fileName = `${safeFolder}_${Date.now()}.zip`
  return { blob, fileName, embedded, linkOnly }
}
