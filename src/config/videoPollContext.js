/**
 * 视频异步任务轮询上下文（按 taskId）
 * VideoConfig 与 VideoNode 各自 useVideoGeneration 实例，故用模块级 Map 传递鉴权与查询 URL
 */

const contexts = new Map()

export function setVideoPollContext(taskId, ctx) {
  if (taskId) contexts.set(taskId, ctx)
}

export function getVideoPollContext(taskId) {
  return contexts.get(taskId) || null
}

export function deleteVideoPollContext(taskId) {
  contexts.delete(taskId)
}
