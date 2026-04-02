<template>
  <!-- Video node wrapper | 视频节点包裹层 -->
  <div class="video-node-wrapper relative" @mouseenter="showActions = true; showHandleMenu = true" @mouseleave="showActions = false; showHandleMenu = false">
    <!-- Video node | 视频节点 -->
    <div 
      class="video-node bg-[var(--bg-secondary)] rounded-xl border relative transition-all duration-200"
      :class="[
        data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]',
        showVideoPromptPanel ? 'w-[460px]' : 'w-[400px]'
      ]"
    >
    <!-- Header | 头部 -->
    <div class="px-3 py-2 border-b border-[var(--border-color)]">
      <div class="flex items-center justify-between">
        <span
          v-if="!isEditingLabel"
          @dblclick="startEditLabel"
          class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
          title="双击编辑名称"
        >{{ data.label }}</span>
        <input
          v-else
          ref="labelInputRef"
          v-model="editingLabelValue"
          @blur="finishEditLabel"
          @keydown.enter="finishEditLabel"
          @keydown.escape="cancelEditLabel"
          class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-blue-500"
        />
        <div class="flex items-center gap-1">
          <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="复制节点">
            <n-icon :size="14">
              <CopyOutline />
            </n-icon>
          </button>
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="删除节点">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
        </div>
      </div>
      <!-- 模型 key（完整编辑面板打开时改在底部展示） -->
      <div v-if="data.model && !showVideoPromptPanel" class="mt-1 text-xs text-[var(--text-secondary)] truncate">
        {{ data.model }}
      </div>
    </div>
    
    <!-- Video preview area | 视频预览区域 -->
    <div class="p-3">
      <!-- Loading state | 加载状态 -->
      <div 
        v-if="(data.taskId && !data.url) || (data.loading && !data.taskId)"
        class="aspect-video rounded-lg bg-gradient-to-br from-cyan-400 via-blue-300 to-amber-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
      >
        <!-- Animated gradient overlay | 动画渐变遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-400/20 to-amber-300/20 animate-pulse"></div>

        <!-- Loading image | 加载图片 -->
        <div class="relative z-10">
          <img
            src="../../assets/loading.webp"
            alt="Loading"
            class="w-14 h-12"
          />
        </div>

        <span class="text-sm text-white font-medium relative z-10">{{ data.taskId ? '创作中，预计等待 1 分钟' : '任务创建中...' }}</span>
      </div>
      <!-- Error state | 错误状态 -->
      <div 
        v-else-if="data.error"
        class="aspect-video rounded-lg bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-200 dark:border-red-800"
      >
        <n-icon :size="32" class="text-red-500"><CloseCircleOutline /></n-icon>
        <span class="text-sm text-red-500">{{ data.error }}</span>
      </div>
      <!-- Video preview | 视频预览 -->
      <div v-else-if="data.url" class="space-y-2">
        <div
          v-if="showVideoPromptPanel"
          class="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]"
        >
          <n-icon :size="18" class="text-[var(--accent-color)] shrink-0"><PlayCircleOutline /></n-icon>
          <span class="truncate">{{ data.label || '分镜视频' }}</span>
        </div>
        <div class="relative group/vid rounded-lg overflow-hidden bg-black">
          <!-- 参考图：预览区上方悬浮工具条 -->
          <div
            v-if="showVideoPromptPanel"
            class="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 opacity-0 group-hover/vid:opacity-100 transition-opacity duration-200 pointer-events-auto"
          >
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="vid-toolbar-btn" @click="onToolbarClip">
                  <n-icon :size="16"><CutOutline /></n-icon>
                </button>
              </template>
              剪辑
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="vid-toolbar-btn" @click="onToolbarHd">
                  <n-icon :size="16"><DiamondOutline /></n-icon>
                </button>
              </template>
              HD 高清
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="vid-toolbar-btn" @click="onToolbarParse">
                  <n-icon :size="16"><GridOutline /></n-icon>
                </button>
              </template>
              解析
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="vid-toolbar-btn" @click="handleDownload">
                  <n-icon :size="16"><DownloadOutline /></n-icon>
                </button>
              </template>
              下载
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button type="button" class="vid-toolbar-btn" @click="handlePreview">
                  <n-icon :size="16"><ExpandOutline /></n-icon>
                </button>
              </template>
              全屏预览
            </n-tooltip>
          </div>
          <div class="aspect-video overflow-hidden">
            <video
              :src="displayVideoSrc"
              controls
              class="w-full h-full object-contain"
              @error="onVideoLoadError"
            />
          </div>
        </div>
      </div>
      <!-- Empty state | 空状态 -->
      <div 
        v-else
        class="aspect-video rounded-lg bg-[var(--bg-tertiary)] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-color)] relative"
      >
        <n-icon :size="32" class="text-[var(--text-secondary)]"><VideocamOutline /></n-icon>
        <span class="text-sm text-[var(--text-secondary)]">拖放视频或点击上传</span>
        <input 
          type="file" 
          accept="video/*" 
          class="absolute inset-0 opacity-0 cursor-pointer"
          @change="handleFileUpload"
        />
      </div>
      
      <!-- Duration info | 时长信息 -->
      <div v-if="data.duration" class="mt-2 text-xs text-[var(--text-secondary)]">
        时长: {{ formatDuration(data.duration) }}
      </div>

      <!-- 分镜视频：参考设计稿的完整编辑面板（文生/图生、首帧、规格、重新生成） -->
      <div
        v-if="showVideoPromptPanel"
        class="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3"
      >
        <div class="flex rounded-lg bg-[var(--bg-tertiary)] p-0.5 text-xs font-medium">
          <button
            type="button"
            class="flex-1 py-1.5 rounded-md transition-colors"
            :class="activeEditTab === 't2v'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'"
            @click="activeEditTab = 't2v'"
          >
            文生视频
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 rounded-md transition-colors"
            :class="activeEditTab === 'i2v'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'"
            :disabled="!hasFirstFrame"
            @click="hasFirstFrame && (activeEditTab = 'i2v')"
          >
            图生视频
          </button>
        </div>

        <div v-if="activeEditTab === 'i2v'" class="flex items-center gap-2">
          <n-tooltip trigger="hover">
            <template #trigger>
              <button type="button" class="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <n-icon :size="18"><LocationOutline /></n-icon>
              </button>
            </template>
            标记
          </n-tooltip>
          <n-tooltip trigger="hover">
            <template #trigger>
              <button type="button" class="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <n-icon :size="18"><CameraOutline /></n-icon>
              </button>
            </template>
            运镜
          </n-tooltip>
          <div class="relative shrink-0">
            <img
              v-if="firstFrameThumbUrl"
              :src="firstFrameThumbUrl"
              alt="首帧"
              class="w-14 h-14 rounded-md object-cover border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
              @error="onFirstFrameImgError"
            />
            <div
              v-else
              class="w-14 h-14 rounded-md border border-dashed border-[var(--border-color)] flex items-center justify-center text-[10px] text-[var(--text-tertiary)]"
            >
              无首帧
            </div>
            <span
              v-if="firstFrameThumbUrl"
              class="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-0.5 flex items-center justify-center rounded bg-[var(--accent-color)] text-[10px] text-white font-medium"
            >1</span>
          </div>
          <span class="text-[11px] text-[var(--text-tertiary)] leading-snug">首帧图用于图生视频；可在提示词中描述镜头与动态。</span>
        </div>

        <n-input
          v-model:value="currentPromptDraft"
          type="textarea"
          :placeholder="activeEditTab === 'i2v'
            ? '图生视频：镜头轨迹、主体动作、光影与氛围、对白等（可与脚本「视频运动提示词」一致）'
            : '文生视频：直接描述画面与动态，无需首帧图'"
          :autosize="{ minRows: 5, maxRows: 14 }"
          size="small"
          class="text-xs video-node-prompt-input"
          @blur="saveCurrentPromptDraft"
        />

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <n-dropdown :options="modelDropdownOptions" @select="onEditModelSelect">
            <button
              type="button"
              class="inline-flex items-center gap-1 max-w-[200px] px-2 py-1 rounded-md text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-[var(--border-color)]"
            >
              <span class="truncate">{{ displayEditModelLabel }}</span>
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>

          <n-dropdown :options="ratioDropdownOptions" @select="onEditRatioSelect">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
            >
              {{ editRatio }}
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
          <span class="text-[var(--text-tertiary)] text-xs">·</span>
          <n-dropdown :options="resolutionDropdownOptions" @select="onEditResolutionSelect">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
            >
              {{ String(editResolution || '').toUpperCase() }}
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
          <span class="text-[var(--text-tertiary)] text-xs">·</span>
          <n-dropdown :options="durationDropdownOptions" @select="onEditDurationSelect">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
            >
              {{ editDur }}s
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>

          <div class="flex items-center gap-1 ml-auto sm:ml-1">
            <n-tooltip trigger="hover">
              <template #trigger>
                <button
                  type="button"
                  class="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  @click="copyPromptToClipboard"
                >
                  <n-icon :size="18"><LanguageOutline /></n-icon>
                </button>
              </template>
              复制当前提示词
            </n-tooltip>
            <span class="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">1 个</span>
            <span class="text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">⚡ {{ editCreditCost }}</span>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button
                  type="button"
                  class="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-white shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!canSubmitRegenerate || isRegenerating"
                  @click="confirmRegenerateVideo"
                >
                  <n-spin v-if="isRegenerating" :size="16" class="text-white" />
                  <n-icon v-else :size="20"><ArrowUpOutline /></n-icon>
                </button>
              </template>
              {{ canSubmitRegenerate ? '重新生成' : (activeEditTab === 'i2v' && !hasFirstFrame ? '缺少首帧' : '请填写提示词') }}
            </n-tooltip>
          </div>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
          <span>配音</span>
          <n-switch :value="editAudio" size="small" @update:value="onEditAudioChange" />
        </div>
      </div>
    </div>

    <!-- Handles | 连接点 -->
    <NodeHandleMenu :nodeId="id" nodeType="video" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
    <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    </div>

    <!-- Right side - Action buttons | 右侧 - 操作按钮 -->
    <div 
      v-show="showActions && data.url"
      class="absolute right-10 top-20 -translate-y-1/2 translate-x-full flex flex-col gap-2 z-[1000]"
    >
      <!-- Preview button | 预览按钮 -->
      <button 
        @click="handlePreview"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max"
      >
        <n-icon :size="16" class="text-gray-600"><EyeOutline /></n-icon>
        <span class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">预览</span>
      </button>
      <!-- Download button | 下载按钮 -->
      <button 
        @click="handleDownload"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max"
      >
        <n-icon :size="16" class="text-gray-600"><DownloadOutline /></n-icon>
        <span class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">下载</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Video node component | 视频节点组件
 * Displays and manages video content
 */
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin, NInput, useDialog, NTooltip, NDropdown, NSwitch } from 'naive-ui'
import {
  TrashOutline,
  ExpandOutline,
  VideocamOutline,
  CopyOutline,
  CloseCircleOutline,
  DownloadOutline,
  EyeOutline,
  CutOutline,
  DiamondOutline,
  GridOutline,
  PlayCircleOutline,
  LocationOutline,
  CameraOutline,
  ChevronDownOutline,
  LanguageOutline,
  ArrowUpOutline
} from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes, currentProjectId } from '../../stores/canvas'
import { useVideoGeneration } from '../../hooks/useApi'
import { useModelStore } from '../../stores/pinia'
import {
  getModelRatioOptions,
  getModelDurationOptions,
  getModelResolutionOptions,
  getModelConfig
} from '../../stores/models'
import NodeHandleMenu from './NodeHandleMenu.vue'
import {
  cacheRemoteToServer,
  headLocalMedia,
  mediaFileUrlFromKey
} from '@/utils/localMediaServer'
import { patchVideoNodeFromRemoteUrl } from '@/utils/applyVideoNodeCache'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance
const { updateNodeInternals } = useVueFlow()

const dialog = useDialog()
const modelStore = useModelStore()

// Get pollVideoTask from useVideoGeneration | 从 useVideoGeneration 获取轮询函数
const { pollVideoTask, fetchVideoResultUrlOnce, createVideoTaskOnly } = useVideoGeneration()

const displayVideoSrc = computed(() => {
  const d = props.data || {}
  if (d.localVideoKey) return mediaFileUrlFromKey(d.localVideoKey)
  return d.url || ''
})

const mediaHydrateLock = ref(false)

// Hover state | 悬浮状态
const showActions = ref(false)
const showHandleMenu = ref(false)

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Video node menu operations | 视频节点菜单操作
const operations = [
  { type: 'videoConfig', label: '生视频', icon: VideocamOutline }
]

// Polling state | 轮询状态
const isPolling = ref(false)

// 分镜视频：完整编辑面板状态
const activeEditTab = ref('i2v')
const i2vPromptDraft = ref('')
const t2vPromptDraft = ref('')
const isRegenerating = ref(false)
const firstFrameImgBroken = ref(false)

const editModel = ref('')
const editRatio = ref('16:9')
const editDur = ref(5)
const editResolution = ref('720p')
const editAudio = ref(true)

watch(
  () => [props.id, props.data?.videoMotionPrompt],
  () => {
    i2vPromptDraft.value = props.data?.videoMotionPrompt ?? ''
  },
  { immediate: true }
)

watch(
  () => [props.id, props.data?.t2vPrompt],
  () => {
    t2vPromptDraft.value = props.data?.t2vPrompt ?? ''
  },
  { immediate: true }
)

watch(
  () => [props.id, props.data?.videoGenParams, props.data?.model],
  () => {
    const p = props.data?.videoGenParams
    editModel.value = p?.model || props.data?.model || editModel.value || ''
    if (p) {
      editRatio.value = p.ratio || '16:9'
      editDur.value = p.dur != null ? p.dur : 5
      editResolution.value = p.resolution || '720p'
      editAudio.value = p.generateAudio !== false
    }
  },
  { immediate: true, deep: true }
)

watch(
  () => props.data?.videoGenParams?.first_frame_image,
  () => {
    firstFrameImgBroken.value = false
  }
)

const showVideoPromptPanel = computed(() => {
  const d = props.data || {}
  if (!d.url || d.error || d.loading || d.taskId) return false
  return !!(d.videoGenParams || d.videoMotionPrompt !== undefined)
})

const hasFirstFrame = computed(() =>
  !!(props.data?.videoGenParams?.first_frame_image && !firstFrameImgBroken.value)
)

watch(
  () => [hasFirstFrame.value, showVideoPromptPanel.value],
  ([hasFf, show]) => {
    if (show && !hasFf && activeEditTab.value === 'i2v') activeEditTab.value = 't2v'
  }
)

const firstFrameThumbUrl = computed(() => {
  const u = props.data?.videoGenParams?.first_frame_image
  return u && !firstFrameImgBroken.value ? u : ''
})

const currentPromptDraft = computed({
  get () {
    return activeEditTab.value === 'i2v' ? i2vPromptDraft.value : t2vPromptDraft.value
  },
  set (v) {
    if (activeEditTab.value === 'i2v') i2vPromptDraft.value = v
    else t2vPromptDraft.value = v
  }
})

const modelDropdownOptions = computed(() => modelStore.allVideoModelOptions || [])

const displayEditModelLabel = computed(() => {
  const list = modelStore.allVideoModelOptions || []
  const m = list.find(x => x.key === editModel.value)
  return m?.label?.replace(/\(.*\)/, '').trim() || editModel.value || '选择模型'
})

const ratioDropdownOptions = computed(() =>
  getModelRatioOptions(editModel.value).map(o => ({ label: o.label, key: o.key }))
)

const durationDropdownOptions = computed(() =>
  getModelDurationOptions(editModel.value).map(o => ({ label: o.label, key: o.key }))
)

const resolutionDropdownOptions = computed(() =>
  getModelResolutionOptions(editModel.value).map(o => ({ label: o.label, key: o.key }))
)

const editCreditCost = computed(() => {
  let per = 55
  if (editDur.value >= 10) per *= 2
  if (editResolution.value === '1080p') per = Math.ceil(per * 1.5)
  else if (editResolution.value === '480p') per = Math.ceil(per * 0.7)
  if (editAudio.value) per = Math.ceil(per * 1.2)
  return per
})

const currentRegenPrompt = computed(() => {
  const t = activeEditTab.value === 'i2v' ? i2vPromptDraft.value : t2vPromptDraft.value
  return String(t || '').trim()
})

const canSubmitRegenerate = computed(() => {
  if (!currentRegenPrompt.value || isRegenerating.value) return false
  if (activeEditTab.value === 'i2v') return hasFirstFrame.value
  return true
})

function mergeVideoGenParams (patch) {
  const base = { ...(props.data?.videoGenParams || {}) }
  const next = { ...base, ...patch }
  updateNode(props.id, {
    videoGenParams: next,
    model: next.model ?? props.data?.model
  })
}

function onEditModelSelect (key) {
  editModel.value = key
  const config = getModelConfig(key)
  const updates = { model: key }
  if (config?.defaultParams?.ratio) {
    editRatio.value = config.defaultParams.ratio
    updates.ratio = config.defaultParams.ratio
  }
  if (config?.defaultParams?.duration != null) {
    editDur.value = config.defaultParams.duration
    updates.dur = config.defaultParams.duration
  }
  if (config?.defaultResolution) {
    editResolution.value = config.defaultResolution
    updates.resolution = config.defaultResolution
  }
  mergeVideoGenParams(updates)
}

function onEditRatioSelect (key) {
  editRatio.value = key
  mergeVideoGenParams({ ratio: key })
}

function onEditDurationSelect (key) {
  editDur.value = key
  mergeVideoGenParams({ dur: key })
}

function onEditResolutionSelect (key) {
  editResolution.value = key
  mergeVideoGenParams({ resolution: key })
}

function onEditAudioChange (v) {
  editAudio.value = v
  mergeVideoGenParams({ generateAudio: v })
}

function saveCurrentPromptDraft () {
  if (activeEditTab.value === 'i2v') {
    const next = String(i2vPromptDraft.value ?? '')
    if (next !== String(props.data?.videoMotionPrompt ?? '')) {
      updateNode(props.id, { videoMotionPrompt: next })
    }
  } else {
    const next = String(t2vPromptDraft.value ?? '')
    if (next !== String(props.data?.t2vPrompt ?? '')) {
      updateNode(props.id, { t2vPrompt: next })
    }
  }
}

function copyPromptToClipboard () {
  const text = currentRegenPrompt.value || currentPromptDraft.value
  if (!text) {
    window.$message?.warning('暂无提示词可复制')
    return
  }
  void navigator.clipboard?.writeText(text).then(() => {
    window.$message?.success('已复制提示词')
  }).catch(() => {
    window.$message?.error('复制失败')
  })
}

function onFirstFrameImgError () {
  firstFrameImgBroken.value = true
}

function onToolbarClip () {
  window.$message?.info('剪辑能力开发中，敬请期待')
}

function onToolbarHd () {
  window.$message?.info('高清增强开发中，敬请期待')
}

function onToolbarParse () {
  window.$message?.info('视频解析开发中，敬请期待')
}

const confirmRegenerateVideo = () => {
  if (!canSubmitRegenerate.value) return
  const isI2v = activeEditTab.value === 'i2v'
  dialog.warning({
    title: '重新生成视频',
    content: isI2v
      ? '将使用当前图生视频提示词、首帧/尾帧与下方规格发起新任务，生成完成后替换当前画面。'
      : '将使用当前文生视频提示词与下方规格发起新任务，生成完成后替换当前画面。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      void runRegenerateVideo()
      return true
    }
  })
}

async function runRegenerateVideo () {
  saveCurrentPromptDraft()
  const prompt = currentRegenPrompt.value
  if (!prompt) {
    window.$message?.warning('请填写提示词')
    return
  }
  const p = props.data?.videoGenParams || {}
  if (activeEditTab.value === 'i2v' && !p.first_frame_image) {
    window.$message?.warning('缺少首帧图，无法图生视频')
    return
  }

  mergeVideoGenParams({
    model: editModel.value,
    ratio: editRatio.value,
    dur: editDur.value,
    resolution: editResolution.value,
    generateAudio: editAudio.value
  })

  isRegenerating.value = true
  try {
    updateNode(props.id, {
      loading: true,
      error: null,
      url: '',
      taskId: null,
      localVideoKey: undefined,
      sourceVideoUrl: undefined,
      videoTaskId: undefined,
      progress: 0
    })
    const params = {
      model: editModel.value,
      ratio: editRatio.value,
      dur: editDur.value,
      resolution: editResolution.value,
      generateAudio: editAudio.value,
      prompt
    }
    if (activeEditTab.value === 'i2v') {
      params.first_frame_image = p.first_frame_image
      if (p.last_frame_image) params.last_frame_image = p.last_frame_image
    }
    const { taskId: newTaskId, url } = await createVideoTaskOnly(params)
    if (activeEditTab.value === 'i2v') {
      updateNode(props.id, { videoMotionPrompt: prompt })
    } else {
      updateNode(props.id, { t2vPrompt: prompt })
    }
    if (url) {
      const mediaPatch = await patchVideoNodeFromRemoteUrl(currentProjectId.value, url, null)
      updateNode(props.id, {
        ...mediaPatch,
        loading: false,
        taskId: null,
        progress: 100
      })
      window.$message?.success('视频重新生成成功')
    } else if (newTaskId) {
      updateNode(props.id, {
        taskId: newTaskId,
        loading: true
      })
    }
  } catch (err) {
    updateNode(props.id, {
      loading: false,
      error: err.message || '重新生成失败',
      taskId: null
    })
    window.$message?.error(err.message || '重新生成失败')
  } finally {
    isRegenerating.value = false
  }
}

// Watch for taskId changes and start polling | 监听 taskId 变化并开始轮询
watch(() => props.data?.taskId, (taskId) => {
  if (taskId && !props.data?.url && !isPolling.value) {
    startPolling(taskId)
  }
})

// 页面刷新后恢复轮询 | Resume polling after page refresh；已完成的节点尝试从本地/刷新恢复媒体
onMounted(() => {
  const { taskId, url } = props.data || {}
  if (taskId && !url && !isPolling.value) {
    startPolling(taskId)
  } else if (url || props.data?.localVideoKey) {
    hydrateVideoMedia('mount')
  }
})

// Start polling for video result | 开始轮询获取视频结果
const startPolling = async (taskId) => {
  if (isPolling.value) return

  isPolling.value = true

  try {
    const result = await pollVideoTask(taskId, (attempt, percentage) => {
      // 更新进度
      updateNode(props.id, {
        progress: percentage,
        attempt
      })
    })
    const patch = await patchVideoNodeFromRemoteUrl(currentProjectId.value, result.url, taskId)
    // 轮询成功：落盘本地并保留 videoTaskId 供后续刷新签名 URL
    updateNode(props.id, {
      ...patch,
      loading: false,
      progress: 100,
      label: props.data?.label || '视频生成',
      taskId: null
    })
    window.$message?.success('视频生成成功')
  } catch (err) {
    // 轮询失败
    updateNode(props.id, {
      loading: false,
      error: err.message || '生成失败',
      label: '生成失败',
      taskId: null  // 清除 taskId
    })
    window.$message?.error(err.message || '视频生成失败')
  } finally {
    isPolling.value = false
  }
}

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  const newId = addNode('videoConfig', { x: nodeX + 400, y: nodeY }, { label: '视频生成' })

  addEdge({
    source: props.id,
    target: newId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  setTimeout(() => {
    updateNodeInternals(newId)
  }, 50)
  window.$message?.success(`已创建视频生成节点`)
}

// Handle file upload | 处理文件上传
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const url = URL.createObjectURL(file)
    updateNode(props.id, { 
      url,
      updatedAt: Date.now()
    })
  }
}

// Format duration | 格式化时长
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || ''
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

// Finish editing label | 完成编辑 label
const finishEditLabel = () => {
  const newLabel = editingLabelValue.value.trim()
  if (newLabel && newLabel !== props.data?.label) {
    updateNode(props.id, { label: newLabel })
  }
  isEditingLabel.value = false
}

// Cancel editing label | 取消编辑 label
const cancelEditLabel = () => {
  isEditingLabel.value = false
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

/** 本地文件缺失或远程过期时：先再拉远程，失败则用 taskId 查新链再缓存 */
async function hydrateVideoMedia (reason = '') {
  if (mediaHydrateLock.value) return
  const pid = currentProjectId.value
  const d = props.data || {}
  if (!pid || (!d.url && !d.localVideoKey && !d.sourceVideoUrl)) return

  mediaHydrateLock.value = true
  try {
    if (d.localVideoKey && (await headLocalMedia(d.localVideoKey))) {
      const fixed = mediaFileUrlFromKey(d.localVideoKey)
      if (d.url !== fixed) updateNode(props.id, { url: fixed })
      return
    }

    const remoteTry = d.sourceVideoUrl || (String(d.url || '').startsWith('http') ? d.url : '')
    if (remoteTry) {
      const key = await cacheRemoteToServer(pid, remoteTry, 'video')
      if (key) {
        updateNode(props.id, {
          localVideoKey: key,
          sourceVideoUrl: remoteTry,
          url: mediaFileUrlFromKey(key),
          videoTaskId: d.videoTaskId,
          error: null
        })
        return
      }
    }

    if (d.videoTaskId && d.model) {
      const fresh = await fetchVideoResultUrlOnce(d.videoTaskId, d.model)
      if (fresh) {
        const key = await cacheRemoteToServer(pid, fresh, 'video')
        updateNode(props.id, {
          sourceVideoUrl: fresh,
          url: key ? mediaFileUrlFromKey(key) : fresh,
          localVideoKey: key || undefined,
          videoTaskId: d.videoTaskId,
          error: null
        })
        return
      }
    }

    if (reason === 'error') {
      updateNode(props.id, {
        error: d.error || '视频地址已失效且无法刷新，请重新生成'
      })
    }
  } finally {
    mediaHydrateLock.value = false
  }
}

const onVideoLoadError = () => {
  hydrateVideoMedia('error')
}

// Handle preview | 处理预览
const handlePreview = () => {
  const u = displayVideoSrc.value || props.data?.sourceVideoUrl || props.data?.url
  if (u) window.open(u, '_blank')
}

// Handle download | 处理下载
const handleDownload = () => {
  const u = displayVideoSrc.value || props.data?.url
  if (u) {
    const link = document.createElement('a')
    link.href = u
    link.download = props.data.fileName || `video_${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.$message?.success('视频下载中...')
  }
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) {
    // Clear selection and select the new node | 清除选中并选中新节点
    updateNode(props.id, { selected: false })
    updateNode(newId, { selected: true })
    window.$message?.success('节点已复制')
  }
}
</script>

<style scoped>
.video-node-wrapper {
  padding-right: 50px;
  padding-top: 20px;
}

.video-node {
  cursor: default;
}

.vid-toolbar-btn {
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  color: rgb(255 255 255 / 0.92);
  transition: background-color 0.15s ease;
}
.vid-toolbar-btn:hover {
  background-color: rgb(255 255 255 / 0.14);
}

.video-node-prompt-input :deep(textarea) {
  font-size: 12px;
  line-height: 1.45;
}
</style>
