import { cacheRemoteToServer, mediaFileUrlFromKey } from '@/utils/localMediaServer'

/**
 * 视频生成得到远程 URL 后：写入节点时顺带落盘到本地媒体服务
 */
export async function patchVideoNodeFromRemoteUrl (projectId, remoteUrl, videoTaskId) {
  if (!remoteUrl) return {}
  if (!projectId) {
    return { url: remoteUrl, sourceVideoUrl: remoteUrl, videoTaskId: videoTaskId || undefined }
  }
  const localKey = await cacheRemoteToServer(projectId, remoteUrl, 'video')
  return {
    sourceVideoUrl: remoteUrl,
    videoTaskId: videoTaskId || undefined,
    localVideoKey: localKey || undefined,
    url: localKey ? mediaFileUrlFromKey(localKey) : remoteUrl
  }
}
