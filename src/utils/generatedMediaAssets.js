/**
 * 文生图节点：generatedUrls（远程，供下游 API）与 generatedLocalKeys（本地缓存 key）对齐
 */

import { resolveImagePreviewUrl } from '@/utils/localMediaServer'

export function getGeneratedUrlList (data) {
  if (!data) return []
  if (Array.isArray(data.generatedUrls) && data.generatedUrls.length) return data.generatedUrls
  if (data.generatedUrl) return [data.generatedUrl]
  return []
}

export function getGeneratedLocalKeys (data) {
  const urls = getGeneratedUrlList(data)
  const keys = data?.generatedLocalKeys
  if (!Array.isArray(keys) || keys.length !== urls.length) {
    return urls.map(() => null)
  }
  return keys
}

export function buildImagePreviewUrls (data) {
  const urls = getGeneratedUrlList(data)
  const keys = getGeneratedLocalKeys(data)
  return urls.map((u, i) => resolveImagePreviewUrl(u, keys[i]))
}

export function getImageSourceUrlAt (data, index) {
  const urls = getGeneratedUrlList(data)
  return urls[index] ?? urls[0] ?? data?.selectedUrl ?? ''
}
