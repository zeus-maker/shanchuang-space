/**
 * 整组执行：Canvas 派发事件，对应 nodeId 的配置节点执行 runExecute | Bridge for sequential group run
 */
import { onMounted, onUnmounted } from 'vue'

export const CANVAS_GROUP_NODE_EXECUTE_EVENT = 'shanchuang-space-group-node-execute'

export function registerCanvasGroupNodeExecuteBridge (nodeIdGetter, runExecute) {
  const handler = async (e) => {
    const id = typeof nodeIdGetter === 'function' ? nodeIdGetter() : nodeIdGetter
    if (e.detail?.nodeId !== id) return
    const { resolve, reject } = e.detail
    try {
      await runExecute()
      resolve?.()
    } catch (err) {
      reject?.(err)
    }
  }
  onMounted(() => window.addEventListener(CANVAS_GROUP_NODE_EXECUTE_EVENT, handler))
  onUnmounted(() => window.removeEventListener(CANVAS_GROUP_NODE_EXECUTE_EVENT, handler))
}
