/**
 * 浏览器侧读取图片宽高，用于生图请求与画布尺寸对齐（避免 Inpaint / 编辑类接口报尺寸不匹配）
 */
import { SEEDREAM_4K_SIZE_OPTIONS, SEEDREAM_SIZE_OPTIONS } from '@/config/models'

const BANANA_ASPECTS = [
  { key: '16x9', ratio: 16 / 9 },
  { key: '4x3', ratio: 4 / 3 },
  { key: '3x2', ratio: 3 / 2 },
  { key: '1x1', ratio: 1 },
  { key: '2x3', ratio: 2 / 3 },
  { key: '3x4', ratio: 3 / 4 },
  { key: '9x16', ratio: 9 / 16 }
]

/**
 * @param {string} src - data URL、相对路径或 http(s)
 * @returns {Promise<{ width: number, height: number }>}
 */
export function loadImageNaturalSize (src) {
  if (src == null || src === '') {
    return Promise.reject(new Error('empty image src'))
  }
  const s = String(src).trim()
  return new Promise((resolve, reject) => {
    const img = new Image()
    const cleanup = () => {
      img.onload = null
      img.onerror = null
    }
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      cleanup()
      if (!w || !h) {
        reject(new Error('invalid image dimensions'))
        return
      }
      resolve({ width: w, height: h })
    }
    img.onerror = () => {
      cleanup()
      reject(new Error('image load failed'))
    }
    // 仅读 naturalWidth/Height，不绘制到 canvas，无需 CORS；设 anonymous 时若 CDN 未返回 ACAO 会导致 onerror，误回退固定尺寸（如 Sora i2v）
    img.src = s
  })
}

/** 按宽高比匹配画布 Banana 尺寸 key（如 16x9） */
export function pickClosestBananaSizeKey (width, height) {
  if (!width || !height) return '1x1'
  const r = width / height
  let best = '1x1'
  let bestDiff = Infinity
  for (const { key, ratio } of BANANA_ASPECTS) {
    const d = Math.abs(Math.log(r / ratio))
    if (d < bestDiff) {
      bestDiff = d
      best = key
    }
  }
  return best
}

/**
 * 在 Seedream 预设分辨率中选与源图最接近的一项（宽高比优先）
 * @param {boolean} use4k
 * @returns {string} 如 2048x2048
 */
export function pickClosestSeedreamSizeKey (width, height, use4k = false) {
  const options = use4k ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS
  const list = options.map((o) => {
    const parts = String(o.key).split('x').map(Number)
    const sw = parts[0]
    const sh = parts[1]
    if (!sw || !sh) return null
    return { key: o.key, sw, sh, aspect: sw / sh, pixels: sw * sh }
  }).filter(Boolean)

  if (!list.length) return '2048x2048'
  if (!width || !height) return list[Math.floor(list.length / 2)].key

  const r = width / height
  const srcPixels = width * height
  let best = list[0].key
  let bestScore = Infinity
  for (const o of list) {
    const aspectDiff = Math.abs(Math.log(r / o.aspect))
    const scaleDiff = Math.abs(Math.log(srcPixels / o.pixels))
    const score = aspectDiff * 8 + scaleDiff
    if (score < bestScore) {
      bestScore = score
      best = o.key
    }
  }
  return best
}
