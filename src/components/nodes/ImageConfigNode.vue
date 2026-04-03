<template>
  <!-- Image config node | 文生图配置节点 -->
  <div
    ref="nodeRef"
    class="icn-wrapper"
    @mouseenter="showHandleMenu = true"
    @mouseleave="showHandleMenu = false"
    @click.stop="onNodeClick"
  >
    <div class="icn-card" :class="{ 'icn-expanded': isExpanded, 'icn-selected': selected }">
      <!-- Header: label + upload -->
      <div class="icn-header">
        <div class="icn-label-area">
          <n-icon :size="13" class="icn-label-icon"><ImageOutline /></n-icon>
          <span
            v-if="!isEditingLabel"
            class="icn-label-text"
            @dblclick.stop="startEditLabel"
            title="双击编辑名称"
          >{{ data.label }}</span>
          <input
            v-else
            ref="labelInputRef"
            v-model="editingLabelValue"
            class="icn-label-input"
            @blur="finishEditLabel"
            @keydown.enter="finishEditLabel"
            @keydown.escape="cancelEditLabel"
            @click.stop
          />
        </div>
        <div class="icn-header-acts">
          <label class="icn-hdr-btn" title="上传图片" @click.stop>
            <input type="file" accept="image/*" class="hidden" @change="handleUploadFile" />
            <n-icon :size="12"><CloudUploadOutline /></n-icon>
            <span>上传</span>
          </label>
          <button class="icn-hdr-btn icn-hdr-icon" @click.stop="handleDuplicate" title="复制">
            <n-icon :size="12"><CopyOutline /></n-icon>
          </button>
          <button class="icn-hdr-btn icn-hdr-icon" @click.stop="handleDelete" title="删除">
            <n-icon :size="12"><TrashOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Image preview area -->
      <div
        class="icn-preview"
        :class="{
          'icn-preview-stack': previewImages.length > 1 && !isGridExpanded,
          'icn-preview-grid-mode': isGridExpanded
        }"
      >
        <!-- Empty / placeholder state -->
        <template v-if="previewImages.length === 0 && !loading">
          <div class="icn-preview-empty">
            <n-icon :size="40" class="icn-empty-icon"><ImageOutline /></n-icon>
          </div>
          <div class="icn-try-actions">
            <span class="icn-try-label">尝试:</span>
            <button class="icn-try-btn" @click.stop="handleImg2Img">
              <n-icon :size="11"><ImagesOutline /></n-icon>图生图
            </button>
            <button class="icn-try-btn" @click.stop="handleUpscale">
              <n-icon :size="11"><ExpandOutline /></n-icon>图片高清
            </button>
          </div>
        </template>

        <!-- Single image -->
        <template v-else-if="previewImages.length === 1 && !loading">
          <img :src="previewImages[0]" class="icn-preview-img" alt="生成结果" @error="onPreviewImgError(0)" />
          <div class="icn-regen-overlay">
            <button class="icn-regen-btn" @click.stop="handleGenerate" title="重新生成">
              <n-icon :size="14"><RefreshOutline /></n-icon>重新生成
            </button>
          </div>
        </template>

        <!-- Multiple images: stacked collapsed view -->
        <template v-else-if="previewImages.length > 1 && !isGridExpanded && !loading">
          <!-- Back cards (slightly offset, showing depth) -->
          <div
            v-for="offset in Math.min(previewImages.length - 1, 2)"
            :key="`back-${offset}`"
            class="icn-stack-back"
            :style="{
              zIndex: offset,
              transform: `translate(${offset * 6}px, ${offset * -6}px) scale(${1 - offset * 0.025})`
            }"
          >
            <img
              :src="previewImages[(mainImageIndex + offset) % previewImages.length]"
              class="icn-stack-img"
              alt=""
              @error="onPreviewImgError((mainImageIndex + offset) % previewImages.length)"
            />
          </div>
          <!-- Front card: main image -->
          <div class="icn-stack-front" style="z-index: 10">
            <img :src="previewImages[mainImageIndex]" class="icn-stack-img" alt="主图" @error="onPreviewImgError(mainImageIndex)" />
            <!-- Count badge -->
            <div class="icn-stack-count">
              <n-icon :size="10"><ImagesOutline /></n-icon>
              {{ previewImages.length }}张
            </div>
            <!-- Regenerate button -->
            <button class="icn-stack-regen" @click.stop="handleGenerate" title="重新生成">
              <n-icon :size="12"><RefreshOutline /></n-icon>
            </button>
            <!-- Expand button -->
            <button class="icn-stack-expand-btn" @click.stop="expandGrid" title="展开全部">
              <n-icon :size="12"><ExpandOutline /></n-icon>
              展开
            </button>
          </div>
        </template>

        <!-- Multiple images: expanded grid -->
        <template v-else-if="previewImages.length > 1 && isGridExpanded">
          <div class="icn-multi-grid">
            <div
              v-for="(url, i) in previewImages"
              :key="i"
              class="icn-multi-item"
              :class="{ 'is-main': i === mainImageIndex }"
            >
              <img :src="url" class="icn-multi-img" :alt="`生成结果 ${i + 1}`" @error="onPreviewImgError(i)" />
              <!-- Action buttons overlay -->
              <div class="icn-multi-actions">
                <button class="icn-multi-btn" @click.stop="downloadImage(url, i)" title="下载">
                  <n-icon :size="11"><DownloadOutline /></n-icon>下载
                </button>
                <button
                  v-if="i !== mainImageIndex"
                  class="icn-multi-btn icn-multi-btn-primary"
                  @click.stop="setMainImage(i)"
                >
                  设为主图
                </button>
                <button
                  v-else
                  class="icn-multi-btn"
                  @click.stop="collapseGrid"
                >
                  收起
                </button>
              </div>
              <!-- Main image mark -->
              <div v-if="i === mainImageIndex" class="icn-multi-main-mark">
                <n-icon :size="12"><CheckmarkCircleOutline /></n-icon>主图
              </div>
            </div>
          </div>
        </template>

        <!-- Loading overlay (always on top) -->
        <div v-if="loading" class="icn-loading-overlay">
          <n-spin :size="28" />
          <span class="icn-loading-text">生成中…</span>
        </div>
      </div>

      <!-- Expandable input panel (show on node click, hide on outside click) -->
      <Transition name="icn-panel">
        <div v-if="isExpanded" class="icn-input-panel" @click.stop @mousedown.stop>
          <!-- Toolbar row: style / mark / focus -->
          <div class="icn-toolbar-row">
            <button
              class="icn-tool-btn"
              :class="{ active: appliedStyle }"
              @click.stop="openStyleModal"
              title="选择风格"
            >
              <n-icon :size="14"><ColorPaletteOutline /></n-icon>
              <span>风格</span>
            </button>
            <button class="icn-tool-btn" title="标记" @click.stop>
              <n-icon :size="14"><BookmarkOutline /></n-icon>
              <span>标记</span>
            </button>
            <button class="icn-tool-btn" title="聚焦" @click.stop>
              <n-icon :size="14"><ScanOutline /></n-icon>
              <span>聚焦</span>
            </button>
            <div class="icn-toolbar-spacer" />
            <button class="icn-tool-btn icn-tool-icon" title="展开编辑" @click.stop>
              <n-icon :size="14"><ResizeOutline /></n-icon>
            </button>
          </div>

          <!-- Applied style badge -->
          <div v-if="appliedStyle" class="icn-style-badge">
            <span class="icn-style-preview" :style="{ background: appliedStyle.gradient }" />
            <span class="icn-style-name">{{ appliedStyle.name }}</span>
            <button class="icn-style-remove" @click.stop="removeStyle" title="移除风格">×</button>
          </div>

          <!-- Prompt textarea -->
          <textarea
            v-model="localPrompt"
            @mousedown.stop
            @keydown.stop
            @click.stop
            placeholder="描述你想要生成的画面内容，按/呼出指令，@引用素材"
            class="icn-prompt nodrag"
            rows="3"
          />

          <!-- Model tips -->
          <div v-if="currentModelConfig?.tips" class="icn-tips">
            💡 {{ currentModelConfig.tips }}
          </div>

          <!-- Connected inputs indicator -->
          <div v-if="connectedPrompts.length > 0 || connectedRefImages.length > 0" class="icn-connections">
            <span v-if="connectedPrompts.length > 0" class="icn-conn-badge icn-conn-prompt">
              提示词 {{ connectedPrompts.length }}个
            </span>
            <span v-if="connectedRefImages.length > 0" class="icn-conn-badge icn-conn-ref">
              参考图 {{ connectedRefImages.length }}张
            </span>
          </div>

          <!-- Bottom control bar -->
          <div class="icn-bottom-bar">
            <!-- Model selector -->
            <n-dropdown :options="modelOptions" @select="handleModelSelect">
              <button class="icn-ctrl-pill" @click.stop title="选择模型">
                <n-icon :size="9"><LibraryOutline /></n-icon>
                <span>{{ displayModelShort }}</span>
              </button>
            </n-dropdown>

            <!-- Size / Quality selector -->
            <n-dropdown :options="ratioMenuOptions" @select="handleRatioSelect">
              <button class="icn-ctrl-pill" @click.stop title="分辨率/比例">
                <span>{{ displayRatioQuality }}</span>
              </button>
            </n-dropdown>

            <!-- Camera control -->
            <button class="icn-ctrl-pill" @click.stop title="摄像机控制">
              <n-icon :size="9"><VideocamOutline /></n-icon>
              <span>摄像机控制</span>
            </button>

            <!-- Text enhance / Aa -->
            <button class="icn-ctrl-pill icn-pill-icon" @click.stop title="文字增强">
              <span class="icn-aa">Aa</span>
            </button>

            <!-- Advanced settings -->
            <button class="icn-ctrl-pill icn-pill-icon" @click.stop title="高级设置">
              <n-icon :size="12"><OptionsOutline /></n-icon>
            </button>

            <div class="icn-bar-spacer" />

            <!-- Count selector (1/2/4 images) -->
            <n-dropdown :options="countOptions" @select="handleCountSelect">
              <button class="icn-ctrl-pill" @click.stop title="生成张数">
                <span>{{ localCount }}张</span>
                <n-icon :size="8"><ChevronDownOutline /></n-icon>
              </button>
            </n-dropdown>

            <!-- Credit cost indicator -->
            <span class="icn-cost">
              <n-icon :size="10"><FlashOutline /></n-icon>
              {{ creditCost }}
            </span>

            <!-- Execute button -->
            <button
              class="icn-run-btn"
              @click.stop="handleGenerate()"
              :disabled="loading"
              title="立即生成"
            >
              <n-spin v-if="loading" :size="11" />
              <n-icon v-else :size="13"><SendOutline /></n-icon>
            </button>
          </div>

          <!-- Error message -->
          <div v-if="data.generateError" class="icn-error">
            {{ data.generateError }}
          </div>
        </div>
      </Transition>
    </div>

    <!-- Vue Flow handles -->
    <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    <NodeHandleMenu
      :nodeId="id"
      nodeType="imageConfig"
      :visible="showHandleMenu"
      :operations="operations"
      @select="handleSelect"
    />
  </div>

  <!-- Style Modal — teleported to body to escape canvas transform context -->
  <Teleport to="body">
    <div v-if="showStyleModal" class="sm-overlay" @mousedown.self="showStyleModal = false">
      <div ref="modalRef" class="sm-modal" @click.stop>
        <!-- Modal header -->
        <div class="sm-header">
          <span class="sm-title">风格广场</span>
          <div class="sm-header-right">
            <span class="sm-model-tag">当前模型：{{ displayModelShort }}</span>
            <button class="sm-sort-btn" @click="toggleSort" title="切换排序">
              <n-icon :size="11"><SwapVerticalOutline /></n-icon>
              {{ sortMode === 'usage' ? '最多使用' : '最新时间' }}
            </button>
            <button class="sm-close" @click="showStyleModal = false" title="关闭">
              <n-icon :size="16"><CloseOutline /></n-icon>
            </button>
          </div>
        </div>

        <!-- Category navigation (horizontal scroll) -->
        <div class="sm-category-nav">
          <button
            v-for="cat in styleCategories"
            :key="cat"
            class="sm-cat-btn"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>

        <!-- Sub nav: all / favorites / recent -->
        <div class="sm-sub-nav">
          <div class="sm-tabs">
            <button
              v-for="tab in styleTabs"
              :key="tab.key"
              class="sm-tab"
              :class="{ active: styleTab === tab.key }"
              @click="styleTab = tab.key"
            >{{ tab.label }}</button>
          </div>
          <span class="sm-count">{{ filteredStyles.length }} 个风格</span>
        </div>

        <!-- Style grid -->
        <div class="sm-body">
          <div v-if="filteredStyles.length > 0" class="sm-grid">
            <div
              v-for="style in filteredStyles"
              :key="style.id"
              class="sm-card"
              :class="{ selected: appliedStyle?.id === style.id }"
              @click="applyStyle(style)"
              :title="style.name"
            >
              <div class="sm-card-cover" :style="{ background: style.gradient }">
                <div class="sm-card-selected-mark" v-if="appliedStyle?.id === style.id">
                  <n-icon :size="20"><CheckmarkCircleOutline /></n-icon>
                </div>
                <button
                  class="sm-fav-btn"
                  :class="{ active: favoritedStyles.has(style.id) }"
                  @click.stop="toggleFavorite(style.id)"
                  title="收藏"
                >
                  <n-icon :size="13">
                    <Heart v-if="favoritedStyles.has(style.id)" />
                    <HeartOutline v-else />
                  </n-icon>
                </button>
              </div>
              <div class="sm-card-info">
                <span class="sm-card-name">{{ style.name }}</span>
                <span class="sm-card-usage">{{ formatUsage(style.usageCount) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="sm-empty">
            <n-icon :size="36" class="sm-empty-icon"><ImageOutline /></n-icon>
            <span>暂无风格</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Image config node component | 文生图配置节点组件
 * Redesigned with expandable input panel, style picker modal, and count selector.
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin } from 'naive-ui'
import {
  ChevronDownOutline, CopyOutline, TrashOutline, ImageOutline, RefreshOutline, DownloadOutline,
  CloudUploadOutline, ImagesOutline, ExpandOutline, ColorPaletteOutline,
  BookmarkOutline, ScanOutline, LibraryOutline, VideocamOutline,
  OptionsOutline, FlashOutline, SendOutline, SwapVerticalOutline,
  CloseOutline, HeartOutline, Heart, CheckmarkCircleOutline, ResizeOutline
} from '@vicons/ionicons5'
import { useImageGeneration } from '../../hooks'
import { updateNode, addNode, addEdge, nodes, edges, duplicateNode, removeNode, currentProjectId } from '../../stores/canvas'
import { cacheRemoteToServer, headLocalMedia } from '@/utils/localMediaServer'
import {
  buildImagePreviewUrls,
  getGeneratedUrlList,
  getGeneratedLocalKeys
} from '@/utils/generatedMediaAssets'
import NodeHandleMenu from './NodeHandleMenu.vue'
import { useModelStore } from '../../stores/pinia'
import { getModelSizeOptions, getModelQualityOptions, getModelConfig, DEFAULT_IMAGE_MODEL } from '../../stores/models'
import { usesVolcengineImageApi } from '../../config/models'
import { getVolcengineApiKey } from '../../config/volcengineEnv'
import { parseMentions } from '../../hooks/useNodeRef'
import { aggregateBundleTexts, aggregateBundleRefImages } from '../../utils/bundleRefs'
import { registerCanvasGroupNodeExecuteBridge } from '../../hooks/useCanvasGroupNodeExecuteBridge'

// ─── Style modal mock data ────────────────────────────────────────────────────

const styleCategories = ['推荐', '摄影写真', '电商营销', '动漫游戏', '风格插画', '平面设计', '建筑及室内设计', '创意玩法', '文创周边', '小说推文']

const styleTabs = [
  { key: 'all', label: '全部' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'recent', label: '最近使用' }
]

const MOCK_STYLES = [
  { id: 's1', name: '赛博朋克', category: '动漫游戏', usageCount: 23400, gradient: 'linear-gradient(135deg,#0d0221,#2d1b69,#4a0e8f)', promptSuffix: 'cyberpunk style, neon lights, rain-soaked streets, holographic signs', createdAt: 1704067200000 },
  { id: 's2', name: '水墨写意', category: '风格插画', usageCount: 18700, gradient: 'linear-gradient(135deg,#f7f3e9,#d4c5a9,#8b7355)', promptSuffix: 'traditional Chinese ink wash painting, elegant brushwork, misty mountains', createdAt: 1703980800000 },
  { id: 's3', name: '高端商业摄影', category: '摄影写真', usageCount: 15200, gradient: 'linear-gradient(135deg,#1a1a1a,#2d2d2d,#525252)', promptSuffix: 'high-end commercial photography, studio lighting, professional, sharp details', createdAt: 1703894400000 },
  { id: 's4', name: '日系动漫', category: '动漫游戏', usageCount: 14300, gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f,#ff9a9e)', promptSuffix: 'Japanese anime style, vibrant colors, cel shading, expressive eyes', createdAt: 1703808000000 },
  { id: 's5', name: '极简电商', category: '电商营销', usageCount: 12800, gradient: 'linear-gradient(135deg,#ffffff,#f0f0f0,#d8d8d8)', promptSuffix: 'minimalist e-commerce style, white background, clean product presentation', createdAt: 1703721600000 },
  { id: 's6', name: '波普艺术', category: '风格插画', usageCount: 11500, gradient: 'linear-gradient(135deg,#ff6b6b,#feca57,#48dbfb)', promptSuffix: 'pop art style, bold colors, Ben-Day dots, comic book aesthetic', createdAt: 1703635200000 },
  { id: 's7', name: '工业风设计', category: '平面设计', usageCount: 10200, gradient: 'linear-gradient(135deg,#2c3e50,#3d5166,#546e7a)', promptSuffix: 'industrial design, raw materials, concrete textures, geometric forms', createdAt: 1703548800000 },
  { id: 's8', name: '精品时尚', category: '摄影写真', usageCount: 9800, gradient: 'linear-gradient(135deg,#667eea,#764ba2,#f093fb)', promptSuffix: 'fashion photography, editorial style, haute couture, magazine cover lighting', createdAt: 1703462400000 },
  { id: 's9', name: '奇幻世界', category: '动漫游戏', usageCount: 9300, gradient: 'linear-gradient(135deg,#11998e,#38ef7d,#1a5276)', promptSuffix: 'fantasy world, magical atmosphere, epic landscape, otherworldly light', createdAt: 1703376000000 },
  { id: 's10', name: '现代极简建筑', category: '建筑及室内设计', usageCount: 8700, gradient: 'linear-gradient(135deg,#e8d5b7,#d4b896,#bfa070)', promptSuffix: 'modern minimalist architecture, clean lines, natural light, open space', createdAt: 1703289600000 },
  { id: 's11', name: '手绘插画', category: '风格插画', usageCount: 8200, gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb,#ffecd2)', promptSuffix: 'hand-drawn illustration style, whimsical lines, warm palette', createdAt: 1703203200000 },
  { id: 's12', name: '国潮文创', category: '文创周边', usageCount: 7900, gradient: 'linear-gradient(135deg,#c0392b,#e74c3c,#f39c12)', promptSuffix: 'Chinese cultural creative design, traditional patterns, guochao style, vibrant', createdAt: 1703116800000 },
  { id: 's13', name: '双重曝光', category: '创意玩法', usageCount: 7600, gradient: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', promptSuffix: 'double exposure photography effect, surreal blend, silhouette landscape', createdAt: 1703030400000 },
  { id: 's14', name: '豪华室内设计', category: '建筑及室内设计', usageCount: 7100, gradient: 'linear-gradient(135deg,#b8860b,#daa520,#f5c518)', promptSuffix: 'luxury interior design, opulent materials, gold accents, marble surfaces', createdAt: 1702944000000 },
  { id: 's15', name: '古风推文', category: '小说推文', usageCount: 6800, gradient: 'linear-gradient(135deg,#4a1942,#6b2d5e,#8b3a7a)', promptSuffix: 'ancient Chinese style, period drama aesthetic, ink painting mood, poetic', createdAt: 1702857600000 },
  { id: 's16', name: '像素游戏', category: '动漫游戏', usageCount: 6500, gradient: 'linear-gradient(135deg,#141e30,#243b55,#1f4068)', promptSuffix: 'pixel art style, retro game aesthetic, 8-bit colors, chunky pixels', createdAt: 1702771200000 },
  { id: 's17', name: '轻奢电商', category: '电商营销', usageCount: 6200, gradient: 'linear-gradient(135deg,#f5f5f5,#e8e8e8,#d0c8b8)', promptSuffix: 'luxury product photography, soft diffused lighting, premium packaging', createdAt: 1702684800000 },
  { id: 's18', name: '蒸汽朋克', category: '创意玩法', usageCount: 5900, gradient: 'linear-gradient(135deg,#8B6914,#A0522D,#704214)', promptSuffix: 'steampunk style, Victorian era, brass gears, steam engines, sepia tones', createdAt: 1702598400000 },
  { id: 's19', name: '星空美学', category: '摄影写真', usageCount: 5600, gradient: 'linear-gradient(135deg,#0a0a2e,#1a1a4e,#0d2137)', promptSuffix: 'astrophotography, Milky Way backdrop, night sky, long exposure, star trails', createdAt: 1702512000000 },
  { id: 's20', name: '扁平插画', category: '平面设计', usageCount: 5300, gradient: 'linear-gradient(135deg,#fddb92,#d1fdff,#96e6a1)', promptSuffix: 'flat design illustration, bold geometric shapes, simple color palette', createdAt: 1702425600000 },
]

// ─── Store + props ────────────────────────────────────────────────────────────

const modelStore = useModelStore()

const props = defineProps({
  id: String,
  data: Object,
  selected: { type: Boolean, default: false }
})

const { updateNodeInternals } = useVueFlow()

// ─── API configuration ────────────────────────────────────────────────────────

const isConfigured = computed(() => {
  if (
    usesVolcengineImageApi(localModel.value) &&
    modelStore.currentProvider === 'volcengine'
  ) {
    return !!(getVolcengineApiKey() || modelStore.apiKeysByProvider?.volcengine)
  }
  return !!modelStore.currentApiKey
})

// ─── Image generation hook ────────────────────────────────────────────────────

const { loading, error, images: generatedImages, generate } = useImageGeneration()

// ─── Local state ──────────────────────────────────────────────────────────────

const nodeRef = ref(null)
const modalRef = ref(null)
const showHandleMenu = ref(false)
const isExpanded = ref(false)
const showStyleModal = ref(false)
const appliedStyle = ref(null)

const localModel = ref(props.data?.model || DEFAULT_IMAGE_MODEL)
const localSize = ref(props.data?.size || '2048x2048')
const localQuality = ref(props.data?.quality || 'standard')
const localPrompt = ref(props.data?.prompt || '')
const localCount = ref(props.data?.count || 1)

// Label editing state
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Style modal state
const activeCategory = ref('推荐')
const styleTab = ref('all')
const sortMode = ref('usage')

// ─── Favorites + recent (persisted in localStorage) ───────────────────────────

const FAVORITES_KEY = 'icn_favoritedStyles'
const RECENT_KEY = 'icn_recentStyles'

const loadFavorites = () => {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')) } catch { return new Set() }
}
const loadRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

const favoritedStyles = ref(loadFavorites())
const recentStyleIds = ref(loadRecent())

const toggleFavorite = (id) => {
  const next = new Set(favoritedStyles.value)
  next.has(id) ? next.delete(id) : next.add(id)
  favoritedStyles.value = next
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]))
}

const addToRecent = (style) => {
  const ids = recentStyleIds.value.filter(id => id !== style.id)
  ids.unshift(style.id)
  recentStyleIds.value = ids.slice(0, 10)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentStyleIds.value))
}

// ─── Computed: styles ─────────────────────────────────────────────────────────

const filteredStyles = computed(() => {
  let list = MOCK_STYLES

  if (styleTab.value === 'favorites') {
    list = list.filter(s => favoritedStyles.value.has(s.id))
  } else if (styleTab.value === 'recent') {
    const ids = recentStyleIds.value
    return ids.map(id => list.find(s => s.id === id)).filter(Boolean)
  }

  if (activeCategory.value !== '推荐') {
    list = list.filter(s => s.category === activeCategory.value)
  }

  return sortMode.value === 'usage'
    ? [...list].sort((a, b) => b.usageCount - a.usageCount)
    : [...list].sort((a, b) => b.createdAt - a.createdAt)
})

const toggleSort = () => {
  sortMode.value = sortMode.value === 'usage' ? 'recent' : 'usage'
}

const formatUsage = (n) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)

// ─── Computed: model / UI display ────────────────────────────────────────────

const currentModelConfig = computed(() => getModelConfig(localModel.value))

const modelOptions = computed(() => modelStore.allImageModelOptions)

const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.key === localModel.value)
  if (!model) {
    const all = modelStore.allImageModels.find(m => m.key === localModel.value)
    return all?.label || localModel.value || '选择模型'
  }
  return model?.label || localModel.value || '选择模型'
})

const SHORT_NAME_MAP = {
  '豆包 Seedream 4.5': 'Seedream 4.5',
  'Nano Banana 2': 'Lib Nano 2',
  'Nano Banana Pro': 'Lib Nano Pro',
  'Nano Banana': 'Lib Nano',
}

const displayModelShort = computed(() => SHORT_NAME_MAP[displayModelName.value] || displayModelName.value.slice(0, 14))

const qualityOptions = computed(() => getModelQualityOptions(localModel.value))
const hasQualityOptions = computed(() => qualityOptions.value?.length > 0)

const displayQuality = computed(() => {
  const opt = qualityOptions.value.find(o => o.key === localQuality.value)
  return opt?.label || '标准画质'
})

const sizeOptions = computed(() => getModelSizeOptions(localModel.value, localQuality.value))

const hasSizeOptions = computed(() => {
  const config = getModelConfig(localModel.value)
  return !!(config?.sizes && config.sizes.length > 0)
})

const displaySize = computed(() => {
  const opt = sizeOptions.value.find(o => o.key === localSize.value)
  return opt?.label || localSize.value
})

const displayRatioQuality = computed(() => {
  const qualLabel = localQuality.value === '4k' ? '4K' : '2K'
  return hasSizeOptions.value ? `${displaySize.value} · ${qualLabel}` : qualLabel
})

// Combined ratio+quality dropdown options
const ratioMenuOptions = computed(() => {
  const items = sizeOptions.value.map(o => ({ label: o.label, key: `size:${o.key}` }))
  if (hasQualityOptions.value) {
    if (items.length) items.push({ type: 'divider' })
    qualityOptions.value.forEach(o => items.push({ label: `画质：${o.label}`, key: `quality:${o.key}` }))
  }
  return items
})

const handleRatioSelect = (key) => {
  if (key.startsWith('size:')) handleSizeSelect(key.slice(5))
  else if (key.startsWith('quality:')) handleQualitySelect(key.slice(8))
}

// Count options
const countOptions = [
  { label: '1张', key: 1 },
  { label: '2张', key: 2 },
  { label: '4张', key: 4 }
]

const creditCost = computed(() => {
  const base = localQuality.value === '4k' ? 24 : 12
  return base * localCount.value
})

// Preview: 优先本地 uploads，其次远程 URL（与 generatedUrls 对齐）
const previewImages = computed(() => buildImagePreviewUrls(props.data))
const previewImageUrl = computed(() => previewImages.value[0] || null)
const previewCurrentIndex = ref(0)

// ─── Multi-image management ───────────────────────────────────────────────────

// Which image is the "main" (selected) image; 0-indexed
const mainImageIndex = ref(props.data?.mainImageIndex ?? 0)
// Whether the expanded grid is open
const isGridExpanded = ref(false)

const setMainImage = (i) => {
  mainImageIndex.value = i
  const sources = getGeneratedUrlList(props.data)
  const sourceUrl = sources[i] ?? sources[0] ?? ''
  // 下游 API 仍使用远程 sourceUrl；预览用 previewImages（本地优先）
  updateNode(props.id, { mainImageIndex: i, selectedUrl: sourceUrl })
}

const expandGrid = () => {
  isGridExpanded.value = true
  nextTick(() => updateNodeInternals(props.id))
}

const collapseGrid = () => {
  isGridExpanded.value = false
  nextTick(() => updateNodeInternals(props.id))
}

const downloadImage = (url, index) => {
  const a = document.createElement('a')
  a.href = url
  a.download = `image-${props.id}-${index + 1}.png`
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// Keep mainImageIndex in range when images change
watch(() => props.data?.generatedUrls, (urls) => {
  const list = Array.isArray(urls) ? urls : []
  if (list.length > 0 && mainImageIndex.value >= list.length) {
    mainImageIndex.value = 0
  }
  if (list.length > 0 && !props.data?.selectedUrl) {
    updateNode(props.id, { selectedUrl: list[mainImageIndex.value] })
  }
})

async function hydrateImageLocalFiles () {
  const pid = currentProjectId.value
  const urls = getGeneratedUrlList(props.data)
  if (!pid || !urls.length) return
  const keys = [...getGeneratedLocalKeys(props.data)]
  let changed = false
  for (let i = 0; i < urls.length; i++) {
    if (keys[i] && (await headLocalMedia(keys[i]))) continue
    const k = await cacheRemoteToServer(pid, urls[i], 'image')
    if (k) {
      keys[i] = k
      changed = true
    }
  }
  if (changed) updateNode(props.id, { generatedLocalKeys: keys })
}

const onPreviewImgError = async (index) => {
  const pid = currentProjectId.value
  const urls = getGeneratedUrlList(props.data)
  const u = urls[index]
  if (!pid || !u) return
  const k = await cacheRemoteToServer(pid, u, 'image')
  if (!k) return
  const keys = [...getGeneratedLocalKeys(props.data)]
  keys[index] = k
  updateNode(props.id, { generatedLocalKeys: keys })
}

// ─── Node menu operations ─────────────────────────────────────────────────────

const operations = []

const handleSelect = (item) => {
  if (item.action === 'imageConfig_imageConfig') {
    const cur = nodes.value.find(n => n.id === props.id)
    const imgId = addNode('image', { x: (cur?.position?.x || 0) + 400, y: cur?.position?.y || 0 }, { label: '图片编辑' })
    addEdge({ source: props.id, target: imgId, sourceHandle: 'right', targetHandle: 'left' })
    setTimeout(() => updateNodeInternals(imgId), 50)
    window.$message?.success('已创建图片编辑节点')
  }
}

// ─── Expand / collapse via node selection ────────────────────────────────────

const onNodeClick = () => { isExpanded.value = true }

// Sync with Vue Flow's selection state: deselect → collapse (with a brief delay
// to allow clicking internal elements like the style modal trigger first)
let collapseTimer = null
watch(() => props.selected, (sel) => {
  clearTimeout(collapseTimer)
  if (sel) {
    isExpanded.value = true
  } else {
    // Small delay so modal-open clicks that briefly deselect don't flicker
    collapseTimer = setTimeout(() => {
      if (!showStyleModal.value) isExpanded.value = false
    }, 80)
  }
})

// Fallback: close modal when clicking outside it (Teleport content check)
const handleOutsideClick = (e) => {
  if (!showStyleModal.value) return
  const insideModal = modalRef.value?.contains(e.target)
  if (!insideModal) showStyleModal.value = false
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => {
  document.removeEventListener('mousedown', handleOutsideClick)
  clearTimeout(collapseTimer)
})

// ─── Style modal actions ──────────────────────────────────────────────────────

const openStyleModal = () => { showStyleModal.value = true }

const applyStyle = (style) => {
  // Append suffix to prompt (avoid duplicates)
  const suffix = style.promptSuffix.replace(/^,\s*/, '')
  if (!localPrompt.value.includes(suffix)) {
    localPrompt.value = localPrompt.value.trim()
      ? `${localPrompt.value.trim()}, ${suffix}`
      : suffix
  }
  appliedStyle.value = style
  addToRecent(style)
  showStyleModal.value = false
}

const removeStyle = () => {
  if (appliedStyle.value) {
    const suffix = appliedStyle.value.promptSuffix.replace(/^,\s*/, '')
    localPrompt.value = localPrompt.value
      .replace(`, ${suffix}`, '')
      .replace(suffix, '')
      .trim()
    appliedStyle.value = null
  }
}

// ─── Label editing ────────────────────────────────────────────────────────────

const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || ''
  isEditingLabel.value = true
  nextTick(() => { labelInputRef.value?.focus(); labelInputRef.value?.select() })
}
const finishEditLabel = () => {
  const v = editingLabelValue.value.trim()
  if (v && v !== props.data?.label) updateNode(props.id, { label: v })
  isEditingLabel.value = false
}
const cancelEditLabel = () => { isEditingLabel.value = false }

// ─── Model / quality / size selection ────────────────────────────────────────

const handleModelSelect = (key) => {
  localModel.value = key
  const config = getModelConfig(key)
  if (config?.defaultParams?.quality) localQuality.value = config.defaultParams.quality
  const newSizes = getModelSizeOptions(key, localQuality.value)
  let defaultSize = config?.defaultParams?.size
  if (!defaultSize && newSizes.length > 0) {
    defaultSize = newSizes.find(o => o.key === '2048x2048')?.key
      || newSizes.find(o => o.key.includes('1024'))?.key
      || newSizes[0].key
  }
  localSize.value = defaultSize
  updateNode(props.id, { model: key, quality: localQuality.value, size: defaultSize })
}

const handleQualitySelect = (quality) => {
  localQuality.value = quality
  const newSizes = getModelSizeOptions(localModel.value, quality)
  if (newSizes.length > 0) {
    const defaultSize = quality === '4k'
      ? newSizes.find(o => o.key.includes('4096'))?.key || newSizes[4]?.key
      : newSizes[4]?.key
    localSize.value = defaultSize || newSizes[0].key
    updateNode(props.id, { quality, size: localSize.value })
  } else {
    updateNode(props.id, { quality })
  }
}

const handleSizeSelect = (size) => {
  localSize.value = size
  updateNode(props.id, { size })
}

const handleCountSelect = (count) => {
  localCount.value = count
  updateNode(props.id, { count })
}

// ─── Upload ───────────────────────────────────────────────────────────────────

const handleUploadFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const cur = nodes.value.find(n => n.id === props.id)
    const imgId = addNode('image', { x: (cur?.position?.x || 0) + 400, y: cur?.position?.y || 0 }, {
      url: ev.target.result,
      label: '上传图片'
    })
    addEdge({ source: props.id, target: imgId, sourceHandle: 'right', targetHandle: 'left' })
    setTimeout(() => updateNodeInternals(imgId), 50)
    window.$message?.success('图片上传成功')
  }
  reader.readAsDataURL(file)
}

const handleImg2Img = () => window.$message?.info('图生图功能即将上线')
const handleUpscale = () => window.$message?.info('图片高清功能即将上线')

// ─── Connected inputs (unchanged logic) ──────────────────────────────────────

const connectedTextNodeIds = computed(() => {
  return edges.value
    .filter(e => e.target === props.id)
    .map(e => nodes.value.find(n => n.id === e.source))
    .filter(n => n?.type === 'text')
    .map(n => n.id)
})

const resolveTextMentionsForImage = (textNode) => {
  const content = textNode.data?.content || ''
  const mentions = parseMentions(content)
  const bundleText = textNode.data?.bundleMemberIds?.length
    ? aggregateBundleTexts(nodes.value, textNode.data.bundleMemberIds) : ''
  const bundleImgs = textNode.data?.bundleMemberIds?.length
    ? aggregateBundleRefImages(nodes.value, textNode.data.bundleMemberIds) : []
  const prefix = bundleText ? `${bundleText}\n\n` : ''

  if (mentions.length === 0) return { resolvedContent: (prefix + content).trim(), refImages: [...bundleImgs] }

  const imageMentions = []
  for (const mention of mentions) {
    const refNode = nodes.value.find(n => n.id === mention.nodeId)
    if (refNode?.type === 'image') {
      const imageData = refNode.data?.base64 || refNode.data?.url
      if (imageData) imageMentions.push({ order: mention.order, nodeId: mention.nodeId, imageData })
    }
  }

  if (imageMentions.length === 0) return { resolvedContent: (prefix + content).trim(), refImages: [...bundleImgs] }

  imageMentions.sort((a, b) => a.order - b.order)
  let resolvedContent = content
  for (let i = 0; i < imageMentions.length; i++) {
    resolvedContent = resolvedContent.replace(`@[${imageMentions[i].nodeId}]`, `图${i + 1}`)
  }
  return {
    resolvedContent: (prefix + resolvedContent).trim(),
    refImages: [...bundleImgs, ...imageMentions.map(m => m.imageData)]
  }
}

const getConnectedInputs = () => {
  const textNodes = nodes.value.filter(n => n.type === 'text' && connectedTextNodeIds.value.includes(n.id))
  const mentionsPrompts = []
  const mentionsRefImages = []

  for (const textNode of textNodes) {
    const { resolvedContent, refImages: nodeRefImages } = resolveTextMentionsForImage(textNode)
    if (!resolvedContent.trim() && nodeRefImages.length === 0) continue
    mentionsPrompts.push({ order: mentionsPrompts.length, content: resolvedContent.trim() || '(参考图)', nodeId: textNode.id })
    nodeRefImages.forEach(img => mentionsRefImages.push({ order: mentionsRefImages.length, imageData: img, nodeId: textNode.id }))
  }

  const connectedEdges = edges.value.filter(e => e.target === props.id)
  const edgeRefImages = []

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue
    if (sourceNode.type === 'image') {
      const imageData = sourceNode.data?.base64 || sourceNode.data?.url
      if (imageData) edgeRefImages.push({ order: mentionsRefImages.length + (edge.data?.imageOrder || 1), imageData, nodeId: sourceNode.id })
    }
  }

  const allRefImages = [...mentionsRefImages, ...edgeRefImages].sort((a, b) => a.order - b.order)
  const sortedRefImages = allRefImages.map(r => r.imageData)

  if (mentionsPrompts.length > 0) {
    mentionsPrompts.sort((a, b) => a.order - b.order)
    return { prompt: mentionsPrompts.map(p => p.content).join('\n\n'), prompts: mentionsPrompts, refImages: sortedRefImages, refImagesWithOrder: allRefImages, fromMentions: true }
  }

  const prompts = []
  for (const edge of connectedEdges) {
    const src = nodes.value.find(n => n.id === edge.source)
    if (!src) continue
    if (src.type === 'text') {
      let content = src.data?.content || ''
      if (src.data?.bundleMemberIds?.length) {
        const bundle = aggregateBundleTexts(nodes.value, src.data.bundleMemberIds)
        content = [bundle, content].filter(Boolean).join('\n\n')
      }
      if (content) prompts.push({ order: edge.data?.promptOrder || 1, content, nodeId: src.id })
    } else if (src.type === 'llmConfig') {
      const content = src.data?.outputContent || ''
      if (content) prompts.push({ order: edge.data?.promptOrder || 1, content, nodeId: src.id })
    }
  }

  prompts.sort((a, b) => a.order - b.order)
  const combinedPrompt = prompts.map(p => p.content).join('\n\n')

  // Final fallback: use node's own stored prompt (pre-filled by storyboard generator)
  if (!combinedPrompt && sortedRefImages.length === 0 && localPrompt.value.trim()) {
    const sp = localPrompt.value.trim()
    return { prompt: sp, prompts: [{ order: 0, content: sp, nodeId: props.id }], refImages: [], refImagesWithOrder: [], fromMentions: false }
  }

  return { prompt: combinedPrompt, prompts, refImages: sortedRefImages, refImagesWithOrder: allRefImages, fromMentions: false }
}

const connectedPrompts = computed(() => getConnectedInputs().prompts)
const connectedRefImages = computed(() => getConnectedInputs().refImages)

// ─── Generate (inline — result stored in this node, no output node created) ───

const handleGenerate = async () => {
  const { prompt, prompts, refImages, refImagesWithOrder } = getConnectedInputs()

  if (!prompt && refImages.length === 0) {
    window.$message?.warning('请连接文本节点（提示词）或图片节点（参考图）')
    return
  }

  if (prompts.length > 1) {
    console.log('[ImageConfigNode] 拼接提示词顺序:', prompts.map(p => `${p.order}: ${p.content.substring(0, 20)}...`))
  }
  if (refImagesWithOrder?.length > 1) {
    console.log('[ImageConfigNode] 参考图顺序:', refImagesWithOrder.map(r => `${r.order}: ${r.nodeId}`))
  }

  if (!isConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  // Clear previous results and mark as generating
  updateNode(props.id, { generatedUrls: [], generatedLocalKeys: [], generateError: null })
  previewCurrentIndex.value = 0
  mainImageIndex.value = 0

  try {
    const params = {
      model: localModel.value,
      prompt,
      size: localSize.value,
      quality: localQuality.value,
      n: localCount.value || 1
    }
    console.log('[ImageConfigNode] 生成参数:', { model: params.model, size: params.size, quality: params.quality, n: params.n })
    if (refImages.length > 0) params.image = refImages

    const result = await generate(params)

    if (result && result.length > 0) {
      const urls = result.map(r => r.url).filter(Boolean)
      const pid = currentProjectId.value
      const localKeys = pid
        ? await Promise.all(urls.map((u) => cacheRemoteToServer(pid, u, 'image')))
        : urls.map(() => null)
      updateNode(props.id, {
        generatedUrls: urls,
        generatedLocalKeys: localKeys,
        selectedUrl: urls[0],
        mainImageIndex: 0,
        executed: true,
        updatedAt: Date.now()
      })
      mainImageIndex.value = 0
      // Auto-expand grid when multiple images generated
      if (urls.length > 1) {
        isGridExpanded.value = true
        nextTick(() => updateNodeInternals(props.id))
      }
    }
    window.$message?.success('图片生成成功')
  } catch (err) {
    updateNode(props.id, { generateError: err.message || '生成失败' })
    window.$message?.error(err.message || '图片生成失败')
  }
}

registerCanvasGroupNodeExecuteBridge(() => props.id, () => handleGenerate())

// ─── Duplicate + delete ───────────────────────────────────────────────────────

const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  window.$message?.success('节点已复制')
  if (newId) setTimeout(() => updateNodeInternals(newId), 50)
}

const handleDelete = () => {
  removeNode(props.id)
  window.$message?.success('节点已删除')
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(() => props.data?.model, (newModel) => {
  if (newModel && newModel !== localModel.value) {
    localModel.value = newModel
    const config = getModelConfig(newModel)
    if (config?.defaultParams?.quality) localQuality.value = config.defaultParams.quality
    if (config?.defaultParams?.size) localSize.value = config.defaultParams.size
  }
})

watch(() => props.data?.prompt, (val) => {
  if (val !== undefined && val !== localPrompt.value) localPrompt.value = val || ''
})

watch(localPrompt, (val) => updateNode(props.id, { prompt: val }))

watch(() => props.data, () => {
  nextTick(() => updateNodeInternals(props.id))
}, { deep: true })

watch(
  () => props.data?.autoExecute,
  (shouldExecute) => {
    if (shouldExecute && !loading.value) {
      updateNode(props.id, { autoExecute: false })
      setTimeout(() => handleGenerate(), 100)
    }
  },
  { immediate: true }
)

onMounted(() => {
  const available = modelStore.availableImageModels
  const isAvailable = available.some(m => m.key === localModel.value)
  if (!localModel.value || !isAvailable) {
    localModel.value = modelStore.selectedImageModel || available[0]?.key || DEFAULT_IMAGE_MODEL
    updateNode(props.id, { model: localModel.value })
  }
  // Ensure localSize is valid for the current model
  const validSizes = getModelSizeOptions(localModel.value, localQuality.value)
  if (validSizes.length > 0) {
    const isValidSize = validSizes.some(o => o.key === localSize.value)
    if (!isValidSize) {
      const cfg = getModelConfig(localModel.value)
      const defaultSize = cfg?.defaultParams?.size || validSizes[Math.floor(validSizes.length / 2)]?.key || validSizes[0].key
      localSize.value = defaultSize
      updateNode(props.id, { size: defaultSize })
    }
  }
  hydrateImageLocalFiles()
})
</script>

<style scoped>
/* ─── Wrapper ─────────────────────────────────────────────────────────────── */
.icn-wrapper {
  position: relative;
  padding-top: 20px;
  cursor: default;
}

/* ─── Card ────────────────────────────────────────────────────────────────── */
.icn-card {
  width: 360px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.icn-card.icn-selected,
.icn-card.icn-expanded {
  border-color: rgba(99, 179, 237, 0.6);
  box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.15);
}

/* ─── Header ──────────────────────────────────────────────────────────────── */
.icn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid var(--border-color);
}
.icn-label-area {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.icn-label-icon { opacity: 0.5; flex-shrink: 0; }
.icn-label-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icn-label-input {
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  padding: 1px 5px;
  outline: none;
  flex: 1;
}
.icn-header-acts {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.icn-hdr-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 5px;
  font-size: 11px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s;
}
.icn-hdr-btn:hover { background: var(--bg-tertiary); }
.icn-hdr-btn.icn-hdr-icon { padding: 3px 5px; }

/* ─── Preview area ────────────────────────────────────────────────────────── */
.icn-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--bg-tertiary);
  overflow: hidden;
}
.icn-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.icn-preview-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icn-empty-icon { opacity: 0.2; }

.icn-try-actions {
  position: absolute;
  bottom: 10px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.icn-try-label {
  font-size: 11px;
  color: var(--text-tertiary);
}
.icn-try-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.12s;
}
.icn-try-btn:hover { background: rgba(0,0,0,0.55); color: var(--text-primary); }

/* ─── Multi-image: stacked view ──────────────────────────────────────────── */
.icn-preview-stack {
  position: relative;
  /* slightly taller to show stack depth */
  padding: 10px 10px 0 10px;
  background: transparent;
}
/* Back cards */
.icn-stack-back {
  position: absolute;
  inset: 10px 10px 0 10px;
  border-radius: 6px;
  overflow: hidden;
  transform-origin: center bottom;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.icn-stack-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 6px;
}
/* Front card */
.icn-stack-front {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
}
.icn-stack-front > .icn-stack-img { border-radius: 6px; }
/* Count badge */
.icn-stack-count {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  color: white;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.15);
  pointer-events: none;
}
/* Regenerate icon button (top-right of stack) */
.icn-stack-regen {
  position: absolute;
  top: 8px;
  right: 48px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  backdrop-filter: blur(6px);
}
.icn-stack-front:hover .icn-stack-regen { opacity: 1; }
.icn-stack-regen:hover { background: rgba(0,0,0,0.8); color: white; }
/* Expand button (bottom-center of stack) */
.icn-stack-expand-btn {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: white;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity 0.15s, background 0.12s;
  white-space: nowrap;
}
.icn-stack-front:hover .icn-stack-expand-btn { opacity: 1; }
.icn-stack-expand-btn:hover { background: rgba(0,0,0,0.75); }

/* ─── Multi-image: expanded grid ─────────────────────────────────────────── */
.icn-preview-grid-mode {
  aspect-ratio: unset !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 0;
}
.icn-multi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  width: 100%;
}
.icn-multi-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
}
.icn-multi-item.is-main {
  outline: 2px solid var(--accent-color, #4f9eff);
  outline-offset: -2px;
}
.icn-multi-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Action overlay per image */
.icn-multi-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.icn-multi-item:hover .icn-multi-actions { opacity: 1; }
.icn-multi-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  color: white;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  backdrop-filter: blur(6px);
  white-space: nowrap;
  transition: background 0.12s;
}
.icn-multi-btn:hover { background: rgba(0,0,0,0.85); }
.icn-multi-btn-primary { background: rgba(79,158,255,0.75); border-color: rgba(79,158,255,0.5); }
.icn-multi-btn-primary:hover { background: rgba(79,158,255,0.95); }
/* Main image mark (bottom-left) */
.icn-multi-main-mark {
  position: absolute;
  bottom: 6px;
  left: 6px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 12px;
  font-size: 10px;
  color: #4f9eff;
  background: rgba(0,0,20,0.7);
  border: 1px solid rgba(79,158,255,0.4);
  pointer-events: none;
}

/* ─── Single-image regenerate overlay (hover) ────────────────────────────── */
.icn-regen-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0);
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  pointer-events: none;
}
.icn-preview:hover .icn-regen-overlay {
  opacity: 1;
  background: rgba(0,0,0,0.3);
  pointer-events: auto;
}
.icn-regen-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.25);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.12s;
}
.icn-regen-btn:hover { background: rgba(0,0,0,0.8); }

.icn-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 20;
}
.icn-loading-text { font-size: 12px; color: rgba(255,255,255,0.8); }

/* ─── Expandable input panel ──────────────────────────────────────────────── */
.icn-input-panel {
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

/* Panel slide-in transition */
.icn-panel-enter-active { transition: all 0.18s ease-out; }
.icn-panel-leave-active { transition: all 0.14s ease-in; }
.icn-panel-enter-from,
.icn-panel-leave-to { opacity: 0; transform: translateY(-4px); }

/* ─── Toolbar row (风格/标记/聚焦) ─────────────────────────────────────────── */
.icn-toolbar-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px 4px;
}
.icn-toolbar-spacer { flex: 1; }
.icn-tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 7px;
  font-size: 11px;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.icn-tool-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.icn-tool-btn.active { color: #f59e0b; background: rgba(245,158,11,0.1); }
.icn-tool-btn.icn-tool-icon { padding: 4px 5px; }

/* ─── Applied style badge ─────────────────────────────────────────────────── */
.icn-style-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 8px 4px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.25);
}
.icn-style-preview {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}
.icn-style-name { font-size: 11px; color: #f59e0b; flex: 1; }
.icn-style-remove {
  font-size: 13px;
  line-height: 1;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
}
.icn-style-remove:hover { opacity: 1; }

/* ─── Prompt textarea ─────────────────────────────────────────────────────── */
.icn-prompt {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  background: transparent;
  border: none;
  resize: none;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.icn-prompt::placeholder { color: var(--text-tertiary); }

/* ─── Tips ────────────────────────────────────────────────────────────────── */
.icn-tips {
  margin: 0 8px 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  border-radius: 6px;
}

/* ─── Connections indicator ───────────────────────────────────────────────── */
.icn-connections {
  display: flex;
  gap: 4px;
  padding: 0 8px 4px;
}
.icn-conn-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 20px;
}
.icn-conn-prompt { background: rgba(34,197,94,0.12); color: #22c55e; }
.icn-conn-ref { background: rgba(99,179,237,0.12); color: #63b3ed; }

/* ─── Bottom control bar ──────────────────────────────────────────────────── */
.icn-bottom-bar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 8px 8px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
  row-gap: 4px;
}
.icn-bar-spacer { flex: 1; }

.icn-ctrl-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 20px;
  font-size: 10.5px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.12s, color 0.12s;
}
.icn-ctrl-pill:hover { border-color: var(--accent-color); color: var(--text-primary); }
.icn-ctrl-pill.icn-pill-icon { padding: 3px 6px; }
.icn-aa { font-size: 10px; font-weight: 700; }

.icn-cost {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  color: var(--text-tertiary);
  padding: 3px 4px;
}

.icn-run-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-color);
  color: white;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, transform 0.1s;
}
.icn-run-btn:hover:not(:disabled) { background: var(--accent-hover); transform: scale(1.05); }
.icn-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Error ───────────────────────────────────────────────────────────────── */
.icn-error {
  margin: 0 8px 8px;
  padding: 5px 8px;
  font-size: 11px;
  color: #f87171;
  background: rgba(248,113,113,0.08);
  border-radius: 6px;
}

/* ─── Style Modal Overlay ─────────────────────────────────────────────────── */
.sm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}

/* ─── Style Modal ─────────────────────────────────────────────────────────── */
.sm-modal {
  width: 800px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.45);
}

.sm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.sm-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.sm-header-right { display: flex; align-items: center; gap: 10px; }
.sm-model-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.sm-sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: border-color 0.12s;
}
.sm-sort-btn:hover { border-color: var(--accent-color); color: var(--text-primary); }
.sm-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  cursor: pointer;
  transition: background 0.12s;
}
.sm-close:hover { background: var(--bg-tertiary); color: var(--text-primary); }

/* Category navigation */
.sm-category-nav {
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
  scrollbar-width: none;
}
.sm-category-nav::-webkit-scrollbar { display: none; }
.sm-cat-btn {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.sm-cat-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.sm-cat-btn.active {
  background: rgba(99,179,237,0.12);
  border-color: rgba(99,179,237,0.4);
  color: #63b3ed;
}

/* Sub nav: tabs + count */
.sm-sub-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  flex-shrink: 0;
}
.sm-tabs { display: flex; gap: 0; }
.sm-tab {
  padding: 4px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.12s;
}
.sm-tab:first-child { border-radius: 6px 0 0 6px; }
.sm-tab:last-child { border-radius: 0 6px 6px 0; border-left: none; }
.sm-tab:not(:first-child):not(:last-child) { border-left: none; }
.sm-tab.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}
.sm-count { font-size: 11px; color: var(--text-tertiary); }

/* Style grid body */
.sm-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px 16px;
}
.sm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

/* Style card */
.sm-card {
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s, border-color 0.12s, box-shadow 0.12s;
}
.sm-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
.sm-card.selected { border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(99,179,237,0.2); }

.sm-card-cover {
  position: relative;
  aspect-ratio: 2 / 3;
  width: 100%;
}
.sm-card-selected-mark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  color: white;
}
.sm-fav-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.4);
  color: rgba(255,255,255,0.7);
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
  backdrop-filter: blur(4px);
}
.sm-card:hover .sm-fav-btn { opacity: 1; }
.sm-fav-btn.active { opacity: 1; color: #f87171; }
.sm-fav-btn:hover { color: #f87171; }

.sm-card-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--bg-tertiary);
}
.sm-card-name { font-size: 11px; color: var(--text-primary); font-weight: 500; }
.sm-card-usage { font-size: 10px; color: var(--text-tertiary); }

/* Empty state */
.sm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: var(--text-tertiary);
  font-size: 13px;
}
.sm-empty-icon { opacity: 0.3; }
</style>
