/**
 * 分镜组 ↔ 脚本节点：解析组内可用的 scenes（与 Canvas 批量视频逻辑一致）
 */

/**
 * @param {import('vue').Ref|Array} nodesVal
 * @param {import('vue').Ref|Array} edgesVal
 * @param {import('vue').Ref|Array} groupsVal
 * @param {string} groupId
 * @returns {Array}
 */
export function findScriptScenesForGroup (nodesVal, edgesVal, groupsVal, groupId) {
  const nodes = Array.isArray(nodesVal) ? nodesVal : (nodesVal?.value ?? [])
  const edges = Array.isArray(edgesVal) ? edgesVal : (edgesVal?.value ?? [])
  const canvasGroups = Array.isArray(groupsVal) ? groupsVal : (groupsVal?.value ?? [])

  const g = canvasGroups.find(x => x.id === groupId)
  if (!g) return []

  const proxyInGroup = g.memberIds.find(mid => {
    const n = nodes.find(x => x.id === mid)
    return n?.type === 'groupProxy'
  })
  if (proxyInGroup) {
    const inEdge = edges.find(e => e.target === proxyInGroup)
    if (inEdge) {
      const srcProxy = nodes.find(n => n.id === inEdge.source && n.type === 'groupProxy')
      let scriptNode = null
      if (!srcProxy) {
        scriptNode = nodes.find(n => n.id === inEdge.source && n.type === 'script')
      } else {
        const scriptEdge = edges.find(e => e.target === srcProxy.id)
        if (scriptEdge) scriptNode = nodes.find(n => n.id === scriptEdge.source && n.type === 'script')
      }
      if (scriptNode?.data?.scenes?.length) return scriptNode.data.scenes
    }
  }

  for (const e of edges) {
    if (e.sourceHandle !== 'script-output') continue
    const scriptNode = nodes.find(n => n.id === e.source && n.type === 'script')
    if (!scriptNode?.data?.scenes?.length) continue
    const tid = e.target
    if (g.memberIds.includes(tid)) return scriptNode.data.scenes
    const tnode = nodes.find(n => n.id === tid)
    if (tnode?.type === 'groupProxy') {
      const grp = canvasGroups.find(grp => grp.memberIds?.includes(tid))
      if (grp?.id === groupId) return scriptNode.data.scenes
    }
  }
  return []
}

/** 节点所在画布组的 id（成员含该节点 id 的组） */
export function findCanvasGroupIdContainingNode (groupsVal, nodeId) {
  const canvasGroups = Array.isArray(groupsVal) ? groupsVal : (groupsVal?.value ?? [])
  const g = canvasGroups.find(x => x.memberIds?.includes(nodeId))
  return g?.id ?? null
}
