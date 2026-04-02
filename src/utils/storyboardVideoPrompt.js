/**
 * 分镜图批量生视频：从 imageConfig 节点与脚本 scenes 解析图生视频提示词（优先视频运动提示词）
 */

/** 分镜图节点当前主图 URL（与 Canvas / ScriptNode 批量逻辑一致） */
export function pickStoryboardImageUrlFromNode (node) {
  if (!node) return null
  return node.data?.generatedUrls?.[node.data?.mainImageIndex || 0]
    || node.data?.generatedUrls?.[0]
    || node.data?.selectedUrl
    || null
}

/**
 * 视频组第 i 个分镜视频的图生首帧：取「上一分镜图节点」的成图；第 1 镜无前者则用本镜成图。
 * 若上一镜尚无图则回退本镜，避免首帧为空。
 */
export function resolveI2vFirstFrameFromStoryboardGroup (storyboardNodes, shotIndex) {
  if (!Array.isArray(storyboardNodes) || shotIndex < 0) return null
  const curr = storyboardNodes[shotIndex]
  if (shotIndex === 0) return pickStoryboardImageUrlFromNode(curr)
  const prev = storyboardNodes[shotIndex - 1]
  const fromPrev = pickStoryboardImageUrlFromNode(prev)
  if (fromPrev) return fromPrev
  return pickStoryboardImageUrlFromNode(curr)
}

/** 从分镜视频节点标题解析镜号，如「分镜视频 #3」 */
export function parseSceneNoFromVideoNodeLabel (label) {
  if (!label || typeof label !== 'string') return null
  const m = label.match(/分镜视频\s*#?\s*(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

/** 用节点上的 sceneNo / 标题匹配脚本中的一行 */
export function resolveSceneForVideoNodeData (videoData, scenes) {
  if (!Array.isArray(scenes) || !scenes.length) return {}
  const sceneNo = videoData?.sceneNo ?? parseSceneNoFromVideoNodeLabel(videoData?.label)
  if (sceneNo != null && !Number.isNaN(sceneNo)) {
    const byNo = scenes.find(s => Number(s.sceneNo) === Number(sceneNo))
    if (byNo) return byNo
  }
  return {}
}

/** 中文侧：画面描述 + 动作 + 对白（用于图生/文生提示词切换） */
export function resolveVideoPromptZhFromScene (scene) {
  if (!scene || typeof scene !== 'object') return ''
  const parts = [
    String(scene.description || '').trim(),
    String(scene.action || '').trim(),
    String(scene.dialogue || '').trim()
  ].filter(Boolean)
  if (parts.length) return parts.join('；')
  return String(scene.videoMotionPrompt || '').trim()
}

/** 英文侧：视频运动优先，否则分镜图英文 prompt */
export function resolveVideoPromptEnFromScene (scene) {
  if (!scene || typeof scene !== 'object') return ''
  const motion = String(scene.videoMotionPrompt || '').trim()
  if (motion) return motion
  return String(scene.storyboardPrompt || '').trim()
}

/** 从分镜图节点标题解析镜号，如「分镜 #3」 */
export function parseSceneNoFromImageNodeLabel (label) {
  if (!label || typeof label !== 'string') return null
  const m = label.match(/分镜\s*#?\s*(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

/** 按镜号或下标匹配脚本中的一行分镜 */
export function resolveSceneForStoryboardImageNode (node, scenes, index) {
  if (!Array.isArray(scenes) || !scenes.length) return {}
  const sceneNo = node?.data?.sceneNo ?? parseSceneNoFromImageNodeLabel(node?.data?.label)
  if (sceneNo != null && !Number.isNaN(sceneNo)) {
    const byNo = scenes.find(s => Number(s.sceneNo) === Number(sceneNo))
    if (byNo) return byNo
  }
  return scenes[index] || {}
}

/**
 * 图生视频 prompt：节点上已存的 videoMotionPrompt 优先，其次脚本表格的 videoMotionPrompt / 描述，最后分镜图 prompt
 */
export function resolveVideoI2vPrompt (node, scenes, index) {
  const fromNode = String(node?.data?.videoMotionPrompt || '').trim()
  if (fromNode) return fromNode
  const scene = resolveSceneForStoryboardImageNode(node, scenes, index)
  const fromScene = String(scene.videoMotionPrompt || scene.description || '').trim()
  if (fromScene) return fromScene
  return String(node?.data?.prompt || '').trim()
}
