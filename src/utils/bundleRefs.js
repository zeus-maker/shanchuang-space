/**
 * 组引用（bundle）：将多个节点合并为下游 LLM / 生图 / 视频的输入
 */

function blockFromNode (allNodes, node, seen = new Set()) {
  if (!node || seen.has(node.id)) return ''
  seen.add(node.id)

  switch (node.type) {
    case 'text': {
      if (node.data?.bundleMemberIds?.length) {
        return aggregateBundleTexts(allNodes, node.data.bundleMemberIds, seen)
      }
      return node.data?.content || ''
    }
    case 'llmConfig':
      return node.data?.outputContent || ''
    case 'image':
      if (node.data?.url) {
        return `[图片: ${node.data.label || node.id}] ${node.data.url}`
      }
      return ''
    case 'video':
      if (node.data?.url) {
        return `[视频: ${node.data.label || node.id}] ${node.data.url}`
      }
      return ''
    default:
      return ''
  }
}

/**
 * 按 memberIds 顺序拼接各节点可文本化内容（支持嵌套组引用）
 */
export function aggregateBundleTexts (allNodes, memberIds, seen = new Set()) {
  if (!memberIds?.length) return ''
  const parts = []
  for (const id of memberIds) {
    const n = allNodes.find(x => x.id === id)
    const block = n ? blockFromNode(allNodes, n, seen) : ''
    if (block) parts.push(block)
  }
  return parts.join('\n\n')
}

/**
 * 收集组内图片节点的 base64/url，用于文生图参考图
 */
export function aggregateBundleRefImages (allNodes, memberIds, seen = new Set()) {
  if (!memberIds?.length) return []
  const out = []
  for (const id of memberIds) {
    const n = allNodes.find(x => x.id === id)
    if (!n || seen.has(n.id)) continue
    seen.add(n.id)
    if (n.type === 'image') {
      const d = n.data?.base64 || n.data?.url
      if (d) out.push(d)
    } else if (n.type === 'text' && n.data?.bundleMemberIds?.length) {
      out.push(...aggregateBundleRefImages(allNodes, n.data.bundleMemberIds, seen))
    }
  }
  return out
}
