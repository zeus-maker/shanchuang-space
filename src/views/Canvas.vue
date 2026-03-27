<template>
  <!-- Canvas page | 画布页面 -->
  <div class="h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader class="bg-[var(--bg-secondary)]">
      <template #left>
        <button 
          @click="goBack"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        >
          <n-icon :size="20"><ChevronBackOutline /></n-icon>
        </button>
        <n-dropdown :options="projectOptions" @select="handleProjectAction">
          <button class="flex items-center gap-1 hover:bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg transition-colors">
            <span class="font-medium">{{ projectName }}</span>
            <n-icon :size="16"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </template>
      <template #right>
        <button 
          @click="showDownloadModal = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': hasDownloadableAssets }"
          title="批量下载素材"
        >
          <n-icon :size="20"><DownloadOutline /></n-icon>
        </button>
        <button 
          @click="showApiSettings = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': isApiConfigured }"
          title="API 设置"
        >
          <n-icon :size="20"><SettingsOutline /></n-icon>
        </button>
      </template>
    </AppHeader>

    <!-- Main canvas area | 主画布区域 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Vue Flow canvas | Vue Flow 画布 -->
      <VueFlow
        :key="flowKey"
        v-model:nodes="nodes"
        v-model:edges="edges"
        v-model:viewport="viewport"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-viewport="canvasViewport"
        :min-zoom="0.1"
        :max-zoom="4"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        :pan-on-scroll="false"
        :zoom-on-scroll="true"
        :zoom-on-pinch="true"
        :pan-on-drag="false"
        :selection-key-code="true"
        :zoom-on-double-click="false"
        @connect="onConnect"
        @node-click="onNodeClick"
        @pane-click="onPaneClick"
        @pane-mouse-move="onPaneMouseMove"
        @pane-mouse-leave="onPaneMouseLeave"
        @viewport-change-end="handleViewportChange"
        @edges-change="onEdgesChange"
        class="canvas-flow"
      >
        <!-- 必须与节点同层：Vue Flow 默认插槽在 transformationpane 之外，流坐标会错位 | Groups in zoom-pane -->
        <template #zoom-pane>
          <div
            v-for="g in canvasGroups"
            :key="g.id"
            class="absolute rounded-xl pointer-events-auto border-2 border-dashed transition-shadow"
            :class="selectedGroupId === g.id ? 'border-[var(--accent-color)] shadow-md ring-1 ring-[var(--accent-color)]/30' : 'border-white/50 dark:border-white/25'"
            :style="groupFrameStyle(g)"
            @pointerdown.stop
            @click.stop="selectGroup(g.id)"
          />
          <div
            v-if="selectedGroupId && groupToolbarPos"
            class="absolute z-[2] flex flex-wrap items-center gap-0.5 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg max-w-[min(100vw,520px)]"
            :style="{ left: `${groupToolbarPos.x}px`, top: `${groupToolbarPos.y}px` }"
            @pointerdown.stop
            @click.stop
          >
            <n-dropdown trigger="click" :options="groupFillDropdownOptions" @select="onGroupFillSelect">
              <n-button size="tiny" quaternary>底色</n-button>
            </n-dropdown>
            <n-dropdown trigger="click" :options="groupLayoutDropdownOptions" @select="onGroupLayoutSelect">
              <n-button size="tiny" quaternary>排列</n-button>
            </n-dropdown>
            <n-button size="tiny" quaternary @click="openGroupExecuteModal">整组执行</n-button>
            <n-button size="tiny" quaternary @click="showToolboxNameModal = true">添加到工具箱</n-button>
            <n-button size="tiny" quaternary @click="ungroupSelected">解组</n-button>
            <n-button size="tiny" type="primary" @click="downloadSelectedGroup">批量下载</n-button>
          </div>
        </template>
        <Background v-if="showGrid" :gap="20" :size="1" />
        <MiniMap 
          v-if="!isMobile"
          position="bottom-right"
          :pannable="true"
          :zoomable="true"
        />
      </VueFlow>

      <!-- 多选批量操作 | Multi-selection toolbar -->
      <div
        v-if="multiSelectedNodes.length >= 2"
        class="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg max-w-[95vw]"
      >
        <span class="text-xs text-[var(--text-secondary)] px-1">已选 {{ multiSelectedNodes.length }} 个</span>
        <n-button size="small" quaternary @click="saveSelectionToMaterials">保存到素材</n-button>
        <n-button size="small" quaternary @click="batchDownloadSelection">批量下载</n-button>
        <n-button size="small" quaternary @click="duplicateSelection">创建副本</n-button>
        <n-button size="small" type="primary" @click="createCanvasGroupFromSelection">打组</n-button>
      </div>

      <!-- Left toolbar | 左侧工具栏 -->
      <aside class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-10">
        <button 
          @click="showNodeMenu = !showNodeMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          title="添加节点"
        >
          <n-icon :size="20"><AddOutline /></n-icon>
        </button>
        <button 
          @click="showWorkflowPanel = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          title="工作流模板"
        >
          <n-icon :size="20"><AppsOutline /></n-icon>
        </button>
        <div class="w-full h-px bg-[var(--border-color)] my-1"></div>
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          @click="tool.action"
          :disabled="tool.disabled && tool.disabled()"
          class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :title="tool.name"
        >
          <n-icon :size="20"><component :is="tool.icon" /></n-icon>
        </button>
      </aside>

      <!-- Node menu popup | 节点菜单弹窗 -->
      <div 
        v-if="showNodeMenu"
        class="absolute left-20 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-20"
      >
        <button 
          v-for="nodeType in nodeTypeOptions" 
          :key="nodeType.type"
          @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left"
        >
          <n-icon :size="20" :color="nodeType.color"><component :is="nodeType.icon" /></n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>

      <!-- Bottom controls | 底部控制 -->
      <div class="absolute bottom-4 left-4 flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-1">
        <!-- <button 
          @click="showGrid = !showGrid" 
          :class="showGrid ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-tertiary)]'"
          class="p-2 rounded transition-colors"
          title="切换网格"
        >
          <n-icon :size="16"><GridOutline /></n-icon>
        </button> -->
        <button 
          @click="fitView({ padding: 0.2 })" 
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          title="适应视图"
        >
          <n-icon :size="16"><LocateOutline /></n-icon>
        </button>
        <div class="flex items-center gap-1 px-2">
          <button @click="zoomOut" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14"><RemoveOutline /></n-icon>
          </button>
          <span class="text-xs min-w-[40px] text-center">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button @click="zoomIn" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14"><AddOutline /></n-icon>
          </button>
        </div>
        <span class="text-[10px] text-[var(--text-tertiary)] px-1 max-w-[160px] leading-tight hidden sm:inline" title="平移画布方式">
          空白处移动鼠标平移；左键拖框多选
        </span>
      </div>

      <!-- Bottom input panel (floating) | 底部输入面板（悬浮） -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <!-- Processing indicator | 处理中指示器 -->
        <div 
          v-if="isProcessing" 
          class="mb-3 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--accent-color)] animate-pulse"
        >
          <div class="flex items-center gap-2 text-sm text-[var(--accent-color)] mb-2">
            <n-spin :size="14" />
            <span>正在生成提示词...</span>
          </div>
          <div v-if="currentResponse" class="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {{ currentResponse }}
          </div>
        </div>

        <div class="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] p-3">
          <textarea
            v-model="chatInput"
            :placeholder="inputPlaceholder"
            :disabled="isProcessing"
            class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[40px] max-h-[120px] disabled:opacity-50"
            rows="1"
            @keydown.enter.exact="handleEnterKey"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-2">
              <button 
                @click="handlePolish"
                :disabled="isProcessing || !chatInput.trim()"
                class="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI 润色提示词"
              >
                ✨ AI 润色
              </button>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <n-switch v-model:value="autoExecute" size="small" />
                自动执行
              </label>
              <button 
                @click="sendMessage"
                :disabled="isProcessing"
                class="w-8 h-8 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <n-spin v-if="isProcessing" :size="16" />
                <n-icon v-else :size="20" color="white"><SendOutline /></n-icon>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Quick suggestions | 快捷建议 -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span class="text-xs text-[var(--text-secondary)]">推荐：</span>
          <button 
            v-for="tag in suggestions" 
            :key="tag"
            @click="chatInput = tag"
            class="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
          >
            {{ tag }}
          </button>
          <button class="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
            <n-icon :size="14"><RefreshOutline /></n-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- API Settings Modal | API 设置弹窗 -->
    <ApiSettings v-model:show="showApiSettings" />

    <!-- Rename Modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal | 删除确认弹窗 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除项目" type="warning">
      <p>确定要删除项目「{{ projectName }}」吗？此操作不可恢复。</p>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" @click="confirmDelete">删除</n-button>
      </template>
    </n-modal>

    <!-- Download Modal | 下载弹窗 -->
    <DownloadModal v-model:show="showDownloadModal" />

    <!-- Workflow Panel | 工作流面板 -->
    <WorkflowPanel v-model:show="showWorkflowPanel" @add-workflow="handleAddWorkflow" />

    <!-- 整组执行说明 | Group execute info -->
    <n-modal v-model:show="showGroupExecuteModal" preset="card" title="整组执行" style="width: 480px; max-width: 92vw;">
      <p class="text-sm text-[var(--text-secondary)] mb-2">按连线依赖排序后的执行顺序（仅供参考）。自动串联各节点生成接口后续可接入；当前请按顺序在节点上手动点击生成。</p>
      <n-input v-model:value="groupExecutePromptNote" type="textarea" placeholder="可选：整组提示说明（将记入本次操作，暂不自动注入各节点）" :rows="3" class="mb-3" />
      <ol class="text-sm list-decimal pl-5 space-y-1 max-h-48 overflow-y-auto">
        <li v-for="nid in groupExecuteOrder" :key="nid">
          {{ nodeLabelForId(nid) }} <span class="text-[var(--text-tertiary)]">({{ nid }})</span>
        </li>
      </ol>
      <template #footer>
        <n-button @click="showGroupExecuteModal = false">关闭</n-button>
      </template>
    </n-modal>

    <!-- 添加到工具箱 | Save to local toolbox -->
    <n-modal v-model:show="showToolboxNameModal" preset="dialog" title="添加到工具箱">
      <n-input v-model:value="toolboxNameInput" placeholder="为此分组命名" @keydown.enter="confirmToolboxSave" />
      <template #action>
        <n-button @click="showToolboxNameModal = false">取消</n-button>
        <n-button type="primary" :disabled="!toolboxNameInput.trim()" @click="confirmToolboxSave">保存</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * Canvas view component | 画布视图组件
 * Main infinite canvas with Vue Flow integration
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { NIcon, NSwitch, NDropdown, NMessageProvider, NSpin, NModal, NInput, NButton } from 'naive-ui'
import { 
  ChevronBackOutline,
  ChevronDownOutline,
  SettingsOutline,
  AddOutline,
  ImageOutline,
  SendOutline,
  RefreshOutline,
  TextOutline,
  VideocamOutline,
  ColorPaletteOutline,
  BookmarkOutline,
  ArrowUndoOutline,
  ArrowRedoOutline,
  GridOutline,
  LocateOutline,
  RemoveOutline,
  DownloadOutline,
  AppsOutline,
  ChatbubbleOutline
} from '@vicons/ionicons5'
import { nodes, edges, addNode, addNodes, addEdge, addEdges, updateNode, initSampleData, loadProject, saveProject, clearCanvas, canvasViewport, updateViewport, undo, redo, canUndo, canRedo, manualSaveHistory, startBatchOperation, endBatchOperation, duplicateNodes, canvasGroups, addCanvasGroup, removeCanvasGroup, updateCanvasGroup, layoutGroupMembers, computeGroupBounds } from '../stores/canvas'
import { loadAllModels } from '../stores/models'
import { useChat, useWorkflowOrchestrator } from '../hooks'
import { useModelStore } from '../stores/pinia'
import { projects, initProjectsStore, updateProject, renameProject, currentProject, updateProjectCanvas } from '../stores/projects'

// API Settings component | API 设置组件
import ApiSettings from '../components/ApiSettings.vue'
import DownloadModal from '../components/DownloadModal.vue'
import WorkflowPanel from '../components/WorkflowPanel.vue'
import AppHeader from '../components/AppHeader.vue'

// API Config state | API 配置状态
const modelStore = useModelStore()
const isApiConfigured = computed(() => !!modelStore.currentApiKey)

// Initialize models on page load | 页面加载时初始化模型
onMounted(() => {
  loadAllModels()
})

// Chat templates | 问答模板
const CHAT_TEMPLATES = {
  imagePrompt: {
    name: '生图提示词',
    systemPrompt: '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、構图、细节等要素。直接返回提示词，不要其他解释。',
    model: 'gpt-4o-mini'
  },
  videoPrompt: {
    name: '视频提示词',
    systemPrompt: '你是一个专业的AI视频提示词专家。将用户输入的内容美化成高质量的视频生成提示词，包含运动、场景、镜头等要素。直接返回提示词，不要其他解释。',
    model: 'gpt-4o-mini'
  }
}

// Current template | 当前模板
const currentTemplate = ref('imagePrompt')

// Chat hook with image prompt template | 问答 hook
const { 
  loading: chatLoading, 
  status: chatStatus, 
  currentResponse, 
  send: sendChat 
} = useChat({
  systemPrompt: CHAT_TEMPLATES.imagePrompt.systemPrompt,
  model: CHAT_TEMPLATES.imagePrompt.model
})

// Workflow orchestrator hook | 工作流编排 hook
const {
  isAnalyzing: workflowAnalyzing,
  isExecuting: workflowExecuting,
  currentStep: workflowStep,
  totalSteps: workflowTotalSteps,
  executionLog: workflowLog,
  analyzeIntent,
  executeWorkflow,
  createTextToImageWorkflow,
  createMultiAngleStoryboard,
  WORKFLOW_TYPES
} = useWorkflowOrchestrator()

// Custom node components | 自定义节点组件
import TextNode from '../components/nodes/TextNode.vue'
import ImageConfigNode from '../components/nodes/ImageConfigNode.vue'
import VideoNode from '../components/nodes/VideoNode.vue'
import ImageNode from '../components/nodes/ImageNode.vue'
import VideoConfigNode from '../components/nodes/VideoConfigNode.vue'
import LLMConfigNode from '../components/nodes/LLMConfigNode.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ImageOrderEdge from '../components/edges/ImageOrderEdge.vue'

const router = useRouter()
const route = useRoute()

// Vue Flow instance | Vue Flow 实例
const { viewport, zoomIn, zoomOut, fitView, updateNodeInternals, setViewport } = useVueFlow()

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  text: markRaw(TextNode),
  imageConfig: markRaw(ImageConfigNode),
  video: markRaw(VideoNode),
  image: markRaw(ImageNode),
  videoConfig: markRaw(VideoConfigNode),
  llmConfig: markRaw(LLMConfigNode)
}

// Register custom edge types | 注册自定义边类型
const edgeTypes = {
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge),
  imageOrder: markRaw(ImageOrderEdge)
}

// UI state | UI状态
const showNodeMenu = ref(false)
const chatInput = ref('')
const autoExecute = ref(false)
const isMobile = ref(false)
const showGrid = ref(true)
const showApiSettings = ref(false)
const isProcessing = ref(false)

// Flow key for forcing re-render on project switch | 项目切换时强制重新渲染的 key
const flowKey = ref(Date.now())

// Modal state | 弹窗状态
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showWorkflowPanel = ref(false)
const renameValue = ref('')

// Check if has downloadable assets | 检查是否有可下载素材
const hasDownloadableAssets = computed(() => {
  return nodes.value.some(n => 
    (n.type === 'image' || n.type === 'video') && n.data?.url
  )
})

/** 当前多选节点（至少 2 个时显示批量工具栏）| Selected nodes for batch actions */
const multiSelectedNodes = computed(() => nodes.value.filter(n => n.selected))

/** 选中打组 id（点击半透明框）| Selected canvas group */
const selectedGroupId = ref(null)
const showGroupExecuteModal = ref(false)
const groupExecutePromptNote = ref('')
const groupExecuteOrder = ref([])
const showToolboxNameModal = ref(false)
const toolboxNameInput = ref('')
const TOOLBOX_STORAGE_KEY = 'huobao-canvas-toolbox'

const GROUP_FILL_BG = {
  none: 'transparent',
  c1: 'rgba(59, 130, 246, 0.14)',
  c2: 'rgba(168, 85, 247, 0.14)',
  c3: 'rgba(34, 197, 94, 0.14)',
  c4: 'rgba(245, 158, 11, 0.14)',
  c5: 'rgba(236, 72, 153, 0.14)',
  c6: 'rgba(20, 184, 166, 0.14)'
}

const groupFillDropdownOptions = [
  { label: '不使用', key: 'none' },
  { label: '浅蓝', key: 'c1' },
  { label: '浅紫', key: 'c2' },
  { label: '浅绿', key: 'c3' },
  { label: '浅琥珀', key: 'c4' },
  { label: '浅粉', key: 'c5' },
  { label: '浅青', key: 'c6' }
]

const groupLayoutDropdownOptions = [
  { label: '宫格排列', key: 'grid' },
  { label: '水平排列', key: 'horizontal' }
]

const groupFillBackground = (key) => GROUP_FILL_BG[key] || GROUP_FILL_BG.c1

const groupFrameStyle = (g) => {
  const { x, y, width, height } = computeGroupBounds(g.memberIds, nodes.value)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: groupFillBackground(g.fillKey),
    zIndex: 0
  }
}

const groupToolbarPos = computed(() => {
  if (!selectedGroupId.value) return null
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return null
  const b = computeGroupBounds(g.memberIds, nodes.value)
  return { x: b.x, y: Math.max(0, b.y - 46) }
})

function topoSortMembers (memberIds, edgesList) {
  const set = new Set(memberIds)
  const sub = edgesList.filter(e => set.has(e.source) && set.has(e.target))
  const indeg = new Map()
  memberIds.forEach(id => indeg.set(id, 0))
  sub.forEach(e => {
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1)
  })
  const q = memberIds.filter(id => (indeg.get(id) || 0) === 0)
  const out = []
  const seen = new Set()
  while (q.length) {
    const u = q.shift()
    out.push(u)
    seen.add(u)
    sub.filter(e => e.source === u).forEach(e => {
      const t = e.target
      indeg.set(t, indeg.get(t) - 1)
      if (indeg.get(t) === 0) q.push(t)
    })
  }
  memberIds.forEach(id => {
    if (!seen.has(id)) out.push(id)
  })
  return out
}

const nodeLabelForId = (id) => {
  const n = nodes.value.find(x => x.id === id)
  if (!n) return '节点'
  const map = { text: '文本', llmConfig: 'LLM', imageConfig: '文生图', videoConfig: '视频', image: '图片', video: '视频' }
  return n.data?.label || map[n.type] || n.type
}

const selectGroup = (id) => {
  selectedGroupId.value = id
  nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
}

const onGroupFillSelect = (key) => {
  if (!selectedGroupId.value) return
  updateCanvasGroup(selectedGroupId.value, { fillKey: key })
}

const onGroupLayoutSelect = (key) => {
  if (!selectedGroupId.value) return
  layoutGroupMembers(selectedGroupId.value, key === 'horizontal' ? 'horizontal' : 'grid')
}

const openGroupExecuteModal = () => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return
  groupExecuteOrder.value = topoSortMembers(g.memberIds, edges.value)
  showGroupExecuteModal.value = true
}

const ungroupSelected = () => {
  if (!selectedGroupId.value) return
  removeCanvasGroup(selectedGroupId.value)
  selectedGroupId.value = null
}

const downloadSelectedGroup = () => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return
  const list = nodes.value.filter(n =>
    g.memberIds.includes(n.id) && (n.type === 'image' || n.type === 'video') && n.data?.url
  )
  if (list.length === 0) {
    window.$message?.info('组内没有可下载的图片/视频链接')
    return
  }
  list.forEach(n => window.open(n.data.url, '_blank'))
  window.$message?.success(`已打开 ${list.length} 个链接`)
}

const confirmToolboxSave = () => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g || !toolboxNameInput.value.trim()) return
  try {
    const raw = JSON.parse(localStorage.getItem(TOOLBOX_STORAGE_KEY) || '[]')
    raw.push({
      name: toolboxNameInput.value.trim(),
      memberIds: [...g.memberIds],
      fillKey: g.fillKey,
      savedAt: Date.now()
    })
    localStorage.setItem(TOOLBOX_STORAGE_KEY, JSON.stringify(raw))
    window.$message?.success('已保存到本地工具箱')
    showToolboxNameModal.value = false
    toolboxNameInput.value = ''
  } catch {
    window.$message?.error('保存失败')
  }
}

/**
 * 空白画布上移动鼠标即平移视口（无按键、非输入聚焦）| Hover-move pan
 */
const onPaneMouseMove = (e) => {
  if (e.buttons !== 0) return
  const ae = document.activeElement
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return
  const { movementX, movementY } = e
  if (!movementX && !movementY) return
  const { x, y, zoom } = viewport.value
  setViewport({ x: x + movementX * 0.92, y: y + movementY * 0.92, zoom })
}

const onPaneMouseLeave = () => {}

const saveSelectionToMaterials = () => {
  const projectId = route.params.id
  if (!projectId || projectId === 'new') {
    window.$message?.warning('请使用已保存的项目')
    return
  }
  const proj = projects.value.find(p => p.id === projectId)
  const prev = proj?.canvasData?.savedMaterials || []
  const sel = multiSelectedNodes.value
  const entries = sel.map((n, i) => ({
    id: `mat_${Date.now()}_${i}_${n.id}`,
    nodeId: n.id,
    type: n.type,
    label: n.data?.label,
    url: n.data?.url,
    thumbnail: n.data?.thumbnail,
    savedAt: Date.now()
  }))
  updateProjectCanvas(projectId, { savedMaterials: [...prev, ...entries] })
  window.$message?.success(`已将 ${entries.length} 条记入项目素材（canvasData.savedMaterials）`)
}

const batchDownloadSelection = () => {
  const withUrl = multiSelectedNodes.value.filter(n =>
    (n.type === 'image' || n.type === 'video') && n.data?.url
  )
  if (withUrl.length === 0) {
    window.$message?.info('选中节点中没有带链接的图片/视频')
    return
  }
  withUrl.forEach(n => window.open(n.data.url, '_blank'))
  window.$message?.success(`已打开 ${withUrl.length} 个链接`)
}

const duplicateSelection = () => {
  const ids = multiSelectedNodes.value.map(n => n.id)
  const newIds = duplicateNodes(ids)
  nextTick(() => {
    newIds.forEach(id => updateNodeInternals(id))
  })
  window.$message?.success(`已创建 ${newIds.length} 个副本`)
}

const createCanvasGroupFromSelection = () => {
  const sel = multiSelectedNodes.value
  if (sel.length < 2) return
  const gid = addCanvasGroup(sel.map(n => n.id))
  if (!gid) return
  nodes.value = nodes.value.map(n => ({ ...n, selected: false }))
  selectedGroupId.value = gid
  window.$message?.success('已打组：点击半透明区域可使用工具栏')
}


// Project info | 项目信息
const projectName = computed(() => {
  const project = projects.value.find(p => p.id === route.params.id)
  return project?.name || '未命名项目'
})

// Project dropdown options | 项目下拉选项
const projectOptions = [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'duplicate' },
  { label: '删除', key: 'delete' }
]

// Toolbar tools | 工具栏工具
const tools = [
  { id: 'text', name: '文本', icon: TextOutline, action: () => addNewNode('text') },
  { id: 'image', name: '图片', icon: ImageOutline, action: () => addNewNode('image') },
  { id: 'imageConfig', name: '文生图', icon: ColorPaletteOutline, action: () => addNewNode('imageConfig') },
  { id: 'videoConfig', name: '视频生成', icon: VideocamOutline, action: () => addNewNode('videoConfig') },
  { id: 'undo', name: '撤销', icon: ArrowUndoOutline, action: () => undo(), disabled: () => !canUndo() },
  { id: 'redo', name: '重做', icon: ArrowRedoOutline, action: () => redo(), disabled: () => !canRedo() }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'llmConfig', name: 'LLM文本生成', icon: ChatbubbleOutline, color: '#a855f7' },
  { type: 'imageConfig', name: '文生图配置', icon: ColorPaletteOutline, color: '#22c55e' },
  { type: 'videoConfig', name: '视频生成配置', icon: VideocamOutline, color: '#f59e0b' },
  { type: 'image', name: '图片节点', icon: ImageOutline, color: '#8b5cf6' },
  { type: 'video', name: '视频节点', icon: VideocamOutline, color: '#ef4444' }
]

// Input placeholder | 输入占位符
const inputPlaceholder = '你可以试着说"帮我生成一个二次元的卡通角色"'

// Quick suggestions | 快捷建议
const suggestions = [
  '像个魔法森林',
  '三只不同的小猫',
  '生成多角度分镜',
  '夏日田野环绕漫步'
]

// Add new node | 添加新节点
const addNewNode = async (type) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom
  
  // Add node at viewport center | 在视口中心添加节点
  const nodeId = addNode(type, { x: viewportCenterX - 100, y: viewportCenterY - 100 })
  
  // Set highest z-index | 设置最高层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  updateNode(nodeId, { zIndex: maxZIndex + 1 })
  
  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(nodeId)
  }, 50)
  
  showNodeMenu.value = false
}

// Handle add workflow from panel | 处理从面板添加工作流
const handleAddWorkflow = ({ workflow, options }) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom

  // Create nodes from workflow template | 从工作流模板创建节点
  const startPosition = { x: viewportCenterX - 300, y: viewportCenterY - 200 }
  const { nodes: newNodes, edges: newEdges } = workflow.createNodes(startPosition, options)

  // Start batch operation manually | 手动开始批量操作
  startBatchOperation()

  // Add nodes to canvas in batch | 批量将节点添加到画布
  const nodeSpecs = newNodes.map(node => ({
    type: node.type,
    position: node.position,
    data: node.data
  }))
  const nodeIds = addNodes(nodeSpecs, false)

  // Map old node IDs to new IDs | 映射旧节点ID到新ID
  const idMap = {}
  newNodes.forEach((node, index) => {
    idMap[node.id] = nodeIds[index]
  })

  // Add edges to canvas in batch | 批量将边添加到画布
  const edgeSpecs = newEdges.map(edge => ({
    source: idMap[edge.source] || edge.source,
    target: idMap[edge.target] || edge.target,
    sourceHandle: edge.sourceHandle || 'right',
    targetHandle: edge.targetHandle || 'left',
    type: edge.type,
    data: edge.data
  }))

  // Add edges (autoBatch=false to use manual batch) | 添加边（autoBatch=false 以使用手动批量）
  addEdges(edgeSpecs, false)

  // End batch operation and save to history | 结束批量操作并保存到历史
  endBatchOperation()

  // Delay node internals update | 延迟节点内部更新
  setTimeout(() => {
    // Update node internals | 更新节点内部
    nodeIds.forEach(nodeId => {
      updateNodeInternals(nodeId)
    })
  }, 100)

  window.$message?.success(`已添加工作流: ${workflow.name}`)
}

// Handle connection | 处理连接
const onConnect = (params) => {
  // Check connection types | 检查连接类型
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)
  
  if (sourceNode?.type === 'image' && targetNode?.type === 'videoConfig') {
    // Use imageRole edge type | 使用图片角色边类型
    addEdge({
      ...params,
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
    })
  } else if (sourceNode?.type === 'text' && targetNode?.type === 'imageConfig') {
    // Use promptOrder edge type | 使用提示词顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingTextEdges = edges.value.filter(e => 
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1
    
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'image' && targetNode?.type === 'imageConfig') {
    // Use imageOrder edge type | 使用图片顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingImageEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'imageOrder'
    )

    // Get @ mentioned image count from connected TextNodes | 获取已连接 TextNode 中 @ 提及的图片数量
    let mentionedImageCount = 0
    const connectedTextEdges = edges.value.filter(e => e.target === params.target)
    for (const edge of connectedTextEdges) {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      if (sourceNode?.type === 'text') {
        const content = sourceNode.data?.content || ''
        // Count @ mentions of image nodes | 统计图片节点的 @ 提及
        const mentionRegex = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
        let match
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedNode = nodes.value.find(n => n.id === match[1])
          if (mentionedNode?.type === 'image') {
            mentionedImageCount++
          }
        }
      }
    }

    // Next order = existing edges + mentioned image count + 1 | 下一个序号 = 现有边数 + @提及图片数 + 1
    const nextOrder = existingImageEdges.length + mentionedImageCount + 1

    addEdge({
      ...params,
      type: 'imageOrder',
      data: { imageOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'imageConfig') {
    // LLM output as prompt for image generation | LLM 输出作为图片生成提示词
    const existingTextEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1

    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'videoConfig') {
    // LLM output as prompt for video generation | LLM 输出作为视频生成提示词
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: 1 }
    })
  } else {
    addEdge(params)
  }
}
const onNodeClick = (event) => {
  // nodes.value.forEach(node => {
  //   updateNode(node.id, { selected: false })
  // })
  
  // // Select clicked node | 选中的节点
  // const clickedNode = nodes.value.find(n => n.id === event.node.id)
  // if (clickedNode) {
  //   updateNode(event.node.id, { selected: true })
  // }
}

// 仅在平移/缩放结束后写入 store，避免拖拽过程中每帧触发响应式与防抖保存导致卡顿
const handleViewportChange = (newViewport) => {
  updateViewport(newViewport)
}

// Handle edges change | 处理边变化
const onEdgesChange = (changes) => {
  // Check if any edge is being removed | 检查是否有边被删除
  const hasRemoval = changes.some(change => change.type === 'remove')
  
  if (hasRemoval) {
    // Trigger history save after edge removal | 边删除后触发历史保存
    nextTick(() => {
      manualSaveHistory()
    })
  }
}

// Handle pane click | 处理画布点击
const onPaneClick = () => {
  showNodeMenu.value = false
  selectedGroupId.value = null
}

// Handle project action | 处理项目操作
const handleProjectAction = (key) => {
  switch (key) {
    case 'rename':
      renameValue.value = projectName.value
      showRenameModal.value = true
      break
    case 'duplicate':
      // TODO: Implement duplicate
      window.$message?.info('复制功能开发中')
      break
    case 'delete':
      showDeleteModal.value = true
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = () => {
  const projectId = route.params.id
  if (renameValue.value.trim()) {
    renameProject(projectId, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
}

// Confirm delete | 确认删除
const confirmDelete = () => {
  const projectId = route.params.id
  // deleteProject(projectId) // TODO: import deleteProject
  showDeleteModal.value = false
  window.$message?.success('项目已删除')
  router.push('/')
}

// Handle Enter key | 处理回车键
const handleEnterKey = (e) => {
  e.preventDefault()
  sendMessage()
}

// Handle AI polish | 处理 AI 润色
const handlePolish = async () => {
  const input = chatInput.value.trim()
  if (!input) return
  
  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    showApiSettings.value = true
    return
  }

  isProcessing.value = true
  const originalInput = chatInput.value

  try {
    // Call chat API to polish the prompt | 调用 AI 润色提示词
    const result = await sendChat(input, true)
    
    if (result) {
      chatInput.value = result
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    chatInput.value = originalInput
    window.$message?.error(err.message || '润色失败')
  } finally {
    isProcessing.value = false
  }
}

// Send message | 发送消息
const sendMessage = async () => {
  const input = chatInput.value.trim()
  if (!input) return

  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    showApiSettings.value = true
    return
  }

  isProcessing.value = true
  const content = chatInput.value
  chatInput.value = ''

  try {
    // Calculate position to avoid overlap | 计算位置避免重叠
    let maxY = 0
    if (nodes.value.length > 0) {
      maxY = Math.max(...nodes.value.map(n => n.position.y))
    }
    const baseX = 100
    const baseY = maxY + 200

    if (autoExecute.value) {
      // Auto-execute mode: analyze intent and execute workflow | 自动执行模式：分析意图并执行工作流
      window.$message?.info('正在分析工作流...')
      
      try {
        // Analyze user intent | 分析用户意图
        const result = await analyzeIntent(content)
        
        // Ensure we have valid workflow params | 确保有效的工作流参数
        const workflowParams = {
          workflow_type: result?.workflow_type || WORKFLOW_TYPES.TEXT_TO_IMAGE,
          image_prompt: result?.image_prompt || content,
          video_prompt: result?.video_prompt || content,
          character: result?.character,
          shots: result?.shots
        }
        
        window.$message?.info(`执行工作流: ${result?.description || '文生图'}`)
        
        // Execute the workflow | 执行工作流
        await executeWorkflow(workflowParams, { x: baseX, y: baseY })
        
        window.$message?.success('工作流已启动')
      } catch (err) {
        console.error('Workflow error:', err)
        // Fallback to simple text-to-image | 回退到文生图
        window.$message?.warning('使用默认文生图工作流')
        await createTextToImageWorkflow(content, { x: baseX, y: baseY })
      }
    } else {
      // Manual mode: just create nodes | 手动模式：仅创建节点
      const textNodeId = addNode('text', { x: baseX, y: baseY }, { 
        content: content, 
        label: '提示词' 
      })
      
      const imageConfigNodeId = addNode('imageConfig', { x: baseX + 400, y: baseY }, {
        label: '文生图'
      })
      
      addEdge({
        source: textNodeId,
        target: imageConfigNodeId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
    }
  } catch (err) {
    window.$message?.error(err.message || '创建失败')
  } finally {
    isProcessing.value = false
  }
}

// Go back to home | 返回首页
const goBack = () => {
  router.push('/')
}

// Check if mobile | 检测是否移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Load project by ID | 根据ID加载项目
const loadProjectById = (projectId) => {
  selectedGroupId.value = null
  // Update flow key to force VueFlow re-render | 更新 key 强制 VueFlow 重新渲染
  flowKey.value = Date.now()

  if (projectId && projectId !== 'new') {
    loadProject(projectId)
  } else {
    // New project - clear canvas | 新项目 - 清空画布
    clearCanvas()
  }
}

watch(canvasGroups, (list) => {
  if (selectedGroupId.value && !list.some(g => g.id === selectedGroupId.value)) {
    selectedGroupId.value = null
  }
}, { deep: true })

// Watch for route changes | 监听路由变化
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Save current project before switching | 切换前保存当前项目
      if (oldId) {
        saveProject()
      }
      // Load new project | 加载新项目
      loadProjectById(newId)
    }
  }
)

// Initialize | 初始化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Initialize projects store | 初始化项目存储
  initProjectsStore()
  
  // Load project data | 加载项目数据
  loadProjectById(route.params.id)
  
  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('ai-canvas-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('ai-canvas-initial-prompt')
    chatInput.value = initialPrompt
    // Auto-send the message | 自动发送消息
    nextTick(() => {
      sendMessage()
    })
  }
})

// Cleanup on unmount | 卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  // Save project before leaving | 离开前保存项目
  saveProject()
})
</script>

<style>
/* Import Vue Flow styles | 引入 Vue Flow 样式 */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/minimap/dist/style.css';

.canvas-flow {
  width: 100%;
  height: 100%;
}

.canvas-flow :deep(.vue-flow__viewport) {
  touch-action: none;
}
</style>
