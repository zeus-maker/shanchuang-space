<template>
  <!-- Script node wrapper | 脚本生成器节点 -->
  <div
    class="script-node-wrapper relative"
    @mouseenter="showHandleMenu = true"
    @mouseleave="showHandleMenu = false"
  >
    <!-- Main card -->
    <div
      class="script-node bg-[var(--bg-secondary)] rounded-xl border overflow-hidden transition-all duration-200"
      :class="data.selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-[var(--border-color)]'"
      :style="{ width: status === 'done' ? '960px' : '340px' }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-gradient-to-r from-amber-500/10 to-transparent shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <n-icon :size="16" class="text-amber-500 shrink-0"><DocumentTextOutline /></n-icon>
          <span
            v-if="!isEditingLabel"
            @dblclick="startEditLabel"
            class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded truncate"
            title="双击编辑名称"
          >{{ nodeLabel }}</span>
          <input
            v-else
            ref="labelInputRef"
            v-model="editingLabelValue"
            @blur="finishEditLabel"
            @keydown.enter="finishEditLabel"
            @keydown.escape="cancelEditLabel"
            class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-amber-500 min-w-0 flex-1"
          />
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <!-- View mode selector (done state) -->
          <n-dropdown v-if="status === 'done'" trigger="click" :options="viewModeOptions" @select="onViewModeSelect">
            <button class="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
              {{ viewModeLabel }}
              <n-icon :size="10"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
          <!-- Fullscreen toggle (done state) -->
          <button
            v-if="status === 'done'"
            @click="isFullscreen = true"
            class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
            title="全屏展开"
          >
            <n-icon :size="14"><ExpandOutline /></n-icon>
          </button>
          <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="复制节点">
            <n-icon :size="14"><CopyOutline /></n-icon>
          </button>
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="删除节点">
            <n-icon :size="14"><TrashOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Preview area: idle / loading / error -->
      <div v-if="status !== 'done'" class="p-3 flex justify-center">
        <div
          class="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 select-none transition-colors"
          :class="status === 'idle' ? 'border-[var(--border-color)] hover:border-amber-500/50 cursor-pointer' : 'border-[var(--border-color)]/50'"
          style="width: 286px; height: 286px;"
          @click.stop="handlePreviewClick"
        >
          <!-- idle -->
          <template v-if="status === 'idle'">
            <n-icon :size="44" class="text-[var(--text-tertiary)]"><ListOutline /></n-icon>
            <p class="text-xs text-[var(--text-tertiary)] text-center px-6 leading-relaxed">
              点击连接示例剧本<br/>或直接输入提示词生成分镜
            </p>
          </template>
          <!-- loading -->
          <template v-else-if="status === 'loading'">
            <n-spin :size="36" />
            <p class="text-xs text-[var(--text-secondary)]">AI 正在生成分镜脚本...</p>
            <div class="w-48">
              <n-progress
                type="line"
                :percentage="genProgress"
                :show-indicator="false"
                color="#f59e0b"
                rail-color="rgba(245,158,11,0.15)"
              />
            </div>
            <p class="text-[10px] text-[var(--text-tertiary)]">已生成 {{ genCharsCount }} 字</p>
          </template>
          <!-- error -->
          <template v-else-if="status === 'error'">
            <n-icon :size="36" class="text-red-400"><AlertCircleOutline /></n-icon>
            <p class="text-xs text-red-400">生成失败，请重试</p>
            <n-button size="small" type="error" ghost @click.stop="handleGenerate">重试</n-button>
          </template>
        </div>
      </div>

      <!-- Done: toolbar + table / card -->
      <template v-else>
        <!-- Toolbar -->
        <div class="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/20">
          <n-button size="small" secondary @click="handleRegenerate">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            重新生成
          </n-button>
          <n-button size="small" type="warning" ghost @click="handleGenerateStoryboard" :loading="isGeneratingBoard">
            <template #icon><n-icon><GridOutline /></n-icon></template>
            生成分镜
          </n-button>
          <span class="ml-auto text-[11px] text-[var(--text-tertiary)]">共 {{ localScenes.length }} 个分镜</span>
        </div>

        <!-- Table view -->
        <div v-if="localViewMode === 'table'" class="overflow-x-auto" style="max-height: 460px; overflow-y: auto;" @wheel.stop>
          <table class="text-[11px] text-[var(--text-primary)]" style="min-width: 1320px; border-collapse: collapse; width: 100%;">
            <colgroup>
              <col v-for="col in TABLE_COLS" :key="col.key" :style="{ width: col.width }" />
            </colgroup>
            <thead class="sticky top-0 bg-[var(--bg-secondary)] z-10">
              <tr class="border-b border-[var(--border-color)]">
                <th v-for="col in TABLE_COLS" :key="col.key" class="px-2 py-2 text-left font-medium text-[var(--text-tertiary)] whitespace-nowrap">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(scene, i) in localScenes"
                :key="scene.sceneNo"
                draggable="true"
                class="border-b border-[var(--border-color)]/50 hover:bg-amber-500/5 transition-colors"
                :class="{ 'bg-amber-500/10 border-amber-500/30': dragOverIdx === i }"
                @dragstart="dragFromIdx = i"
                @dragover.prevent="dragOverIdx = i"
                @dragleave="dragOverIdx = -1"
                @drop.prevent="onRowDrop(i)"
                @dragend="dragFromIdx = -1; dragOverIdx = -1"
                @mousedown.stop
              >
                <td class="px-2 py-2 text-center font-bold text-amber-500 cursor-grab select-none" title="拖拽排序">{{ scene.sceneNo }}</td>
                <td class="px-2 py-2 text-center text-[var(--text-tertiary)] whitespace-nowrap">{{ scene.duration }}s</td>
                <td class="px-2 py-2"><div class="line-clamp-3">{{ scene.description }}</div></td>
                <td class="px-2 py-2 whitespace-nowrap">{{ scene.character1 }}</td>
                <td class="px-2 py-2"><div class="line-clamp-3 text-[var(--text-secondary)]">{{ scene.characterDesc1 }}</div></td>
                <td class="px-2 py-2">
                  <div class="w-8 h-8 bg-[var(--bg-tertiary)] rounded flex items-center justify-center">
                    <n-icon :size="14" class="text-[var(--text-tertiary)]"><ImageOutline /></n-icon>
                  </div>
                </td>
                <td class="px-2 py-2"><div class="line-clamp-2 text-[var(--text-secondary)]">{{ scene.action }}</div></td>
                <td class="px-2 py-2"><span class="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] whitespace-nowrap">{{ scene.sceneTag }}</span></td>
                <td class="px-2 py-2 text-[var(--text-secondary)]"><div class="line-clamp-2">{{ scene.lighting }}</div></td>
                <td class="px-2 py-2"><div class="line-clamp-3 text-[var(--text-secondary)]">{{ scene.dialogue || '—' }}</div></td>
                <td class="px-2 py-2"><div class="line-clamp-3 text-[10px] text-[var(--text-tertiary)]">{{ scene.storyboardPrompt }}</div></td>
                <td class="px-2 py-2"><div class="line-clamp-3 text-[10px] text-[var(--text-tertiary)]">{{ scene.videoMotionPrompt }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Card view (创意视图) -->
        <div v-else class="p-3 overflow-y-auto" style="max-height: 460px;" @wheel.stop>
          <div class="grid grid-cols-4 gap-3">
            <div
              v-for="scene in localScenes"
              :key="scene.sceneNo"
              class="border border-[var(--border-color)] rounded-lg p-2.5 bg-[var(--bg-primary)] space-y-2 hover:border-amber-500/50 transition-colors"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-500">镜 {{ scene.sceneNo }}</span>
                <span class="text-[10px] text-[var(--text-tertiary)]">{{ scene.duration }}s</span>
              </div>
              <div class="w-full rounded bg-[var(--bg-tertiary)] flex items-center justify-center" style="height: 60px;">
                <n-icon :size="18" class="text-[var(--text-tertiary)]"><ImageOutline /></n-icon>
              </div>
              <p class="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-snug">{{ scene.description }}</p>
              <p class="text-[10px] text-[var(--text-tertiary)] line-clamp-2 leading-snug">{{ scene.storyboardPrompt }}</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Input area: visible when not done -->
      <div v-if="status !== 'done'" class="border-t border-[var(--border-color)]">
        <textarea
          v-model="localPrompt"
          :placeholder="PROMPT_PLACEHOLDER"
          rows="3"
          class="w-full bg-transparent text-sm text-[var(--text-primary)] resize-none outline-none px-3 pt-3 pb-1 placeholder-[var(--text-tertiary)] leading-relaxed"
          @wheel.stop
          @mousedown.stop
          @keydown.stop
        />
        <div class="flex items-center justify-between px-3 py-2">
          <n-dropdown :options="modelOptions" @select="onModelSelect">
            <button class="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors max-w-[160px]">
              <n-icon :size="13" class="text-amber-500 shrink-0"><SparklesOutline /></n-icon>
              <span class="truncate">{{ displayModelName }}</span>
              <n-icon :size="10" class="shrink-0"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
          <button
            @click.stop="handleGenerate"
            :disabled="!canExecute"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-600 active:scale-95 transition-all"
            title="生成分镜脚本"
          >
            <n-icon :size="15"><SendOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Vue Flow handles -->
      <Handle type="target" :position="Position.Left" id="script-input" class="!bg-amber-500" />
      <NodeHandleMenu :nodeId="id" nodeType="script" :visible="showHandleMenu" :operations="[]" />
    </div>
  </div>

  <!-- Fullscreen overlay -->
  <Teleport to="body">
    <div
      v-if="isFullscreen && status === 'done'"
      class="fixed inset-0 z-[9999] bg-[var(--bg-primary)] flex flex-col"
    >
      <!-- Fullscreen header -->
      <div class="flex items-center justify-between px-6 py-3 border-b border-[var(--border-color)] shrink-0 bg-[var(--bg-secondary)]">
        <div class="flex items-center gap-2">
          <n-icon :size="18" class="text-amber-500"><DocumentTextOutline /></n-icon>
          <h2 class="text-base font-semibold text-[var(--text-primary)]">{{ nodeLabel }}</h2>
          <span class="text-xs text-[var(--text-tertiary)]">· {{ localScenes.length }} 个分镜</span>
        </div>
        <div class="flex items-center gap-3">
          <n-dropdown trigger="click" :options="viewModeOptions" @select="onViewModeSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:border-amber-500/50 transition-colors">
              {{ viewModeLabel }}
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
          <button @click="isFullscreen = false" class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors" title="退出全屏">
            <n-icon :size="18"><CloseOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Fullscreen toolbar -->
      <div class="flex items-center gap-2 px-6 py-2.5 border-b border-[var(--border-color)] shrink-0">
        <n-button secondary @click="handleRegenerate">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          重新生成
        </n-button>
        <n-button type="warning" ghost @click="handleGenerateStoryboard" :loading="isGeneratingBoard">
          <template #icon><n-icon><GridOutline /></n-icon></template>
          生成分镜
        </n-button>
      </div>

      <!-- Fullscreen content -->
      <div class="flex-1 overflow-auto p-6">
        <!-- Fullscreen table view -->
        <div v-if="localViewMode === 'table'" class="overflow-x-auto rounded-xl border border-[var(--border-color)]">
          <table class="text-xs text-[var(--text-primary)]" style="min-width: 1320px; border-collapse: collapse; width: 100%;">
            <colgroup>
              <col v-for="col in TABLE_COLS" :key="col.key" :style="{ width: col.width }" />
            </colgroup>
            <thead class="bg-[var(--bg-secondary)] sticky top-0">
              <tr class="border-b border-[var(--border-color)]">
                <th v-for="col in TABLE_COLS" :key="col.key" class="px-3 py-3 text-left font-medium text-[var(--text-tertiary)] whitespace-nowrap">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(scene, i) in localScenes"
                :key="scene.sceneNo"
                draggable="true"
                class="border-b border-[var(--border-color)]/50 hover:bg-amber-500/5 transition-colors"
                :class="{ 'bg-amber-500/10': dragOverIdx === i }"
                @dragstart="dragFromIdx = i"
                @dragover.prevent="dragOverIdx = i"
                @dragleave="dragOverIdx = -1"
                @drop.prevent="onRowDrop(i)"
                @dragend="dragFromIdx = -1; dragOverIdx = -1"
              >
                <td class="px-3 py-3 text-center font-bold text-amber-500 cursor-grab">{{ scene.sceneNo }}</td>
                <td class="px-3 py-3 text-center text-[var(--text-tertiary)]">{{ scene.duration }}s</td>
                <td class="px-3 py-3"><div class="line-clamp-3">{{ scene.description }}</div></td>
                <td class="px-3 py-3 whitespace-nowrap">{{ scene.character1 }}</td>
                <td class="px-3 py-3"><div class="line-clamp-3 text-[var(--text-secondary)]">{{ scene.characterDesc1 }}</div></td>
                <td class="px-3 py-3">
                  <div class="w-10 h-10 bg-[var(--bg-tertiary)] rounded flex items-center justify-center">
                    <n-icon :size="16" class="text-[var(--text-tertiary)]"><ImageOutline /></n-icon>
                  </div>
                </td>
                <td class="px-3 py-3"><div class="line-clamp-2 text-[var(--text-secondary)]">{{ scene.action }}</div></td>
                <td class="px-3 py-3"><span class="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] whitespace-nowrap">{{ scene.sceneTag }}</span></td>
                <td class="px-3 py-3 text-[var(--text-secondary)]"><div class="line-clamp-2">{{ scene.lighting }}</div></td>
                <td class="px-3 py-3"><div class="line-clamp-3 text-[var(--text-secondary)]">{{ scene.dialogue || '—' }}</div></td>
                <td class="px-3 py-3"><div class="line-clamp-3 text-[var(--text-secondary)] text-xs">{{ scene.storyboardPrompt }}</div></td>
                <td class="px-3 py-3"><div class="line-clamp-3 text-[var(--text-secondary)] text-xs">{{ scene.videoMotionPrompt }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Fullscreen card view -->
        <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))">
          <div
            v-for="scene in localScenes"
            :key="scene.sceneNo"
            class="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-secondary)] space-y-3 hover:border-amber-500/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-amber-500">镜 {{ scene.sceneNo }}</span>
              <span class="text-xs text-[var(--text-tertiary)]">{{ scene.duration }}s</span>
            </div>
            <div class="w-full rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center" style="height: 120px;">
              <n-icon :size="28" class="text-[var(--text-tertiary)]"><ImageOutline /></n-icon>
            </div>
            <p class="text-sm text-[var(--text-secondary)] line-clamp-3">{{ scene.description }}</p>
            <p class="text-xs text-[var(--text-tertiary)] line-clamp-3">{{ scene.storyboardPrompt }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Script node component | 脚本生成器节点
 * LLM 流式生成分镜脚本；结果以表格/卡片展示；可一键生成分镜打组
 */
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import {
  NIcon, NButton, NDropdown, NProgress, NSpin
} from 'naive-ui'
import {
  DocumentTextOutline, ListOutline, AlertCircleOutline,
  RefreshOutline, GridOutline, ImageOutline,
  SparklesOutline, SendOutline, ChevronDownOutline,
  ExpandOutline, CloseOutline, CopyOutline, TrashOutline
} from '@vicons/ionicons5'
import {
  updateNode, removeNode, duplicateNode, addNode, addEdge, addNodes,
  nodes, edges, canvasGroups, addCanvasGroup, updateCanvasGroup,
  startBatchOperation, endBatchOperation
} from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import { useModelStore } from '../../stores/pinia'
import { streamChatCompletions } from '../../api/chat'
import { DEFAULT_CHAT_MODEL } from '../../config/models'

// ── 常量 ──────────────────────────────────────────────────────────────
const PROMPT_PLACEHOLDER = '描述剧情或添加角色参考、视频参考等，为你生成分镜脚本'

const SAMPLE_SCRIPT = `《我在盛唐写天下》
**类型**：古风 / 穿越 / 爽文漫剧
**时长建议**：60–90秒
**基调**：热血 × 盛唐史诗感 × 爽点节奏

【序幕】【现代 · 深夜办公室】
键盘声急促。电脑屏幕蓝光刺眼。沈昭昭（女，28岁），面色苍白，伏案加班。手机提示音不断。她抬头，视线模糊——黑屏。

【第一幕】【盛唐 · 金銮殿 · 日】
鼓声震天。沈昭昭猛然睁眼，已跪在大殿中央，身着男装官服，双手被押。百官列立，殿宇巍峨。大臣厉声："大逆不道！假称诗才惊世，欺君罔上，当斩！"沈昭昭震惊低语："这是……唐朝？"龙椅之上，皇帝目光沉沉。皇帝："既言才华盖世，当殿作诗。若不能——斩。"刀光映入她瞳孔。大殿死寂。

【第二幕】
沈昭昭缓缓起身。呼吸渐稳。她望向殿外——长安城阳光万里。她低声："既来盛唐……便与盛唐争一争。"抬头，高声吟诵："君不见黄河之水天上来——"声音回荡大殿。群臣震动。皇帝缓缓站起。诗声激昂，如惊雷落殿。

【第三幕】
殿外风起。长安街市灯火连绵。皇帝低声："此诗，当传万世。"沈昭昭目光坚定。她轻声自语："既然来了……那便写尽三万里长安。"镜头推远。盛唐山河展开。`

const SYSTEM_PROMPT = `你是专业的分镜脚本编剧。根据用户提供的剧本内容，生成详细的分镜脚本。
输出规则：
1. 直接输出 JSON 数组，不要任何前置说明、代码块标记或其他内容
2. 每个分镜对象包含以下字段（字段名使用驼峰命名）：
   - sceneNo: 镜号（从1开始的整数）
   - duration: 预计时长（秒，2-6的整数）
   - description: 画面描述（中文，15-30字）
   - character1: 主要角色名（中文）
   - characterDesc1: 角色外貌详细描述（中文）
   - characterImg1: 角色图片生成提示词（英文，用于 AI 作图）
   - action: 角色动作（中文，10-20字）
   - sceneTag: 场景标签（中文，如：室内/室外/城市/自然/大殿）
   - lighting: 光影氛围（中文，如：日光直射/逆光/霓虹灯/烛光）
   - dialogue: 对白（中文，无对白则为空字符串）
   - storyboardPrompt: 分镜提示词（英文，详细的图片生成 prompt，包含构图、风格、光影、细节）
   - videoMotionPrompt: 视频运动提示词（英文，如：slow zoom in, pan left to right）
3. 根据剧本内容生成 12-20 个分镜，确保画面节奏紧凑`

const TABLE_COLS = [
  { key: 'sceneNo',           label: '镜号',       width: '44px'  },
  { key: 'duration',          label: '时长',       width: '48px'  },
  { key: 'description',       label: '画面描述',   width: '160px' },
  { key: 'character1',        label: '角色1',      width: '80px'  },
  { key: 'characterDesc1',    label: '角色描述1',  width: '180px' },
  { key: 'characterImg1',     label: '角色图1',    width: '60px'  },
  { key: 'action',            label: '角色动作',   width: '100px' },
  { key: 'sceneTag',          label: '场景标签',   width: '80px'  },
  { key: 'lighting',          label: '光影氛围',   width: '80px'  },
  { key: 'dialogue',          label: '对白',       width: '120px' },
  { key: 'storyboardPrompt',  label: '分镜提示词', width: '200px' },
  { key: 'videoMotionPrompt', label: '视频运动提示词', width: '160px' }
]

// ── Props ──────────────────────────────────────────────────────────────
const props = defineProps({ id: String, data: Object, position: Object })

// ── Vue Flow ───────────────────────────────────────────────────────────
const { updateNodeInternals } = useVueFlow()

// ── Store ──────────────────────────────────────────────────────────────
const modelStore = useModelStore()

// ── UI state ───────────────────────────────────────────────────────────
const showHandleMenu = ref(false)
const isFullscreen    = ref(false)
const isGeneratingBoard = ref(false)
const genProgress     = ref(0)
const genCharsCount   = ref(0)
const dragFromIdx     = ref(-1)
const dragOverIdx     = ref(-1)

// Label editing
const isEditingLabel    = ref(false)
const editingLabelValue = ref('')
const labelInputRef     = ref(null)

// Abort controller for streaming
let abortCtrl = null

// ── Computed from props.data ───────────────────────────────────────────
const status        = computed(() => props.data?.status    || 'idle')
const localScenes   = computed(() => props.data?.scenes    || [])
const nodeLabel     = computed(() => props.data?.label     || '脚本生成器')

// ── Local mutable state (synced to props) ──────────────────────────────
const localPrompt   = ref(props.data?.prompt    || '')
const localModel    = ref(props.data?.model     || DEFAULT_CHAT_MODEL)
const localViewMode = ref(props.data?.viewMode  || 'table')

// ── Model selector ─────────────────────────────────────────────────────
const modelOptions = computed(() =>
  modelStore.availableChatModels.map(m => ({ label: m.name || m.key, key: m.key }))
)
const displayModelName = computed(() => {
  const m = modelStore.availableChatModels.find(x => x.key === localModel.value)
  return m?.name || localModel.value || '选择模型'
})
const onModelSelect = (key) => {
  localModel.value = key
  updateNode(props.id, { model: key })
}

// ── View mode ──────────────────────────────────────────────────────────
const viewModeOptions = [
  { label: '脚本视图', key: 'table' },
  { label: '创意视图', key: 'card' }
]
const viewModeLabel = computed(() =>
  viewModeOptions.find(o => o.key === localViewMode.value)?.label || '脚本视图'
)
const onViewModeSelect = (key) => {
  localViewMode.value = key
  updateNode(props.id, { viewMode: key })
}

// ── Execute button enabled state ───────────────────────────────────────
const canExecute = computed(() => {
  if (status.value === 'loading') return false
  const hasConnectedText = edges.value
    .filter(e => e.target === props.id)
    .some(e => {
      const n = nodes.value.find(x => x.id === e.source)
      return n?.type === 'text' && n.data?.content?.trim()
    })
  return hasConnectedText || !!localPrompt.value.trim()
})

// ── Label editing ──────────────────────────────────────────────────────
const startEditLabel = () => {
  editingLabelValue.value = nodeLabel.value
  isEditingLabel.value = true
  nextTick(() => { labelInputRef.value?.focus(); labelInputRef.value?.select() })
}
const finishEditLabel = () => {
  const v = editingLabelValue.value.trim()
  if (v) updateNode(props.id, { label: v })
  isEditingLabel.value = false
}
const cancelEditLabel = () => { isEditingLabel.value = false }

// ── Node actions ───────────────────────────────────────────────────────
const handleDuplicate = () => duplicateNode(props.id)
const handleDelete    = () => removeNode(props.id)

// ── Preview area click: auto-create text node with sample script ───────
const handlePreviewClick = () => {
  if (status.value !== 'idle') return
  const hasInput = edges.value.some(e => e.target === props.id)
  if (hasInput) {
    window.$message?.info('已有输入连接，直接在下方输入提示词后执行')
    return
  }
  const textId = addNode('text',
    { x: (props.position?.x || 300) - 420, y: (props.position?.y || 100) },
    { content: SAMPLE_SCRIPT, label: '剧本' }
  )
  addEdge({ source: textId, target: props.id, sourceHandle: 'right', targetHandle: 'script-input', type: 'default' })
  window.$message?.success('已连接示例剧本，可修改后点击执行')
}

// ── JSON parser: handles raw array / wrapped object / code fence / DeepSeek <think> ───
const parseScriptJSON = (text) => {
  /** 尝试 JSON.parse，兼容裸数组和 {scenes:[...]} 包装对象 */
  const tryParse = (s) => {
    const extract = (r) => {
      if (Array.isArray(r) && r.length) return r
      if (r?.scenes && Array.isArray(r.scenes) && r.scenes.length) return r.scenes
      return null
    }
    const raw = s.trim()
    // 第一次：直接解析
    try { const r = JSON.parse(raw); const res = extract(r); if (res) return res } catch {}
    // 第二次：修复 LLM 常见问题再解析
    // - 去掉数组/对象末尾多余逗号
    // - 把字符串值内的裸换行/回车/制表符转义（LLM 最常见的 JSON 输出问题）
    try {
      const repaired = raw
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/"((?:[^"\\]|\\.)*)"/gs, (_, inner) =>
          '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'
        )
      const r = JSON.parse(repaired); const res = extract(r); if (res) return res
    } catch {}
    return null
  }

  /** 用括号深度计数提取第一个完整 JSON 块（[ 或 {） */
  const extractByBracket = (s, openCh, closeCh) => {
    const start = s.indexOf(openCh)
    if (start === -1) return null
    let depth = 0
    for (let i = start; i < s.length; i++) {
      if (s[i] === openCh) depth++
      else if (s[i] === closeCh) { depth--; if (depth === 0) return s.slice(start, i + 1) }
    }
    return null
  }

  // 1. 剥离 DeepSeek <think>...</think> 推理块（内含大量 [ ] 会干扰正则）
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 2. 直接以 [ 或 { 开头
  if (t.startsWith('[') || t.startsWith('{')) {
    const r = tryParse(t); if (r) return r
  }

  // 3. 代码块 ```json ... ``` 或 ``` ... ```
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { const r = tryParse(fence[1]); if (r) return r }

  // 4. 括号计数提取 JSON 数组
  const arr = extractByBracket(t, '[', ']')
  if (arr) { const r = tryParse(arr); if (r) return r }

  // 5. 括号计数提取 JSON 对象（兼容 {"scenes":[...]} 格式）
  const obj = extractByBracket(t, '{', '}')
  if (obj) { const r = tryParse(obj); if (r) return r }

  return null
}

// ── Build user message (connected text + prompt) ───────────────────────
const buildUserMessage = () => {
  const texts = edges.value
    .filter(e => e.target === props.id)
    .map(e => nodes.value.find(n => n.id === e.source))
    .filter(n => n?.type === 'text' && n.data?.content?.trim())
    .map(n => n.data.content)
  const parts = []
  if (texts.length) parts.push(`剧本内容：\n${texts.join('\n\n')}`)
  if (localPrompt.value.trim()) parts.push(`生成要求：\n${localPrompt.value.trim()}`)
  return parts.join('\n\n')
}

// ── Generate storyboard script via streaming LLM ───────────────────────
const handleGenerate = async () => {
  const msg = buildUserMessage()
  if (!msg) {
    window.$message?.warning('请输入提示词或连接剧本文本节点')
    return
  }
  if (!modelStore.currentApiKey) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  // 先中止上一次未完成的生成（防止并发）
  abortCtrl?.abort()
  // 完整重置节点数据，避免旧字段残留干扰下次解析
  updateNode(props.id, {
    status: 'loading',
    scenes: [],
    prompt: localPrompt.value,
    taskId: null,
    errorMsg: null
  })
  genProgress.value   = 0
  genCharsCount.value = 0
  abortCtrl = new AbortController()
  let fullText = ''

  try {
    // 从 modelStore 获取正确的 chat API 地址（含 origin + endpoint）
    const chatUrl = modelStore.getChatEndpoint()
    const parsedUrl = new URL(chatUrl)

    for await (const chunk of streamChatCompletions(
      { model: localModel.value, messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: msg }
        ] },
      abortCtrl.signal,
      { baseUrl: parsedUrl.origin, endpoint: parsedUrl.pathname }
    )) {
      fullText += chunk
      genCharsCount.value = fullText.length
      genProgress.value   = Math.min(90, Math.floor(fullText.length / 30))
    }
    genProgress.value = 100

    const scenes = parseScriptJSON(fullText)
    if (!scenes?.length) throw new Error('解析分镜数据失败，请重试')

    updateNode(props.id, { status: 'done', scenes })
    window.$message?.success(`分镜脚本生成完成，共 ${scenes.length} 个分镜`)
  } catch (err) {
    if (err.name === 'AbortError') {
      updateNode(props.id, { status: 'idle' })
    } else {
      console.info('[ScriptNode] 生成失败:', err.name, err.message, '\nfullText前200字符:', fullText?.slice(0, 200))
      updateNode(props.id, { status: 'error', scenes: [] })
      window.$message?.error(err.message || '生成失败')
    }
  } finally {
    genProgress.value = 0
    abortCtrl = null
  }
}

// ── Reset and regenerate ───────────────────────────────────────────────
const handleRegenerate = () => {
  isFullscreen.value = false
  updateNode(props.id, { status: 'idle', scenes: [] })
}

// ── Create imageConfig nodes and group them ────────────────────────────
const handleGenerateStoryboard = async () => {
  if (!localScenes.value.length || isGeneratingBoard.value) return
  isGeneratingBoard.value = true

  try {
    // NODE_W/NODE_H reflect actual rendered imageConfig dimensions (config-only, no image preview)
    const COLS = 5, NODE_W = 340, NODE_H = 280, GAP_X = 12, GAP_Y = 12
    const baseX = (props.position?.x || 0) + 1080
    const baseY = (props.position?.y || 0)

    const nodeSpecs = localScenes.value.map((scene, i) => ({
      type: 'imageConfig',
      position: {
        x: baseX + (i % COLS) * (NODE_W + GAP_X),
        y: baseY + Math.floor(i / COLS) * (NODE_H + GAP_Y)
      },
      data: {
        prompt: scene.storyboardPrompt || scene.description,
        label: `分镜 #${scene.sceneNo}`
      }
    }))

    startBatchOperation()
    const newIds = addNodes(nodeSpecs, false)
    endBatchOperation()

    // 等待 Vue Flow 完成节点尺寸测量后再计算打组边界
    await new Promise(r => setTimeout(r, 150))

    let groupId = null
    if (newIds.length >= 2) {
      groupId = addCanvasGroup(newIds)
      if (groupId) updateCanvasGroup(groupId, { label: '分镜图 · 脚本生成器' })
    }

    // 创建虚拟代理节点作为打组框的连接入口，并连接脚本节点
    if (groupId) {
      const g = canvasGroups.value.find(x => x.id === groupId)
      if (g?.frame) {
        // 代理节点定位在打组框左边缘垂直居中
        const proxyId = addNode('groupProxy', {
          x: g.frame.x,
          y: g.frame.y + g.frame.height / 2 - 6
        }, {})
        // 将代理节点加入组，使其随打组框一起移动
        updateCanvasGroup(groupId, { memberIds: [...(g.memberIds || []), proxyId] })
        // 从脚本节点右侧连线到代理节点（代表整个打组框）
        addEdge({
          source: props.id,
          target: proxyId,
          sourceHandle: 'script-output',
          targetHandle: 'left',
          type: 'default'
        })
      }
    }

    window.$message?.success(`已创建 ${newIds.length} 个分镜节点` + (newIds.length >= 2 ? '并打组' : ''))
  } catch (err) {
    window.$message?.error('生成分镜失败：' + err.message)
  } finally {
    isGeneratingBoard.value = false
  }
}

// ── Table row drag-to-sort ─────────────────────────────────────────────
const onRowDrop = (toIdx) => {
  const from = dragFromIdx.value
  if (from < 0 || from === toIdx) return
  const arr = localScenes.value.map(s => ({ ...s }))
  const [item] = arr.splice(from, 1)
  arr.splice(toIdx, 0, item)
  arr.forEach((s, i) => { s.sceneNo = i + 1 })
  updateNode(props.id, { scenes: arr })
}

// ── Watchers ───────────────────────────────────────────────────────────
watch(status, () => nextTick(() => updateNodeInternals(props.id)))
watch(() => localScenes.value.length, () => nextTick(() => updateNodeInternals(props.id)))

watch(() => props.data?.model,    (v) => { if (v && v !== localModel.value)    localModel.value    = v })
watch(() => props.data?.prompt,   (v) => { if (v !== undefined && v !== localPrompt.value)  localPrompt.value   = v })
watch(() => props.data?.viewMode, (v) => { if (v)                               localViewMode.value = v })

// ── Cleanup ────────────────────────────────────────────────────────────
onUnmounted(() => { abortCtrl?.abort() })
</script>

<style scoped>
.script-node-wrapper {
  position: relative;
}
</style>
