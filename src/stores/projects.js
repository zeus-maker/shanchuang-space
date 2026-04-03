/**
 * Projects store | 项目状态管理
 * Manages projects with localStorage persistence
 */
import { ref, computed, watch } from 'vue'

// Storage key | 存储键
const STORAGE_KEY = 'shanchuang-space-projects'

// Generate unique ID | 生成唯一ID
const generateId = () => `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Projects list | 项目列表
export const projects = ref([])

// Current project ID | 当前项目ID
export const currentProjectId = ref(null)

// Current project | 当前项目
export const currentProject = computed(() => {
  return projects.value.find(p => p.id === currentProjectId.value) || null
})

/**
 * Load projects from localStorage | 从 localStorage 加载项目
 */
export const loadProjects = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects | 将日期字符串转换回 Date 对象
      projects.value = parsed.map(p => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }))
    }
  } catch (err) {
    console.error('Failed to load projects:', err)
    projects.value = []
  }
}

/** 单节点文本字段写入 localStorage 的上限（超长截断，避免配额爆满） */
const MAX_NODE_STRING_PERSIST = 120000
/** 多图节点保留的远程 URL 条数上限 */
const MAX_GENERATED_URLS_PERSIST = 24

/** 可持久化的图片 URL（非 data/blob）；与 generatedLocalKeys 按下标成对保留 */
function zipPersistableGeneratedAssets (generatedUrls, generatedLocalKeys, maxCount = MAX_GENERATED_URLS_PERSIST) {
  const urls = Array.isArray(generatedUrls) ? generatedUrls : []
  const keys = Array.isArray(generatedLocalKeys) ? generatedLocalKeys : []
  const n = Math.max(urls.length, keys.length)
  const pairs = []
  for (let i = 0; i < n; i++) {
    const u = urls[i]
    const k = keys[i]
    if (typeof u !== 'string' || !u.trim()) continue
    const t = u.trim()
    if (t.startsWith('data:') || t.startsWith('blob:')) continue
    pairs.push({ u: t, k: typeof k === 'string' && k ? k : null })
  }
  const cap = Math.max(0, Number(maxCount) || MAX_GENERATED_URLS_PERSIST)
  const sliced = pairs.slice(0, cap)
  return {
    generatedUrls: sliced.map((p) => p.u),
    generatedLocalKeys: sliced.map((p) => p.k)
  }
}

function isPersistableImageRef (u) {
  if (typeof u !== 'string' || !u.trim()) return false
  const t = u.trim()
  if (t.startsWith('data:') || t.startsWith('blob:')) return false
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('/api/')
  )
}

/**
 * 深度移除 data: URL、超大字符串（图生视频首帧、分镜图等多为 mega base64）
 */
function deepStripHeavyStrings (value, depth = 0) {
  if (depth > 14) return value
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return ''
    if (value.length > MAX_NODE_STRING_PERSIST * 2) {
      return `${value.slice(0, MAX_NODE_STRING_PERSIST)}\n…[已截断以节省存储]`
    }
    return value
  }
  if (value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map((x) => deepStripHeavyStrings(x, depth + 1))
  }
  const out = { ...value }
  for (const k of Object.keys(out)) {
    const v = out[k]
    if (typeof v === 'string') {
      if (v.startsWith('data:')) {
        delete out[k]
        continue
      }
      if (v.length > MAX_NODE_STRING_PERSIST * 2) {
        out[k] = `${v.slice(0, MAX_NODE_STRING_PERSIST)}\n…[已截断以节省存储]`
        continue
      }
    } else if (v != null && typeof v === 'object') {
      out[k] = deepStripHeavyStrings(v, depth + 1)
    }
  }
  return out
}

const cleanEdgeForStorage = (edge) => {
  if (!edge?.data) return edge
  return { ...edge, data: deepStripHeavyStrings({ ...edge.data }) }
}

/**
 * Clean node data for storage | 清理节点数据用于存储
 * Removes base64 data URLs to reduce storage size | 移除 base64 数据减小存储大小
 */
const cleanNodeForStorage = (node) => {
  if (!node.data) return node

  const cleanedData = { ...node.data }

  // Remove base64 data | 移除 base64 数据
  if (cleanedData.base64) {
    delete cleanedData.base64
  }

  // If url is a base64 data URL, keep it only if it's from external source | 如果 url 是 base64，只有外部来源才保留
  if (cleanedData.url?.startsWith?.('data:')) {
    // For uploaded images, we can't persist them in localStorage | 上传的图片无法持久化到 localStorage
    delete cleanedData.url
  }

  // Remove mask data | 移除蒙版数据
  if (cleanedData.maskData) {
    delete cleanedData.maskData
  }

  // 视频 / 预览：data URL 不入库
  if (cleanedData.thumbnail?.startsWith?.('data:')) delete cleanedData.thumbnail
  if (cleanedData.selectedUrl?.startsWith?.('data:')) delete cleanedData.selectedUrl

  // 图生视频参数：首帧/尾帧常为 mega base64
  if (cleanedData.videoGenParams && typeof cleanedData.videoGenParams === 'object') {
    const vg = { ...cleanedData.videoGenParams }
    if (vg.first_frame_image?.startsWith?.('data:')) delete vg.first_frame_image
    if (vg.last_frame_image?.startsWith?.('data:')) delete vg.last_frame_image
    cleanedData.videoGenParams = vg
  }

  // 多图结果：去掉 data/blob，keys 与 urls 成对截断（避免长度不一致导致预览全走失效外链）
  const zipped = zipPersistableGeneratedAssets(
    cleanedData.generatedUrls,
    cleanedData.generatedLocalKeys
  )
  cleanedData.generatedUrls = zipped.generatedUrls
  cleanedData.generatedLocalKeys = zipped.generatedLocalKeys

  const stripped = deepStripHeavyStrings(cleanedData)
  return { ...node, data: stripped }
}

/**
 * Clean project for storage | 清理项目用于存储
 */
const cleanProjectForStorage = (project) => {
  return {
    ...project,
    canvasData: project.canvasData ? {
      ...project.canvasData,
      nodes: project.canvasData.nodes?.map(cleanNodeForStorage) || [],
      edges: project.canvasData.edges?.map(cleanEdgeForStorage) || []
    } : project.canvasData,
    // Remove base64 thumbnails | 移除 base64 缩略图
    thumbnail: project.thumbnail?.startsWith?.('data:') ? '' : project.thumbnail
  }
}

/**
 * Save projects to localStorage | 保存项目到 localStorage
 * Handles QuotaExceededError by compressing data | 通过压缩数据处理配额超限错误
 */
export const saveProjects = () => {
  // Always clean data before saving | 保存前始终清理数据
  let cleanedProjects = projects.value.map(cleanProjectForStorage)

  const trySet = (payload) => localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))

  try {
    trySet(cleanedProjects)
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, attempting aggressive cleanup...')

      // 第二轮：每节点仅保留少量远程图 URL、清空所有缩略图
      cleanedProjects = cleanedProjects.map((project) => ({
        ...project,
        thumbnail: '',
        canvasData: project.canvasData
          ? {
              ...project.canvasData,
              nodes: project.canvasData.nodes?.map((n) => {
                const c = cleanNodeForStorage(n)
                const d = { ...c.data }
                const z = zipPersistableGeneratedAssets(d.generatedUrls, d.generatedLocalKeys, 6)
                const pairs = z.generatedUrls
                  .map((u, i) => ({ u, k: z.generatedLocalKeys[i] }))
                  .filter((p) => isPersistableImageRef(p.u))
                d.generatedUrls = pairs.map((p) => p.u).slice(0, 6)
                d.generatedLocalKeys = pairs.map((p) => p.k).slice(0, 6)
                return { ...c, data: deepStripHeavyStrings(d) }
              }) || [],
              edges: project.canvasData.edges?.map(cleanEdgeForStorage) || []
            }
          : project.canvasData
      }))

      try {
        trySet(cleanedProjects)
        loadProjects()
        window.$message?.warning('存储空间不足，已压缩画布中的大图与多图链接')
        return
      } catch (e2) {
        console.warn('Second cleanup failed, trimming old projects...', e2)
      }

      // 第三轮：去掉较早项目的画布实体，只留视口
      const minimalProjects = cleanedProjects.map((project, index) => ({
        ...project,
        thumbnail: '',
        canvasData:
          index > 10
            ? { nodes: [], edges: [], viewport: project.canvasData?.viewport, canvasGroups: [] }
            : project.canvasData
      }))

      try {
        trySet(minimalProjects)
        loadProjects()
        console.log('Saved with aggressive cleanup')
        window.$message?.warning('存储空间不足，已自动清理部分较早项目的画布')
        return
      } catch (retryErr) {
        console.error('Still failed after aggressive cleanup:', retryErr)
      }

      // 第四轮：只保留前 5 个项目
      try {
        const essentialProjects = cleanedProjects.slice(0, 5).map((p) => ({
          ...p,
          thumbnail: '',
          canvasData: p.canvasData
            ? {
                nodes: [],
                edges: [],
                viewport: p.canvasData.viewport,
                canvasGroups: []
              }
            : p.canvasData
        }))
        trySet(essentialProjects)
        projects.value = projects.value.slice(0, 5)
        loadProjects()
        window.$message?.warning('存储空间严重不足，已保留最近 5 个项目并清空其画布节点')
        return
      } catch (finalErr) {
        console.error('Cannot save even minimal data:', finalErr)
      }

      // 第五轮：仅保留 1 个项目壳，避免完全无法写入
      try {
        const one = cleanedProjects.slice(0, 1).map((p) => ({
          ...p,
          thumbnail: '',
          canvasData: {
            nodes: [],
            edges: [],
            viewport: p.canvasData?.viewport || { x: 0, y: 0, zoom: 0.8 },
            canvasGroups: []
          }
        }))
        trySet(one)
        projects.value = projects.value.slice(0, 1)
        loadProjects()
        window.$message?.error('存储配额已满：已仅保留 1 个项目壳，请导出备份后清理浏览器站点数据')
      } catch (last) {
        console.error('Cannot save even minimal data:', last)
        window.$message?.error('存储失败，请在浏览器设置中清理本站点数据或删除其它占用 localStorage 的项')
      }
    } else {
      console.error('Failed to save projects:', err)
    }
  }
}

/**
 * Create a new project | 创建新项目
 * @param {string} name - Project name | 项目名称
 * @returns {string} - New project ID | 新项目ID
 */
export const createProject = (name = '未命名项目') => {
  const id = generateId()
  const now = new Date()
  
  const newProject = {
    id,
    name,
    thumbnail: '',
    createdAt: now,
    updatedAt: now,
    // Canvas data | 画布数据
    canvasData: {
      nodes: [],
      edges: [],
      viewport: { x: 100, y: 50, zoom: 0.8 }
    }
  }
  
  projects.value = [newProject, ...projects.value]
  saveProjects()
  
  return id
}

/**
 * Update project | 更新项目
 * @param {string} id - Project ID | 项目ID
 * @param {object} data - Update data | 更新数据
 */
export const updateProject = (id, data) => {
  const index = projects.value.findIndex(p => p.id === id)
  if (index === -1) return false
  
  projects.value[index] = {
    ...projects.value[index],
    ...data,
    updatedAt: new Date()
  }
  
  // Move to top of list | 移动到列表顶部
  const [updated] = projects.value.splice(index, 1)
  projects.value = [updated, ...projects.value]
  
  saveProjects()
  return true
}

/**
 * Update project canvas data | 更新项目画布数据
 * @param {string} id - Project ID | 项目ID
 * @param {object} canvasData - Canvas data (nodes, edges, viewport) | 画布数据
 */
export const updateProjectCanvas = (id, canvasData) => {
  const project = projects.value.find(p => p.id === id)
  if (!project) return false
  
  project.canvasData = {
    ...project.canvasData,
    ...canvasData
  }
  project.updatedAt = new Date()
  
  // Auto-update thumbnail from last edited image/video node | 自动从最后编辑的图片/视频节点更新缩略图
  if (canvasData.nodes) {
    const mediaNodes = canvasData.nodes
      .filter(node => (node.type === 'image' || node.type === 'video') && node.data?.url)
      .sort((a, b) => {
        // Sort by last updated time | 按最后更新时间排序
        const aTime = a.data?.updatedAt || a.data?.createdAt || 0
        const bTime = b.data?.updatedAt || b.data?.createdAt || 0
        return bTime - aTime
      })
    if (mediaNodes.length > 0) {
      const latestNode = mediaNodes[0]
      // Use thumbnail for video nodes, url for image nodes | 视频节点使用缩略图，图片节点使用 URL
      if (latestNode.type === 'video') {
        project.thumbnail = latestNode.data.thumbnail || latestNode.data.url
      } else {
        project.thumbnail = latestNode.data.url
      }
    }
  }
  
  saveProjects()
  return true
}

/**
 * Get project canvas data | 获取项目画布数据
 * @param {string} id - Project ID | 项目ID
 * @returns {object|null} - Canvas data or null | 画布数据或空
 */
export const getProjectCanvas = (id) => {
  const project = projects.value.find(p => p.id === id)
  return project?.canvasData || null
}

/**
 * Delete project | 删除项目
 * @param {string} id - Project ID | 项目ID
 */
export const deleteProject = (id) => {
  projects.value = projects.value.filter(p => p.id !== id)
  saveProjects()
}

/**
 * Duplicate project | 复制项目
 * @param {string} id - Source project ID | 源项目ID
 * @returns {string|null} - New project ID or null | 新项目ID或空
 */
export const duplicateProject = (id) => {
  const source = projects.value.find(p => p.id === id)
  if (!source) return null
  
  const newId = generateId()
  const now = new Date()
  
  const newProject = {
    ...JSON.parse(JSON.stringify(source)), // Deep clone | 深拷贝
    id: newId,
    name: `${source.name} (副本)`,
    createdAt: now,
    updatedAt: now
  }
  
  projects.value = [newProject, ...projects.value]
  saveProjects()
  
  return newId
}

/**
 * Rename project | 重命名项目
 * @param {string} id - Project ID | 项目ID
 * @param {string} name - New name | 新名称
 */
export const renameProject = (id, name) => {
  return updateProject(id, { name })
}

/**
 * Update project thumbnail | 更新项目缩略图
 * @param {string} id - Project ID | 项目ID
 * @param {string} thumbnail - Thumbnail URL (base64 or URL) | 缩略图URL
 */
export const updateProjectThumbnail = (id, thumbnail) => {
  return updateProject(id, { thumbnail })
}

/**
 * Get sorted projects | 获取排序后的项目列表
 * @param {string} sortBy - Sort field (updatedAt, createdAt, name) | 排序字段
 * @param {string} order - Sort order (asc, desc) | 排序顺序
 */
export const getSortedProjects = (sortBy = 'updatedAt', order = 'desc') => {
  return computed(() => {
    const sorted = [...projects.value]
    sorted.sort((a, b) => {
      let valueA = a[sortBy]
      let valueB = b[sortBy]
      
      if (valueA instanceof Date) {
        valueA = valueA.getTime()
        valueB = valueB.getTime()
      }
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase()
        valueB = valueB.toLowerCase()
      }
      
      if (order === 'asc') {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })
    return sorted
  })
}

/**
 * Initialize projects store | 初始化项目存储
 */
export const initProjectsStore = () => {
  loadProjects()
  
  // Create sample project if empty | 如果为空则创建示例项目
  if (projects.value.length === 0) {
    const id = createProject('示例项目')
    const project = projects.value.find(p => p.id === id)
    if (project) {
      project.canvasData = {
        nodes: [
          {
            id: 'node_0',
            type: 'text',
            position: { x: 150, y: 150 },
            data: {
              content: '一只金毛寻回犬在草地上奔跑，摇着尾巴，脸上带着快乐的表情。它的毛发在阳光下闪耀，眼神充满了对自由的渴望，全身散发着阳光、友善的气息。',
              label: '文本输入'
            }
          },
          {
            id: 'node_1',
            type: 'imageConfig',
            position: { x: 500, y: 150 },
            data: {
              prompt: '',
              model: 'doubao-seedream-4-5-251128',
              size: '512x512',
              label: '文生图'
            }
          }
        ],
        edges: [
          {
            id: 'edge_node_0_node_1',
            source: 'node_0',
            target: 'node_1',
            sourceHandle: 'right',
            targetHandle: 'left'
          }
        ],
        viewport: { x: 100, y: 50, zoom: 0.8 }
      }
      saveProjects()
    }
  }
}

// Export for debugging | 导出用于调试
if (typeof window !== 'undefined') {
  window.__aiCanvasProjects = {
    projects,
    loadProjects,
    saveProjects,
    createProject,
    deleteProject
  }
}
