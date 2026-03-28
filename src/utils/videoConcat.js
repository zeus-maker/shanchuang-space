/**
 * 浏览器端将多个 MP4 URL 按顺序拼接为一个文件（FFmpeg.wasm）
 * 依赖 CDN 加载 @ffmpeg/core，首次使用需联网下载 wasm
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance = null
let loadPromise = null

async function ensureFFmpeg (onLog) {
  if (ffmpegInstance) {
    if (onLog) ffmpegInstance.on('log', onLog)
    return ffmpegInstance
  }
  if (loadPromise) {
    const ff = await loadPromise
    if (onLog) ff.on('log', onLog)
    return ff
  }
  const ffmpeg = new FFmpeg()
  if (onLog) ffmpeg.on('log', onLog)
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
  loadPromise = ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
  }).then(() => {
    ffmpegInstance = ffmpeg
    return ffmpeg
  })
  await loadPromise
  return ffmpeg
}

/**
 * @param {string[]} urls 视频直链，须支持 CORS
 * @param {{ onLog?: (s: string) => void }} [opts]
 * @returns {Promise<Blob>}
 */
export async function concatVideoUrlsToBlob (urls, opts = {}) {
  const list = (urls || []).filter(Boolean)
  if (list.length === 0) throw new Error('没有可拼接的视频地址')

  if (list.length === 1) {
    const r = await fetch(list[0], { mode: 'cors' })
    if (!r.ok) throw new Error('下载视频失败')
    return await r.blob()
  }

  const ffmpeg = await ensureFFmpeg(opts.onLog)
  const names = []
  for (let i = 0; i < list.length; i++) {
    const name = `in${i}.mp4`
    try {
      const data = await fetchFile(list[i])
      await ffmpeg.writeFile(name, data)
      names.push(name)
    } catch (e) {
      throw new Error(
        `读取第 ${i + 1} 个视频失败（多为跨域限制，请尝试「批量下载」后本地合并）：${e?.message || e}`
      )
    }
  }

  const listContent = names.map((n) => `file '${n}'`).join('\n') + '\n'
  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(listContent))

  try {
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'out.mp4'])
  } catch {
    try {
      await ffmpeg.exec([
        '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        'out.mp4'
      ])
    } catch (e2) {
      throw new Error(
        '自动拼接失败（编码流不一致或缺少编码器）。请使用「批量下载」后本地用剪辑软件合并。'
      )
    }
  }

  const out = await ffmpeg.readFile('out.mp4')
  const blob = new Blob([out], { type: 'video/mp4' })

  for (const n of names) {
    try { await ffmpeg.deleteFile(n) } catch { /* ignore */ }
  }
  try { await ffmpeg.deleteFile('concat.txt') } catch { /* ignore */ }
  try { await ffmpeg.deleteFile('out.mp4') } catch { /* ignore */ }

  return blob
}
