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
          <n-button size="small" type="info" ghost @click="handleOpenBatchVideo" :disabled="!localScenes.length">
            <template #icon><n-icon><VideocamOutline /></n-icon></template>
            批量生成视频
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
        <n-button type="info" ghost @click="handleOpenBatchVideo" :disabled="!localScenes.length">
          <template #icon><n-icon><VideocamOutline /></n-icon></template>
          批量生成视频
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

  <!-- Batch video generation panel -->
  <Teleport to="body">
    <Transition name="bv-panel">
      <div v-if="showBatchVideoPanel" class="bv-overlay" @click.self="handleCloseBatchVideo">
        <div class="bv-panel" @click.stop>
          <!-- Settings area -->
          <div class="bv-settings">
            <!-- Ratio -->
            <div class="bv-section">
              <span class="bv-section-title">比例</span>
              <div class="bv-option-row">
                <button
                  v-for="r in bvRatioList"
                  :key="r"
                  class="bv-option-btn"
                  :class="{ active: bvRatio === r }"
                  @click="bvRatio = r"
                >
                  <span class="bv-ratio-icon" :class="`ratio-${r.replace(':', 'x')}`"></span>
                  {{ r }}
                </button>
              </div>
            </div>

            <!-- Audio -->
            <div class="bv-section">
              <span class="bv-section-title">生成音频 <span class="bv-hint">ⓘ</span></span>
              <div class="bv-option-row">
                <button class="bv-option-btn" :class="{ active: bvAudio }" @click="bvAudio = true">开启</button>
                <button class="bv-option-btn" :class="{ active: !bvAudio }" @click="bvAudio = false">关闭</button>
              </div>
            </div>

            <!-- Duration -->
            <div class="bv-section">
              <span class="bv-section-title">时长</span>
              <div class="bv-option-row">
                <button
                  v-for="d in bvDurList"
                  :key="d.key"
                  class="bv-option-btn"
                  :class="{ active: bvDuration === d.key }"
                  @click="bvDuration = d.key"
                >{{ d.label }}</button>
              </div>
            </div>

            <!-- Resolution -->
            <div class="bv-section">
              <span class="bv-section-title">生成品质</span>
              <div class="bv-option-row">
                <button
                  v-for="res in bvResolutionList"
                  :key="res"
                  class="bv-option-btn"
                  :class="{ active: bvResolution === res }"
                  @click="bvResolution = res"
                >{{ res === '480p' ? '标准' : res === '720p' ? '高清' : '超清' }}</button>
              </div>
            </div>
          </div>

          <!-- Bottom bar -->
          <div class="bv-bottom-bar">
            <button class="bv-close-btn" @click="handleCloseBatchVideo" title="关闭">✕</button>

            <n-dropdown :options="bvModelOptions" @select="onBvModelSelect" trigger="click">
              <button class="bv-model-btn">
                <n-icon :size="12"><VideocamOutline /></n-icon>
                {{ bvDisplayModel }}
                <n-icon :size="10"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>

            <span class="bv-summary">
              {{ bvRatio }} · {{ bvResolution === '480p' ? '标准' : bvResolution === '720p' ? '高清' : '超清' }} · {{ bvDuration }}s ·
              <n-icon :size="11"><component :is="bvAudio ? VolumeHighOutline : VolumeMuteOutline" /></n-icon>
            </span>

            <span class="bv-scene-count">全部 {{ localScenes.length }} 个分镜</span>

            <button
              class="bv-generate-btn"
              :disabled="isGeneratingVideos || !localScenes.length"
              @click="handleBatchGenerateVideos"
            >
              <n-spin v-if="isGeneratingVideos" :size="14" />
              <template v-else>⚡ {{ bvCreditCost }} 生成视频</template>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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
  ExpandOutline, CloseOutline, CopyOutline, TrashOutline,
  VideocamOutline, VolumeHighOutline, VolumeMuteOutline
} from '@vicons/ionicons5'
import {
  updateNode, removeNode, duplicateNode, addNode, addEdge, addNodes,
  nodes, edges, canvasGroups, addCanvasGroup, updateCanvasGroup,
  startBatchOperation, endBatchOperation, currentProjectId
} from '../../stores/canvas'
import { patchVideoNodeFromRemoteUrl } from '@/utils/applyVideoNodeCache'
import NodeHandleMenu from './NodeHandleMenu.vue'
import { useModelStore } from '../../stores/pinia'
import { streamChatCompletions } from '../../api/chat'
import { DEFAULT_CHAT_MODEL, VIDEO_MODELS, SEEDANCE_RESOLUTION_OPTIONS, DEFAULT_VIDEO_MODEL } from '../../config/models'
import { useVideoGeneration } from '../../hooks'
import {
  inferTargetSecondsForStoryboard,
  computeStoryboardSceneCount,
  buildStoryboardSystemPrompt,
  parseScriptJSON,
  repairStoryboardJsonViaLlm
} from '@/utils/scriptStoryboard'
import {
  resolveVideoI2vPrompt,
  resolveSceneForStoryboardImageNode,
  pickStoryboardImageUrlFromNode,
  resolveI2vFirstFrameFromStoryboardGroup
} from '@/utils/storyboardVideoPrompt'

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

    const targetSeconds = inferTargetSecondsForStoryboard(msg)
    const sceneCount = computeStoryboardSceneCount(targetSeconds)
    const systemPrompt = buildStoryboardSystemPrompt({
      targetSeconds: targetSeconds ?? undefined,
      sceneCount: sceneCount ?? undefined
    })

    for await (const chunk of streamChatCompletions(
      { model: localModel.value, messages: [
          { role: 'system', content: systemPrompt },
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

    let scenes = parseScriptJSON(fullText)
    if (!scenes?.length) {
      window.$message?.warning('输出格式异常，已发起 JSON 修复，请稍候…')
      scenes = await repairStoryboardJsonViaLlm({
        model: localModel.value,
        rawText: fullText,
        signal: abortCtrl.signal,
        origin: parsedUrl.origin,
        pathname: parsedUrl.pathname,
        apiKey: modelStore.currentApiKey || ''
      })
    }
    if (!scenes?.length) throw new Error('解析分镜数据失败，请重试')

    updateNode(props.id, { status: 'done', scenes })
    window.$message?.success(`分镜脚本生成完成，共 ${scenes.length} 个分镜`)
  } catch (err) {
    if (err.name === 'AbortError') {
      updateNode(props.id, { status: 'idle' })
    } else {
      console.info('[ScriptNode] 生成失败:', err.name, err.message, '\nfullText:', fullText)
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
        label: `分镜 #${scene.sceneNo}`,
        sceneNo: scene.sceneNo,
        videoMotionPrompt: scene.videoMotionPrompt || ''
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

// ── Batch video generation ────────────────────────────────────────────

// Video generation hook
const { createVideoTaskOnly } = useVideoGeneration()

// Batch video panel state
const showBatchVideoPanel = ref(false)
const isGeneratingVideos = ref(false)

// Video generation settings
const bvModel = ref(DEFAULT_VIDEO_MODEL)
const bvRatio = ref('16:9')
const bvResolution = ref('720p')
const bvDuration = ref(5)
const bvAudio = ref(true)

// Available video models (only those supporting i2v or t2v+i2v)
const bvModelOptions = computed(() =>
  VIDEO_MODELS
    .filter(m => m.type === 'i2v' || m.type === 't2v+i2v')
    .map(m => ({ label: m.label, key: m.key }))
)
const bvDisplayModel = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.label?.replace(/\(.*\)/, '').trim() || bvModel.value
})

// Ratio options from selected model
const bvRatioList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.ratios || ['16:9', '1:1', '9:16']
})

// Resolution options from selected model
const bvResolutionList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.resolutions || SEEDANCE_RESOLUTION_OPTIONS.map(r => r.key)
})

// Duration options from selected model
const bvDurList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.durs || [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }]
})

// Credit cost estimate (rough: base 55 per video, ×2 for 10s, ×1.5 for 1080p, ×1.2 for audio)
const bvCreditCost = computed(() => {
  const sceneCount = localScenes.value.length
  let perVideo = 55
  if (bvDuration.value >= 10) perVideo *= 2
  if (bvResolution.value === '1080p') perVideo = Math.ceil(perVideo * 1.5)
  else if (bvResolution.value === '480p') perVideo = Math.ceil(perVideo * 0.7)
  if (bvAudio.value) perVideo = Math.ceil(perVideo * 1.2)
  return sceneCount * perVideo
})

// Sync ratio/resolution/duration when model changes
watch(bvModel, (key) => {
  const m = VIDEO_MODELS.find(x => x.key === key)
  if (m?.defaultParams) {
    bvRatio.value = m.defaultParams.ratio || '16:9'
    bvDuration.value = m.defaultParams.duration || 5
  }
  if (m?.defaultResolution) bvResolution.value = m.defaultResolution
})

const onBvModelSelect = (key) => { bvModel.value = key }

// Open batch video panel — focus canvas on the storyboard group
const handleOpenBatchVideo = () => {
  showBatchVideoPanel.value = true
}

const handleCloseBatchVideo = () => {
  showBatchVideoPanel.value = false
}

/**
 * Batch generate videos:
 * 1. Find all imageConfig nodes in the storyboard group
 * 2. Collect their generated images + videoMotionPrompt from scenes
 * 3. Create a new group of video nodes to the right
 * 4. Fire all video generation tasks in parallel
 */
const handleBatchGenerateVideos = async () => {
  if (isGeneratingVideos.value || !localScenes.value.length) return
  isGeneratingVideos.value = true

  try {
    // Find the storyboard group created by this script node
    const scriptOutputEdges = edges.value.filter(e => e.source === props.id && e.sourceHandle === 'script-output')
    let storyboardGroupId = null
    let storyboardNodes = []

    for (const edge of scriptOutputEdges) {
      const proxyNode = nodes.value.find(n => n.id === edge.target && n.type === 'groupProxy')
      if (proxyNode) {
        const g = canvasGroups.value.find(grp => grp.memberIds?.includes(proxyNode.id))
        if (g) {
          storyboardGroupId = g.id
          storyboardNodes = g.memberIds
            .map(mid => nodes.value.find(n => n.id === mid))
            .filter(n => n && n.type === 'imageConfig')
          break
        }
      }
    }

    if (storyboardNodes.length === 0) {
      window.$message?.warning('请先生成分镜图')
      isGeneratingVideos.value = false
      return
    }

    // Sort by position (left-to-right, top-to-bottom)
    storyboardNodes.sort((a, b) => {
      const rowA = Math.floor(a.position.y / 200)
      const rowB = Math.floor(b.position.y / 200)
      if (rowA !== rowB) return rowA - rowB
      return a.position.x - b.position.x
    })

    // Collect image URLs and prompts per scene（镜号对齐 + 视频运动提示词优先）
    const sceneData = storyboardNodes.map((node, i) => {
      const scene = resolveSceneForStoryboardImageNode(node, localScenes.value, i)
      const imageUrl = pickStoryboardImageUrlFromNode(node)
      const firstFrameUrl = resolveI2vFirstFrameFromStoryboardGroup(storyboardNodes, i)
      const prompt = resolveVideoI2vPrompt(node, localScenes.value, i)
      const sceneNo = scene.sceneNo ?? (i + 1)
      return {
        nodeId: node.id,
        imageUrl,
        firstFrameUrl,
        prompt,
        sceneNo,
        label: `分镜视频 #${sceneNo}`
      }
    })

    // Calculate position for video group (right of storyboard group)
    const storyboardGroup = canvasGroups.value.find(g => g.id === storyboardGroupId)
    const groupRight = storyboardGroup?.frame
      ? storyboardGroup.frame.x + storyboardGroup.frame.width + 80
      : (props.position?.x || 0) + 2200
    const groupTop = storyboardGroup?.frame?.y || (props.position?.y || 0)

    // Create video nodes in grid layout
    const COLS = 5, NODE_W = 420, NODE_H = 320, GAP_X = 12, GAP_Y = 12

    const videoNodeSpecs = sceneData.map((sd, i) => ({
      type: 'video',
      position: {
        x: groupRight + (i % COLS) * (NODE_W + GAP_X),
        y: groupTop + Math.floor(i / COLS) * (NODE_H + GAP_Y)
      },
      data: {
        url: '',
        loading: true,
        label: sd.label,
        model: bvModel.value,
        sceneNo: sd.sceneNo,
        videoMotionPrompt: sd.prompt,
        videoGenParams: {
          model: bvModel.value,
          ratio: bvRatio.value,
          dur: bvDuration.value,
          resolution: bvResolution.value,
          generateAudio: bvAudio.value,
          first_frame_image: sd.firstFrameUrl || undefined,
          last_frame_image: pickStoryboardImageUrlFromNode(storyboardNodes[i + 1]) || undefined
        }
      }
    }))

    startBatchOperation()
    const videoNodeIds = addNodes(videoNodeSpecs, false)
    endBatchOperation()

    await new Promise(r => setTimeout(r, 150))

    // Create group for video nodes
    let videoGroupId = null
    if (videoNodeIds.length >= 2) {
      videoGroupId = addCanvasGroup(videoNodeIds)
      if (videoGroupId) updateCanvasGroup(videoGroupId, { label: '视频组 · 分镜图 · 脚本生成器' })
    }

    // Create proxy node and connect storyboard group → video group
    if (videoGroupId) {
      const vg = canvasGroups.value.find(x => x.id === videoGroupId)
      if (vg?.frame) {
        const proxyId = addNode('groupProxy', {
          x: vg.frame.x,
          y: vg.frame.y + vg.frame.height / 2 - 6
        }, {})
        updateCanvasGroup(videoGroupId, { memberIds: [...(vg.memberIds || []), proxyId] })

        // Find storyboard group's proxy to connect from
        const sbProxy = scriptOutputEdges.map(e => e.target).find(tid => {
          const n = nodes.value.find(x => x.id === tid && x.type === 'groupProxy')
          return !!n
        })
        if (sbProxy) {
          addEdge({
            source: sbProxy,
            target: proxyId,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'default'
          })
        }
      }
    }

    // Close panel & show success
    showBatchVideoPanel.value = false
    window.$message?.success(`正在生成 ${videoNodeIds.length} 个分镜视频…`)

    // Fire all video generation tasks in parallel (each independent)
    videoNodeIds.forEach(async (videoNodeId, i) => {
      const sd = sceneData[i]
      try {
        const params = {
          model: bvModel.value,
          ratio: bvRatio.value,
          dur: bvDuration.value,
          resolution: bvResolution.value,
          generateAudio: bvAudio.value
        }
        if (sd.prompt) params.prompt = sd.prompt
        if (sd.firstFrameUrl) params.first_frame_image = sd.firstFrameUrl
        const nextShot = storyboardNodes[i + 1]
        const nextUrl = nextShot ? pickStoryboardImageUrlFromNode(nextShot) : null
        if (nextUrl) params.last_frame_image = nextUrl

        const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

        if (url) {
          const mediaPatch = await patchVideoNodeFromRemoteUrl(currentProjectId.value, url, null)
          updateNode(videoNodeId, {
            ...mediaPatch,
            loading: false,
            label: sd.label,
            model: bvModel.value,
            updatedAt: Date.now()
          })
        } else if (newTaskId) {
          updateNode(videoNodeId, {
            taskId: newTaskId,
            loading: true,
            label: sd.label,
            model: bvModel.value,
            updatedAt: Date.now()
          })
        }
      } catch (err) {
        updateNode(videoNodeId, {
          loading: false,
          error: err.message || '生成失败',
          label: sd.label,
          updatedAt: Date.now()
        })
      }
    })

    // Store reference to video group for this script node
    updateNode(props.id, { videoGroupId })
  } catch (err) {
    window.$message?.error('批量视频生成失败：' + err.message)
  } finally {
    isGeneratingVideos.value = false
  }
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

/* ─── Batch video panel ──────────────────────────────────────────────── */
.bv-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0,0,0,0.3);
}
.bv-panel {
  width: 100%;
  max-width: 800px;
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(30,30,35,0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
}
.bv-settings {
  padding: 20px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.bv-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bv-section-title {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
}
.bv-hint {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  cursor: help;
}
.bv-option-row {
  display: flex;
  gap: 8px;
}
.bv-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.08);
  cursor: pointer;
  transition: all 0.15s;
  min-width: 72px;
}
.bv-option-btn:hover {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.9);
}
.bv-option-btn.active {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.35);
  color: white;
  font-weight: 500;
}

/* Ratio icons */
.bv-ratio-icon {
  display: inline-block;
  border: 1.5px solid currentColor;
  border-radius: 2px;
}
.ratio-16x9 { width: 16px; height: 9px; }
.ratio-1x1  { width: 12px; height: 12px; }
.ratio-9x16 { width: 9px;  height: 16px; }
.ratio-4x3  { width: 14px; height: 10px; }
.ratio-3x4  { width: 10px; height: 14px; }
.ratio-21x9 { width: 18px; height: 8px; }

/* Bottom bar */
.bv-bottom-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(20,20,25,0.6);
}
.bv-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}
.bv-close-btn:hover { background: rgba(255,255,255,0.12); color: white; }
.bv-model-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s;
}
.bv-model-btn:hover { background: rgba(255,255,255,0.14); }
.bv-summary {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  white-space: nowrap;
}
.bv-scene-count {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  white-space: nowrap;
  margin-left: auto;
}
.bv-generate-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}
.bv-generate-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.bv-generate-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; filter: none; }

/* Panel transition */
.bv-panel-enter-active { transition: all 0.25s ease-out; }
.bv-panel-leave-active { transition: all 0.2s ease-in; }
.bv-panel-enter-from { opacity: 0; transform: translateY(40px); }
.bv-panel-leave-to { opacity: 0; transform: translateY(40px); }
</style>
