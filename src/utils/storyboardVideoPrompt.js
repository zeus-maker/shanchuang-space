/**
 * 分镜图批量生视频：从 imageConfig 节点与脚本 scenes 解析图生视频提示词（优先视频运动提示词）
 */

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
