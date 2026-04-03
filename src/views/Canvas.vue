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

    <!-- Main canvas area | Mac：触控板双指滑动平移；其它：滚轮缩放；空白处右键菜单 -->
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
        :pan-on-scroll="canvasWheelPan"
        :zoom-on-scroll="!canvasWheelPan"
        :zoom-on-pinch="true"
        :pan-on-drag="false"
        :selection-key-code="true"
        :zoom-on-double-click="false"
        :elevate-nodes-on-select="false"
        @connect="onConnect"
        @node-click="onNodeClick"
        @node-drag-start="onNodeDragStart"
        @pane-click="onPaneClick"
        @pane-context-menu="onPaneContextMenu"
        @viewport-change-end="handleViewportChange"
        @edges-change="onEdgesChange"
        class="canvas-flow"
      >
        <!-- zoom-pane 内仅渲染视觉层（全部 pointer-events:none），节点不被遮挡可自由拖出框外
             空白处选组通过 @pane-click 坐标检测实现；框的拖动通过顶部 strip 触发 -->
        <template #zoom-pane>
          <template v-for="g in canvasGroups" :key="g.id">
            <!-- 底色 + 边框：纯视觉，不拦截任何指针事件 -->
            <div
              data-group-chrome="1"
              data-group-frame="1"
              class="absolute rounded-xl border-2 border-dashed transition-shadow select-none pointer-events-none"
              :class="selectedGroupId === g.id ? 'border-[var(--accent-color)] shadow-md ring-1 ring-[var(--accent-color)]/30' : 'border-white/50 dark:border-white/25'"
              :style="groupFrameStyle(g)"
              aria-hidden="true"
            />
            <div
              data-group-chrome="1"
              class="absolute flex items-center justify-between gap-2 px-2 rounded-md bg-[var(--bg-secondary)]/95 border border-[var(--border-color)] shadow-sm text-[var(--text-primary)] hover:border-[var(--accent-color)]/50 cursor-grab active:cursor-grabbing select-none touch-none"
              :class="selectedGroupId === g.id ? 'ring-1 ring-[var(--accent-color)]/40' : ''"
              :style="groupStripStyle(g)"
              title="点击选中分组；拖动可同时平移打组框与组内节点"
              @pointerdown="onGroupChromePointerDown(g, $event)"
            >
              <span class="text-xs font-medium truncate">{{ g.label || `分组 · ${g.memberIds.length} 节点` }}</span>
              <span class="text-[10px] text-[var(--text-tertiary)] shrink-0">{{ selectedGroupId === g.id ? '已选' : '点我选分组' }}</span>
            </div>
            <div
              v-if="selectedGroupId === g.id"
              data-group-chrome="1"
              class="absolute flex flex-wrap items-center gap-0.5 p-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg"
              :style="groupToolbarStyle(g)"
              @pointerdown.stop
              @click.stop
            >
              <div class="flex items-center gap-0.5 shrink-0 pr-1 border-r border-[var(--border-color)]/60 mr-0.5" title="底色">
                <button
                  v-for="sw in groupFillSwatches"
                  :key="sw.key"
                  type="button"
                  class="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-[var(--border-color)] hover:ring-1 hover:ring-[var(--accent-color)]/40 transition-shadow"
                  :class="selectedGroupFillKey === sw.key ? 'ring-2 ring-[var(--accent-color)] ring-offset-1 ring-offset-[var(--bg-secondary)]' : ''"
                  @click="pickGroupFill(sw.key)"
                >
                  <span
                    v-if="sw.hex"
                    class="block w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/15"
                    :style="{ backgroundColor: sw.hex }"
                  />
                  <span v-else class="block w-3.5 h-3.5 rounded-full group-fill-swatch-none border border-dashed border-[var(--border-color)]" />
                </button>
              </div>
              <n-dropdown trigger="click" :options="groupLayoutDropdownOptions" @select="onGroupLayoutSelect">
                <n-button size="tiny" quaternary>排列</n-button>
              </n-dropdown>
              <n-button size="tiny" quaternary @click="openGroupExecuteModal">整组执行</n-button>
              <n-button size="tiny" quaternary @click="showToolboxNameModal = true">添加到工具箱</n-button>
              <n-button size="tiny" quaternary @click="ungroupSelected">解组</n-button>
              <n-button size="tiny" type="primary" @click="downloadSelectedGroup">批量下载</n-button>
              <n-button v-if="selectedGroupHasImageConfigs" size="tiny" type="info" @click="handleOpenBatchVideo">
                <template #icon><n-icon :size="12"><VideocamOutline /></n-icon></template>
                批量生成视频
              </n-button>
              <n-button
                v-if="selectedGroupVideosStitchable"
                size="tiny"
                type="success"
                :loading="isStitchingVideos"
                :disabled="isStitchingVideos"
                @click="handleAutoStitchVideos"
              >
                自动剪辑
              </n-button>
            </div>

            <!-- 批量生成视频设置：贴在分镜打组框下方（与画布同坐标系，随缩放平移） -->
            <Transition name="bv-panel">
              <div
                v-if="selectedGroupId === g.id && showBatchVideoPanel && selectedGroupHasImageConfigs"
                data-group-chrome="1"
                class="absolute bv-panel bv-panel--anchored"
                :style="groupBatchVideoPanelStyle(g)"
                @pointerdown.stop
                @click.stop
              >
                <div class="bv-settings">
                  <div class="bv-section">
                    <span class="bv-section-title">比例</span>
                    <div class="bv-option-row">
                      <button v-for="r in bvRatioList" :key="r" type="button" class="bv-option-btn" :class="{ active: bvRatio === r }" @click="bvRatio = r">
                        <span class="bv-ratio-icon" :class="`ratio-${r.replace(':', 'x')}`"></span>
                        {{ r }}
                      </button>
                    </div>
                  </div>
                  <div class="bv-section">
                    <span class="bv-section-title">生成音频</span>
                    <div class="bv-option-row">
                      <button type="button" class="bv-option-btn" :class="{ active: bvAudio }" @click="bvAudio = true">开启</button>
                      <button type="button" class="bv-option-btn" :class="{ active: !bvAudio }" @click="bvAudio = false">关闭</button>
                    </div>
                  </div>
                  <div class="bv-section">
                    <span class="bv-section-title">时长</span>
                    <div class="bv-option-row">
                      <button v-for="d in bvDurList" :key="d.key" type="button" class="bv-option-btn" :class="{ active: bvDuration === d.key }" @click="bvDuration = d.key">{{ d.label }}</button>
                    </div>
                  </div>
                  <div class="bv-section">
                    <span class="bv-section-title">生成品质</span>
                    <div class="bv-option-row">
                      <button v-for="res in bvResolutionList" :key="res" type="button" class="bv-option-btn" :class="{ active: bvResolution === res }" @click="bvResolution = res">{{ res === '480p' ? '标准' : res === '720p' ? '高清' : '超清' }}</button>
                    </div>
                  </div>
                </div>
                <div class="bv-bottom-bar">
                  <button type="button" class="bv-close-btn" @click="handleCloseBatchVideo">✕</button>
                  <n-dropdown :options="bvModelOptions" @select="onBvModelSelect" trigger="click">
                    <button type="button" class="bv-model-btn">
                      <n-icon :size="12"><VideocamOutline /></n-icon>
                      {{ bvDisplayModel }}
                      <n-icon :size="10"><ChevronDownOutline /></n-icon>
                    </button>
                  </n-dropdown>
                  <span class="bv-summary">
                    {{ bvRatio }} · {{ bvResolution === '480p' ? '标准' : bvResolution === '720p' ? '高清' : '超清' }} · {{ bvDuration }}s ·
                    <n-icon :size="11"><component :is="bvAudio ? VolumeHighOutline : VolumeMuteOutline" /></n-icon>
                  </span>
                  <span class="bv-scene-count">全部 {{ bvSceneCount }} 个分镜</span>
                  <button type="button" class="bv-generate-btn" :disabled="isGeneratingVideos || !bvSceneCount" @click="handleBatchGenerateVideos">
                    <n-spin v-if="isGeneratingVideos" :size="14" />
                    <template v-else>⚡ {{ bvCreditCost }} 生成视频</template>
                  </button>
                </div>
              </div>
            </Transition>

            <!-- 整组执行（分镜图）：与批量视频同锚定面板，可勾选节点并统一生图参数 -->
            <Transition name="bv-panel">
              <div
                v-if="selectedGroupId === g.id && showBatchImageExecutePanel && selectedGroupHasImageConfigs"
                data-group-chrome="1"
                class="absolute bv-panel bv-panel--anchored bv-panel--image-batch"
                :style="groupBatchImagePanelStyle(g)"
                @pointerdown.stop
                @click.stop
              >
                <div class="bv-settings">
                  <div class="bv-section">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <span class="bv-section-title">分镜图</span>
                      <div class="flex items-center gap-2">
                        <button type="button" class="bi-link-btn" @click="biSelectAllScenes">全选</button>
                        <button type="button" class="bi-link-btn" @click="biSelectNoScenes">全不选</button>
                      </div>
                    </div>
                    <div class="bi-scene-check-list">
                      <div
                        v-for="(sn, idx) in selectedGroupImageNodes"
                        :key="sn.id"
                        class="bi-scene-check-row"
                        role="button"
                        tabindex="0"
                        @click="toggleBatchImageScene(sn.id)"
                        @keydown.enter.prevent="toggleBatchImageScene(sn.id)"
                        @keydown.space.prevent="toggleBatchImageScene(sn.id)"
                      >
                        <span class="bi-scene-check-hit" @click.stop>
                          <n-checkbox
                            :checked="!!batchImageSelectedMap[sn.id]"
                            @update:checked="(v) => { batchImageSelectedMap[sn.id] = v }"
                          />
                        </span>
                        <span class="bi-scene-label">{{ sn.data?.label || `分镜 #${idx + 1}` }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="biQualityList.length" class="bv-section">
                    <span class="bv-section-title">画质</span>
                    <div class="bv-option-row flex-wrap">
                      <button
                        v-for="q in biQualityList"
                        :key="q.key"
                        type="button"
                        class="bv-option-btn"
                        :class="{ active: bgImageQuality === q.key }"
                        @click="bgImageQuality = q.key"
                      >
                        {{ q.label }}
                      </button>
                    </div>
                  </div>
                  <div class="bv-section">
                    <span class="bv-section-title">尺寸</span>
                    <div class="bv-option-row flex-wrap">
                      <button
                        v-for="s in biSizeList"
                        :key="s.key"
                        type="button"
                        class="bv-option-btn"
                        :class="{ active: bgImageSize === s.key }"
                        @click="bgImageSize = s.key"
                      >
                        {{ s.label }}
                      </button>
                    </div>
                  </div>
                  <div class="bv-section">
                    <span class="bv-section-title">单次张数</span>
                    <div class="bv-option-row">
                      <button
                        v-for="c in biCountOptions"
                        :key="c.key"
                        type="button"
                        class="bv-option-btn"
                        :class="{ active: bgImageCount === c.key }"
                        @click="bgImageCount = c.key"
                      >
                        {{ c.label }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="bv-bottom-bar">
                  <button type="button" class="bv-close-btn" @click="handleCloseBatchImageExecute">✕</button>
                  <n-dropdown
                    scrollable
                    :menu-props="biModelDropdownMenuProps"
                    :options="biModelOptions"
                    @select="onBiModelSelect"
                    trigger="click"
                  >
                    <button type="button" class="bv-model-btn">
                      <n-icon :size="12"><ImageOutline /></n-icon>
                      {{ biDisplayModel }}
                      <n-icon :size="10"><ChevronDownOutline /></n-icon>
                    </button>
                  </n-dropdown>
                  <span class="bv-summary">
                    {{ biSizeShortLabel }} · {{ biQualityShortLabel }} · {{ bgImageCount }} 张
                  </span>
                  <span class="bv-scene-count">已选 {{ biSelectedCount }} / {{ selectedGroupImageNodes.length }} 个分镜</span>
                  <button
                    type="button"
                    class="bv-generate-btn"
                    :disabled="isGroupExecuting || biSelectedCount === 0"
                    @click="confirmBatchImageGroupExecute"
                  >
                    <n-spin v-if="isGroupExecuting" :size="14" />
                    <template v-else>⚡ {{ biCreditCost }} 执行生图</template>
                  </button>
                </div>
                <div v-if="isGroupExecuting" class="bi-progress-wrap">
                  <n-progress type="line" :percentage="groupExecuteProgress" :show-indicator="false" color="#f59e0b" rail-color="rgba(245,158,11,0.15)" />
                  <p class="bi-progress-hint">并行执行中… {{ groupExecuteProgress }}%</p>
                </div>
              </div>
            </Transition>
          </template>
        </template>
        <Background v-if="showGrid" :gap="20" :size="1" />
        <MiniMap 
          v-if="!isMobile"
          position="bottom-right"
          :pannable="true"
          :zoomable="true"
        />
      </VueFlow>

      <!-- 画布空白处右键菜单 | Pane context menu -->
      <Teleport to="body">
        <div
          v-if="paneContextMenuOpen"
          ref="paneContextMenuRef"
          class="fixed z-[5000] min-w-[160px] py-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl text-[var(--text-primary)]"
          :style="{ left: paneMenuX + 'px', top: paneMenuY + 'px' }"
          role="menu"
          @click.stop
        >
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
            @click="paneMenuFitView"
          >
            适应视图
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
            @click="paneMenuZoomIn"
          >
            放大
          </button>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
            @click="paneMenuZoomOut"
          >
            缩小
          </button>
        </div>
      </Teleport>

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
      <aside class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-[200] pointer-events-auto">
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
        class="absolute left-20 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-[210] pointer-events-auto"
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
        <span
          class="text-[10px] text-[var(--text-tertiary)] px-1 max-w-[280px] leading-tight hidden sm:inline"
          title="平移/缩放画布"
        >
          {{ canvasWheelPan ? '双指滑动平移；⌃+滚轮或捏合缩放；右键菜单；左键拖框' : '滚轮缩放；右键菜单；左键拖框多选' }}
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
      <p class="text-sm text-[var(--text-secondary)] mb-2">将并行触发组内文生图、视频、LLM 配置节点的生成，确认后开始执行。</p>
      <n-input v-model:value="groupExecutePromptNote" type="textarea" placeholder="可选：整组提示说明（将记入本次操作，暂不自动注入各节点）" :rows="3" class="mb-3" />
      <ol class="text-sm list-decimal pl-5 space-y-1 max-h-48 overflow-y-auto">
        <li v-for="nid in groupExecuteOrder" :key="nid">
          {{ nodeLabelForId(nid) }} <span class="text-[var(--text-tertiary)]">({{ nid }})</span>
        </li>
      </ol>
      <div v-if="isGroupExecuting" class="mt-3 space-y-1">
        <n-progress type="line" :percentage="groupExecuteProgress" :show-indicator="false" color="#f59e0b" rail-color="rgba(245,158,11,0.15)" />
        <p class="text-xs text-[var(--text-tertiary)]">并行执行中… {{ groupExecuteProgress }}%</p>
      </div>
      <template #footer>
        <n-button :disabled="isGroupExecuting" @click="showGroupExecuteModal = false">取消</n-button>
        <n-button type="primary" :loading="isGroupExecuting" :disabled="isGroupExecuting" @click="confirmGroupExecute">确认执行</n-button>
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
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { NIcon, NSwitch, NDropdown, NMessageProvider, NSpin, NModal, NInput, NButton, NProgress, NCheckbox } from 'naive-ui'
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
  ChatbubbleOutline,
  DocumentTextOutline,
  VolumeHighOutline,
  VolumeMuteOutline
} from '@vicons/ionicons5'
import { nodes, edges, addNode, addNodes, addEdge, addEdges, updateNode, initSampleData, loadProject, saveProject, clearCanvas, canvasViewport, updateViewport, undo, redo, canUndo, canRedo, manualSaveHistory, startBatchOperation, endBatchOperation, duplicateNodes, canvasGroups, addCanvasGroup, removeCanvasGroup, updateCanvasGroup, layoutGroupMembers, computeGroupBounds, applyCanvasGroupFrameDelta, currentProjectId } from '../stores/canvas'
import { patchVideoNodeFromRemoteUrl } from '@/utils/applyVideoNodeCache'
import {
  resolveVideoI2vPrompt,
  resolveSceneForStoryboardImageNode,
  pickStoryboardImageUrlFromNode,
  resolveI2vFirstFrameFromStoryboardGroup
} from '@/utils/storyboardVideoPrompt'
import { findScriptScenesForGroup } from '@/utils/storyboardGroupScenes'
import { loadAllModels, getModelSizeOptions, getModelQualityOptions, getModelConfig } from '../stores/models'
import { useChat, useVideoGeneration, useWorkflowOrchestrator, CANVAS_GROUP_NODE_EXECUTE_EVENT } from '../hooks'
import { VIDEO_MODELS, SEEDANCE_RESOLUTION_OPTIONS, DEFAULT_VIDEO_MODEL, DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_SIZE } from '../config/models'
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
import ScriptNode from '../components/nodes/ScriptNode.vue'
import GroupProxyNode from '../components/nodes/GroupProxyNode.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ImageOrderEdge from '../components/edges/ImageOrderEdge.vue'

const router = useRouter()
const route = useRoute()

// Vue Flow instance | Vue Flow 实例
const {
  viewport,
  zoomIn,
  zoomOut,
  fitView,
  updateNodeInternals,
  screenToFlowCoordinate,
  removeSelectedElements,
  setPaneClickDistance
} = useVueFlow()

/** 与 Vue Flow 内部 nodeLookup 选中态同步；仅改 nodes 数组易导致「点空白无效、拖一下才好」 */
function clearVueFlowSelection () {
  removeSelectedElements()
}

/** Apple 平台启用触控板双指滑动平移（pan-on-scroll）；Windows 等仍用滚轮缩放（zoom-on-scroll）| Trackpad pan on Mac */
const canvasWheelPan = ref(false)

/** 空白画布右键菜单 | Pane context menu */
const paneContextMenuOpen = ref(false)
const paneMenuX = ref(0)
const paneMenuY = ref(0)
const paneContextMenuRef = ref(null)
let unbindPaneMenuDismiss = null

function closePaneContextMenu() {
  paneContextMenuOpen.value = false
  if (unbindPaneMenuDismiss) {
    unbindPaneMenuDismiss()
    unbindPaneMenuDismiss = null
  }
}

function openPaneContextMenu(clientX, clientY) {
  closePaneContextMenu()
  const w = 168
  const h = 132
  paneMenuX.value = Math.max(8, Math.min(clientX, (typeof window !== 'undefined' ? window.innerWidth : clientX + w) - w))
  paneMenuY.value = Math.max(8, Math.min(clientY, (typeof window !== 'undefined' ? window.innerHeight : clientY + h) - h))
  paneContextMenuOpen.value = true
  nextTick(() => {
    const dismiss = (ev) => {
      if (ev.type === 'keydown') {
        if (ev.key === 'Escape') closePaneContextMenu()
        return
      }
      const el = paneContextMenuRef.value
      if (el && ev.target && el.contains(ev.target)) return
      closePaneContextMenu()
    }
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('keydown', dismiss, true)
    unbindPaneMenuDismiss = () => {
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('keydown', dismiss, true)
      unbindPaneMenuDismiss = null
    }
  })
}

const onPaneContextMenu = (event) => {
  event.preventDefault()
  openPaneContextMenu(event.clientX, event.clientY)
}

const paneMenuFitView = () => {
  closePaneContextMenu()
  void fitView({ padding: 0.2 })
}

const paneMenuZoomIn = () => {
  closePaneContextMenu()
  void zoomIn()
}

const paneMenuZoomOut = () => {
  closePaneContextMenu()
  void zoomOut()
}

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  text: markRaw(TextNode),
  imageConfig: markRaw(ImageConfigNode),
  video: markRaw(VideoNode),
  image: markRaw(ImageNode),
  videoConfig: markRaw(VideoConfigNode),
  llmConfig: markRaw(LLMConfigNode),
  script: markRaw(ScriptNode),
  groupProxy: markRaw(GroupProxyNode)
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
const isGroupExecuting = ref(false)
const groupExecuteProgress = ref(0)
const GROUP_EXECUTE_TIMEOUT_MS = 600_000
const GROUP_EXECUTABLE_TYPES = ['imageConfig', 'videoConfig', 'llmConfig']
const showToolboxNameModal = ref(false)
const toolboxNameInput = ref('')
const TOOLBOX_STORAGE_KEY = 'shanchuang-space-toolbox'

const GROUP_FILL_BG = {
  none: 'transparent',
  c1: 'rgba(59, 130, 246, 0.14)',
  c2: 'rgba(168, 85, 247, 0.14)',
  c3: 'rgba(34, 197, 94, 0.14)',
  c4: 'rgba(245, 158, 11, 0.14)',
  c5: 'rgba(236, 72, 153, 0.14)',
  c6: 'rgba(20, 184, 166, 0.14)'
}

const groupFillSwatches = [
  { key: 'none' },
  { key: 'c1', hex: '#3b82f6' },
  { key: 'c2', hex: '#a855f7' },
  { key: 'c3', hex: '#22c55e' },
  { key: 'c4', hex: '#f59e0b' },
  { key: 'c5', hex: '#ec4899' },
  { key: 'c6', hex: '#14b8a6' }
]

const selectedGroupFillKey = computed(() => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  const k = g?.fillKey
  return k && GROUP_FILL_BG[k] !== undefined ? k : 'c1'
})

const groupLayoutDropdownOptions = [
  { label: '宫格排列', key: 'grid' },
  { label: '水平排列', key: 'horizontal' }
]

const groupFillBackground = (key) => GROUP_FILL_BG[key] || GROUP_FILL_BG.c1

const STRIP_H = 28
const GAP_ABOVE_FRAME = 6
const GAP_TOOLBAR_STRIP = 6

/** 打组固定矩形（持久化 frame）；缺省时回退推算（兼容旧数据）| Fixed group frame rect */
const groupFrameRect = (g) => {
  const f = g.frame
  if (
    f &&
    typeof f.x === 'number' &&
    typeof f.y === 'number' &&
    typeof f.width === 'number' &&
    f.width > 0 &&
    typeof f.height === 'number' &&
    f.height > 0
  ) {
    return { x: f.x, y: f.y, width: f.width, height: f.height }
  }
  return computeGroupBounds(g.memberIds, nodes.value)
}

/** 打组底色 + 边框：纯视觉层，pointer-events:none，节点可在其上自由拖拽 | Visual only */
const groupFrameStyle = (g) => {
  const { x, y, width, height } = groupFrameRect(g)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: groupFillBackground(g.fillKey),
    zIndex: 1
  }
}

/** 打组顶栏：贴在框上沿之上；点击选中，拖动平移整个固定框 | Strip: select / drag frame */
const groupStripStyle = (g) => {
  const b = groupFrameRect(g)
  return {
    left: `${b.x}px`,
    top: `${b.y - GAP_ABOVE_FRAME}px`,
    width: `${b.width}px`,
    height: `${STRIP_H}px`,
    transform: 'translateY(-100%)',
    zIndex: 250,
    pointerEvents: 'auto'
  }
}

/** 工具栏在顶栏之上，避免压在半透明框内挡操作 | Toolbar above strip */
const groupToolbarStyle = (g) => {
  const b = groupFrameRect(g)
  const anchorY = b.y - GAP_ABOVE_FRAME - STRIP_H - GAP_TOOLBAR_STRIP
  return {
    left: `${b.x}px`,
    top: `${anchorY}px`,
    transform: 'translateY(-100%)',
    zIndex: 260,
    maxWidth: `${Math.min(Math.max(b.width, 220), 560)}px`,
    pointerEvents: 'auto'
  }
}

/** 批量视频设置面板：贴在打组框下沿下方（画布坐标，随视口缩放） */
const GAP_BATCH_PANEL_BELOW = 8
const groupBatchVideoPanelStyle = (g) => {
  const b = groupFrameRect(g)
  const w = Math.min(820, Math.max(b.width, 300))
  return {
    left: `${b.x}px`,
    top: `${b.y + b.height + GAP_BATCH_PANEL_BELOW}px`,
    width: `${w}px`,
    zIndex: 270,
    pointerEvents: 'auto'
  }
}

/** 整组执行（分镜图）面板：略加宽以容纳勾选列表 | Batch image group execute */
const groupBatchImagePanelStyle = (g) => {
  const b = groupFrameRect(g)
  const w = Math.min(920, Math.max(b.width, 320))
  return {
    left: `${b.x}px`,
    top: `${b.y + b.height + GAP_BATCH_PANEL_BELOW}px`,
    width: `${w}px`,
    zIndex: 271,
    pointerEvents: 'auto'
  }
}

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
  clearVueFlowSelection()
}

/** 顶栏或底框空白拖拽移动打组（流坐标增量，松手后 manualSaveHistory）| Drag via strip or frame */
let groupChromeDrag = null

const detachGroupChromeDragListeners = () => {
  window.removeEventListener('pointermove', onGroupChromePointerMove)
  window.removeEventListener('pointerup', endGroupChromeDrag, true)
  window.removeEventListener('pointercancel', endGroupChromeDrag, true)
}

const endGroupChromeDrag = () => {
  if (!groupChromeDrag) return
  const { groupId, moved } = groupChromeDrag
  groupChromeDrag = null
  detachGroupChromeDragListeners()
  if (moved) {
    manualSaveHistory()
  } else {
    selectGroup(groupId)
  }
}

/** 路由离开等：只收尾监听与历史，不触发选中 | Unmount cleanup */
const abortGroupChromeDrag = () => {
  if (!groupChromeDrag) {
    detachGroupChromeDragListeners()
    return
  }
  const { moved } = groupChromeDrag
  groupChromeDrag = null
  detachGroupChromeDragListeners()
  if (moved) manualSaveHistory()
}

const onGroupChromePointerMove = (e) => {
  if (!groupChromeDrag) return
  const p = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  const dx = p.x - groupChromeDrag.lastX
  const dy = p.y - groupChromeDrag.lastY
  groupChromeDrag.lastX = p.x
  groupChromeDrag.lastY = p.y
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return
  groupChromeDrag.moved = true
  applyCanvasGroupFrameDelta(groupChromeDrag.groupId, dx, dy)
  const grp = canvasGroups.value.find((x) => x.id === groupChromeDrag.groupId)
  if (grp?.memberIds?.length) {
    updateNodeInternals(grp.memberIds)
  }
}

const onGroupChromePointerDown = (g, e) => {
  if (e.button !== 0) return
  e.stopPropagation()
  if (!g.frame) return
  const p = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  groupChromeDrag = {
    groupId: g.id,
    lastX: p.x,
    lastY: p.y,
    moved: false
  }
  window.addEventListener('pointermove', onGroupChromePointerMove)
  window.addEventListener('pointerup', endGroupChromeDrag, true)
  window.addEventListener('pointercancel', endGroupChromeDrag, true)
}

const pickGroupFill = (key) => {
  if (!selectedGroupId.value) return
  const k = typeof key === 'object' && key != null && 'key' in key ? key.key : key
  updateCanvasGroup(selectedGroupId.value, { fillKey: k })
}

function requestGroupNodeExecute (nodeId) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error('节点执行超时'))
    }, GROUP_EXECUTE_TIMEOUT_MS)
    const wrap = (fn) => (val) => {
      clearTimeout(t)
      fn(val)
    }
    window.dispatchEvent(new CustomEvent(CANVAS_GROUP_NODE_EXECUTE_EVENT, {
      detail: {
        nodeId,
        resolve: wrap(resolve),
        reject: wrap(reject)
      }
    }))
  })
}

const confirmGroupExecute = async () => {
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }
  const order = groupExecuteOrder.value
  const executable = order.filter((id) => {
    const n = nodes.value.find(x => x.id === id)
    return n && GROUP_EXECUTABLE_TYPES.includes(n.type)
  })
  if (executable.length === 0) {
    window.$message?.warning('当前顺序中没有可自动执行的配置节点（文生图 / 视频 / LLM）')
    return
  }
  await runGroupExecuteForNodeIds(executable, { closeModalOnSuccess: true })
}

/** 并行整组执行指定节点 id 列表（进度条与 isGroupExecuting 共用） */
const runGroupExecuteForNodeIds = async (executable, { closeModalOnSuccess = false, closeBatchImagePanelOnSuccess = false } = {}) => {
  if (!executable.length) return
  isGroupExecuting.value = true
  groupExecuteProgress.value = 0
  let completed = 0

  const results = await Promise.allSettled(
    executable.map(nodeId =>
      requestGroupNodeExecute(nodeId).then(() => {
        completed++
        groupExecuteProgress.value = Math.round((completed / executable.length) * 100)
      })
    )
  )

  isGroupExecuting.value = false
  const failedCount = results.filter(r => r.status === 'rejected').length
  if (!failedCount) {
    window.$message?.success('整组执行已完成')
    if (closeModalOnSuccess) showGroupExecuteModal.value = false
    if (closeBatchImagePanelOnSuccess) showBatchImageExecutePanel.value = false
  } else {
    window.$message?.warning(`${executable.length - failedCount}/${executable.length} 个节点执行完成，${failedCount} 个失败`)
  }
  groupExecuteProgress.value = 0
}

const onGroupLayoutSelect = (key) => {
  if (!selectedGroupId.value) return
  const k = typeof key === 'object' && key != null && 'key' in key ? key.key : key
  layoutGroupMembers(selectedGroupId.value, k === 'horizontal' ? 'horizontal' : 'grid')
}

const ungroupSelected = () => {
  if (!selectedGroupId.value) return
  removeCanvasGroup(selectedGroupId.value)
  selectedGroupId.value = null
}

/** 选中打组框时按 Delete/Backspace 删除全部成员节点与组 */
const deleteSelectedGroup = () => {
  if (!selectedGroupId.value) return
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return
  const memberSet = new Set(g.memberIds)
  nodes.value = nodes.value.filter(n => !memberSet.has(n.id))
  edges.value = edges.value.filter(e => !memberSet.has(e.source) && !memberSet.has(e.target))
  removeCanvasGroup(selectedGroupId.value)
  selectedGroupId.value = null
  manualSaveHistory()
}

const isTypingInFocusedField = () => {
  const tag = document.activeElement?.tagName?.toLowerCase()
  return tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable
}

/** 画布快捷键：撤销/重做（与 store undo/redo 一致）；输入框内不触发 */
const handleCanvasGlobalKeydown = (e) => {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'z') {
    if (isTypingInFocusedField()) return
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
    return
  }
  if (mod && (e.key === 'y' || e.key === 'Y')) {
    if (isTypingInFocusedField()) return
    e.preventDefault()
    redo()
    return
  }
  if (!selectedGroupId.value) return
  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  if (isTypingInFocusedField()) return
  e.preventDefault()
  deleteSelectedGroup()
}

const downloadSelectedGroup = async () => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return
  const list = nodes.value.filter(n =>
    g.memberIds.includes(n.id) && (n.type === 'image' || n.type === 'video') && n.data?.url
  )
  if (list.length === 0) {
    window.$message?.info('组内没有可下载的图片/视频链接')
    return
  }

  const { downloadUrlToFile, downloadManyNodesMedia, buildMediaDownloadName } = await import('../utils/mediaDownload.js')

  if (list.length === 1) {
    try {
      await downloadUrlToFile(list[0].data.url, buildMediaDownloadName(list[0], 0))
      window.$message?.success('已开始下载文件')
    } catch {
      window.$message?.warning('无法跨域拉取文件，已打开原链接，请在播放页中「另存为」')
      window.open(list[0].data.url, '_blank', 'noopener,noreferrer')
    }
    return
  }

  window.$message?.info('正在拉取组内文件并打包为 zip，体积大时请耐心等待…')
  try {
    const { zipGroupMediaNodes } = await import('../utils/groupZipDownload.js')
    const { blob, fileName, embedded, linkOnly } = await zipGroupMediaNodes(list, g.label)
    if (embedded === 0 && linkOnly > 0) {
      window.$message?.warning('无法打包（多为跨域限制），改为逐个下载视频/图片文件…')
      const { ok, opened } = await downloadManyNodesMedia(list)
      window.$message?.success(
        `已触发 ${ok} 个文件下载${opened ? `；另有 ${opened} 个已打开链接需手动保存` : ''}`
      )
      return
    }
    const a = document.createElement('a')
    const href = URL.createObjectURL(blob)
    a.href = href
    a.download = fileName
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(href)
    let msg = embedded
      ? `已下载压缩包（内含 ${embedded} 个文件）`
      : '已下载压缩包'
    if (linkOnly) {
      msg += `；另有 ${linkOnly} 个因跨域仅含链接 txt`
    }
    window.$message?.success(msg)
  } catch (e) {
    window.$message?.error('下载失败：' + (e?.message || e))
  }
}

// ── Batch video generation (group toolbar) ───────────────────────────
const { createVideoTaskOnly } = useVideoGeneration()

const showBatchVideoPanel = ref(false)
const showBatchImageExecutePanel = ref(false)
const isGeneratingVideos = ref(false)
const isStitchingVideos = ref(false)

watch(selectedGroupId, () => {
  showBatchVideoPanel.value = false
  showBatchImageExecutePanel.value = false
})
const bvModel = ref(DEFAULT_VIDEO_MODEL)
const bvRatio = ref('16:9')
const bvResolution = ref('720p')
const bvDuration = ref(5)
const bvAudio = ref(true)

const selectedGroupHasImageConfigs = computed(() => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return false
  return g.memberIds.some(mid => {
    const n = nodes.value.find(x => x.id === mid)
    return n?.type === 'imageConfig'
  })
})

const selectedGroupImageNodes = computed(() => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return []
  return g.memberIds
    .map(mid => nodes.value.find(n => n.id === mid))
    .filter(n => n?.type === 'imageConfig')
    .sort((a, b) => {
      const rowA = Math.floor(a.position.y / 200)
      const rowB = Math.floor(b.position.y / 200)
      if (rowA !== rowB) return rowA - rowB
      return a.position.x - b.position.x
    })
})

const bvModelOptions = computed(() =>
  VIDEO_MODELS
    .filter(m => m.type === 'i2v' || m.type === 't2v+i2v')
    .map(m => ({ label: m.label, key: m.key }))
)
const bvDisplayModel = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.label?.replace(/\(.*\)/, '').trim() || bvModel.value
})
const bvRatioList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.ratios || ['16:9', '1:1', '9:16']
})
const bvResolutionList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.resolutions || SEEDANCE_RESOLUTION_OPTIONS.map(r => r.key)
})
const bvDurList = computed(() => {
  const m = VIDEO_MODELS.find(x => x.key === bvModel.value)
  return m?.durs || [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }]
})
const bvSceneCount = computed(() => selectedGroupImageNodes.value.length)

/** 分镜图整组执行：勾选 + 统一生图参数（面板形态对齐批量视频） */
const batchImageSelectedMap = reactive({})
const bgImageModel = ref(DEFAULT_IMAGE_MODEL)
const bgImageSize = ref(DEFAULT_IMAGE_SIZE)
const bgImageQuality = ref('standard')
const bgImageCount = ref(1)

const biCountOptions = [
  { label: '1 张', key: 1 },
  { label: '2 张', key: 2 },
  { label: '4 张', key: 4 }
]

/** 分镜批量：默认优先 16:9 横版（与 PRD 一致） */
function pickPreferredStoryboardImageSizeKey (sizeOptions) {
  if (!sizeOptions?.length) return null
  const labelHit = sizeOptions.find((o) => /16\s*:\s*9/i.test(String(o.label || '')))
  if (labelHit) return labelHit.key
  const keyHit = sizeOptions.find((o) => {
    const k = String(o.key || '')
    return (
      k === '16x9' ||
      /^2560x1440$/i.test(k) ||
      /^1920x1080$/i.test(k) ||
      /^3840x2160$/i.test(k) ||
      /^5404x3040$/i.test(k)
    )
  })
  return keyHit ? keyHit.key : null
}

const toggleBatchImageScene = (id) => {
  batchImageSelectedMap[id] = !batchImageSelectedMap[id]
}

/** 模型选项过多时可滚动，避免选不到底部项 */
const biModelDropdownMenuProps = () => ({
  style: { maxHeight: 'min(360px, 55vh)' }
})

const syncBatchImageSelectionAllChecked = () => {
  Object.keys(batchImageSelectedMap).forEach((k) => delete batchImageSelectedMap[k])
  selectedGroupImageNodes.value.forEach((n) => {
    batchImageSelectedMap[n.id] = true
  })
}

const initBatchImageParamsFromGroup = () => {
  const first = selectedGroupImageNodes.value[0]
  const d = first?.data
  bgImageModel.value = d?.model || modelStore.selectedImageModel || DEFAULT_IMAGE_MODEL
  bgImageQuality.value = d?.quality || getModelConfig(bgImageModel.value)?.defaultParams?.quality || 'standard'
  bgImageCount.value = d?.count != null ? d.count : 1
  const sizes = getModelSizeOptions(bgImageModel.value, bgImageQuality.value)
  const preferred = pickPreferredStoryboardImageSizeKey(sizes)
  const cfgDefault = getModelConfig(bgImageModel.value)?.defaultParams?.size
  if (d?.size && sizes.some((o) => o.key === d.size)) {
    bgImageSize.value = d.size
  } else if (preferred) {
    bgImageSize.value = preferred
  } else if (cfgDefault && sizes.some((o) => o.key === cfgDefault)) {
    bgImageSize.value = cfgDefault
  } else if (sizes.length) {
    bgImageSize.value = sizes[Math.min(4, sizes.length - 1)]?.key || sizes[0].key
  } else {
    bgImageSize.value = DEFAULT_IMAGE_SIZE
  }
}

const openGroupExecuteModal = () => {
  const g = canvasGroups.value.find((x) => x.id === selectedGroupId.value)
  if (!g) return
  groupExecuteOrder.value = topoSortMembers(g.memberIds, edges.value)
  const hasImg = g.memberIds.some((mid) => nodes.value.find((x) => x.id === mid)?.type === 'imageConfig')
  if (hasImg) {
    showBatchVideoPanel.value = false
    showBatchImageExecutePanel.value = true
    syncBatchImageSelectionAllChecked()
    initBatchImageParamsFromGroup()
    return
  }
  showGroupExecuteModal.value = true
}

const biModelOptions = computed(() =>
  (modelStore.allImageModelOptions || []).map((m) => ({ label: m.label, key: m.key }))
)
const biDisplayModel = computed(() => {
  const m = modelStore.allImageModelOptions?.find((x) => x.key === bgImageModel.value)
  return m?.label?.replace(/\(.*\)/, '').trim() || bgImageModel.value
})
const biQualityList = computed(() => getModelQualityOptions(bgImageModel.value))
const biSizeList = computed(() => getModelSizeOptions(bgImageModel.value, bgImageQuality.value))
const biSelectedCount = computed(() =>
  selectedGroupImageNodes.value.filter((n) => batchImageSelectedMap[n.id]).length
)
const biSizeShortLabel = computed(() => {
  const o = biSizeList.value.find((x) => x.key === bgImageSize.value)
  return o?.label || bgImageSize.value
})
const biQualityShortLabel = computed(() => {
  const o = biQualityList.value.find((x) => x.key === bgImageQuality.value)
  if (o?.label) return o.label
  return bgImageQuality.value === '4k' ? '4K' : '标准'
})
const biCreditCost = computed(() => {
  const base = bgImageQuality.value === '4k' ? 24 : 12
  return base * biSelectedCount.value * (bgImageCount.value || 1)
})

watch(bgImageQuality, () => {
  const sizes = getModelSizeOptions(bgImageModel.value, bgImageQuality.value)
  if (sizes.length && !sizes.some((o) => o.key === bgImageSize.value)) {
    bgImageSize.value =
      pickPreferredStoryboardImageSizeKey(sizes) ||
      sizes[Math.min(4, sizes.length - 1)]?.key ||
      sizes[0].key
  }
})

const onBiModelSelect = (key) => {
  bgImageModel.value = key
  const config = getModelConfig(key)
  if (config?.defaultParams?.quality) bgImageQuality.value = config.defaultParams.quality
  const sizes = getModelSizeOptions(key, bgImageQuality.value)
  if (config?.defaultParams?.size && sizes.some((o) => o.key === config.defaultParams.size)) {
    bgImageSize.value = config.defaultParams.size
  } else if (sizes.length) {
    const preferred = pickPreferredStoryboardImageSizeKey(sizes)
    if (preferred && sizes.some((o) => o.key === preferred)) {
      bgImageSize.value = preferred
    } else {
      const pick =
        sizes.find((o) => o.key === '2048x2048') ||
        sizes[Math.min(4, sizes.length - 1)] ||
        sizes[0]
      bgImageSize.value = pick.key
    }
  }
}

const biSelectAllScenes = () => {
  selectedGroupImageNodes.value.forEach((n) => {
    batchImageSelectedMap[n.id] = true
  })
}

const biSelectNoScenes = () => {
  selectedGroupImageNodes.value.forEach((n) => {
    batchImageSelectedMap[n.id] = false
  })
}

const handleCloseBatchImageExecute = () => {
  showBatchImageExecutePanel.value = false
}

const confirmBatchImageGroupExecute = async () => {
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }
  const selectedSet = new Set(
    selectedGroupImageNodes.value.filter((n) => batchImageSelectedMap[n.id]).map((n) => n.id)
  )
  if (selectedSet.size === 0) {
    window.$message?.warning('请至少勾选一张分镜图')
    return
  }

  const order = groupExecuteOrder.value
  const executable = order.filter((id) => {
    const n = nodes.value.find((x) => x.id === id)
    if (!n || !GROUP_EXECUTABLE_TYPES.includes(n.type)) return false
    if (n.type === 'imageConfig') return selectedSet.has(id)
    return true
  })

  if (executable.length === 0) {
    window.$message?.warning('当前没有可执行的节点')
    return
  }

  selectedSet.forEach((id) => {
    updateNode(id, {
      model: bgImageModel.value,
      size: bgImageSize.value,
      quality: bgImageQuality.value,
      count: bgImageCount.value
    })
  })
  await nextTick()

  await runGroupExecuteForNodeIds(executable, { closeBatchImagePanelOnSuccess: true })
}

/** 组内视频节点按分镜网格顺序（与批量生成布局一致） */
const sortVideoNodesForStitch = (list) =>
  [...list].sort((a, b) => {
    const rowA = Math.floor(a.position.y / 200)
    const rowB = Math.floor(b.position.y / 200)
    if (rowA !== rowB) return rowA - rowB
    return a.position.x - b.position.x
  })

/** 当前选中组内所有视频已生成完成，可批量下载 / 自动剪辑 */
const selectedGroupVideosStitchable = computed(() => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g) return false
  const vids = g.memberIds
    .map(id => nodes.value.find(n => n.id === id))
    .filter(n => n?.type === 'video')
  if (!vids.length) return false
  return vids.every(n => n.data?.url && !n.data?.loading && !n.data?.error)
})
const bvCreditCost = computed(() => {
  let perVideo = 55
  if (bvDuration.value >= 10) perVideo *= 2
  if (bvResolution.value === '1080p') perVideo = Math.ceil(perVideo * 1.5)
  else if (bvResolution.value === '480p') perVideo = Math.ceil(perVideo * 0.7)
  if (bvAudio.value) perVideo = Math.ceil(perVideo * 1.2)
  return bvSceneCount.value * perVideo
})

watch(bvModel, (key) => {
  const m = VIDEO_MODELS.find(x => x.key === key)
  if (m?.defaultParams) {
    bvRatio.value = m.defaultParams.ratio || '16:9'
    bvDuration.value = m.defaultParams.duration || 5
  }
  if (m?.defaultResolution) bvResolution.value = m.defaultResolution
})

const onBvModelSelect = (key) => { bvModel.value = key }
const handleOpenBatchVideo = () => {
  showBatchImageExecutePanel.value = false
  showBatchVideoPanel.value = true
}
const handleCloseBatchVideo = () => { showBatchVideoPanel.value = false }

const handleAutoStitchVideos = async () => {
  const g = canvasGroups.value.find(x => x.id === selectedGroupId.value)
  if (!g || isStitchingVideos.value) return
  const vids = sortVideoNodesForStitch(
    g.memberIds.map(id => nodes.value.find(n => n.id === id)).filter(n => n?.type === 'video')
  )
  const urls = vids.map(n => n.data?.url).filter(Boolean)
  if (!urls.length) {
    window.$message?.warning('没有可拼接的视频链接')
    return
  }
  isStitchingVideos.value = true
  try {
    window.$message?.info(
      urls.length > 1
        ? '首次自动剪辑需从 CDN 加载 FFmpeg，请稍候…'
        : '正在准备成片下载…'
    )
    const { concatVideoUrlsToBlob } = await import('../utils/videoConcat')
    const blob = await concatVideoUrlsToBlob(urls)
    const a = document.createElement('a')
    const href = URL.createObjectURL(blob)
    a.href = href
    a.download = `分镜成片_${Date.now()}.mp4`
    a.click()
    URL.revokeObjectURL(href)
    window.$message?.success('成片已触发下载')
  } catch (e) {
    window.$message?.error(e?.message || '自动剪辑失败')
  } finally {
    isStitchingVideos.value = false
  }
}

const handleBatchGenerateVideos = async () => {
  if (isGeneratingVideos.value || !bvSceneCount.value) return
  isGeneratingVideos.value = true

  try {
    const storyboardGroupId = selectedGroupId.value
    const storyboardNodes = selectedGroupImageNodes.value
    if (!storyboardNodes.length) {
      window.$message?.warning('组内没有分镜图节点')
      isGeneratingVideos.value = false
      return
    }

    const scenes = findScriptScenesForGroup(nodes.value, edges.value, canvasGroups.value, storyboardGroupId)

    const sceneData = storyboardNodes.map((node, i) => {
      const scene = resolveSceneForStoryboardImageNode(node, scenes, i)
      const imageUrl = pickStoryboardImageUrlFromNode(node)
      const firstFrameUrl = resolveI2vFirstFrameFromStoryboardGroup(storyboardNodes, i)
      const prompt = resolveVideoI2vPrompt(node, scenes, i)
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

    const storyboardGroup = canvasGroups.value.find(g => g.id === storyboardGroupId)
    const groupRight = storyboardGroup?.frame
      ? storyboardGroup.frame.x + storyboardGroup.frame.width + 80
      : 2200
    const groupTop = storyboardGroup?.frame?.y || 0

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

    let videoGroupId = null
    if (videoNodeIds.length >= 2) {
      videoGroupId = addCanvasGroup(videoNodeIds)
      if (videoGroupId) updateCanvasGroup(videoGroupId, { label: '视频组 · 分镜图 · 脚本生成器' })
    }

    if (videoGroupId && storyboardGroup) {
      const vg = canvasGroups.value.find(x => x.id === videoGroupId)
      if (vg?.frame) {
        const proxyId = addNode('groupProxy', {
          x: vg.frame.x,
          y: vg.frame.y + vg.frame.height / 2 - 6
        }, {})
        updateCanvasGroup(videoGroupId, { memberIds: [...(vg.memberIds || []), proxyId] })

        const sbProxy = storyboardGroup.memberIds.find(mid => {
          const n = nodes.value.find(x => x.id === mid && x.type === 'groupProxy')
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

    showBatchVideoPanel.value = false
    window.$message?.success(`正在生成 ${videoNodeIds.length} 个分镜视频…`)

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
          updateNode(videoNodeId, { ...mediaPatch, loading: false, label: sd.label, model: bvModel.value, updatedAt: Date.now() })
        } else if (newTaskId) {
          updateNode(videoNodeId, { taskId: newTaskId, loading: true, label: sd.label, model: bvModel.value, updatedAt: Date.now() })
        }
      } catch (err) {
        updateNode(videoNodeId, { loading: false, error: err.message || '生成失败', label: sd.label, updatedAt: Date.now() })
      }
    })

    manualSaveHistory()
  } catch (err) {
    window.$message?.error('批量视频生成失败：' + err.message)
  } finally {
    isGeneratingVideos.value = false
  }
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
      frame: g.frame ? { ...g.frame } : undefined,
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

const batchDownloadSelection = async () => {
  const withUrl = multiSelectedNodes.value.filter(n =>
    (n.type === 'image' || n.type === 'video') && n.data?.url
  )
  if (withUrl.length === 0) {
    window.$message?.info('选中节点中没有带链接的图片/视频')
    return
  }
  const { downloadUrlToFile, downloadManyNodesMedia, buildMediaDownloadName } = await import('../utils/mediaDownload.js')
  if (withUrl.length === 1) {
    try {
      await downloadUrlToFile(withUrl[0].data.url, buildMediaDownloadName(withUrl[0], 0))
      window.$message?.success('已开始下载文件')
    } catch {
      window.$message?.warning('无法跨域拉取，已打开原链接请另存为')
      window.open(withUrl[0].data.url, '_blank', 'noopener,noreferrer')
    }
    return
  }
  window.$message?.info('正在打包选中素材…')
  try {
    const { zipGroupMediaNodes } = await import('../utils/groupZipDownload.js')
    const { blob, fileName, embedded, linkOnly } = await zipGroupMediaNodes(withUrl, '选中素材')
    if (embedded === 0 && linkOnly > 0) {
      window.$message?.warning('无法打包，改为逐个下载…')
      const { ok, opened } = await downloadManyNodesMedia(withUrl)
      window.$message?.success(
        `已触发 ${ok} 个文件下载${opened ? `；${opened} 个已打开链接需手动保存` : ''}`
      )
      return
    }
    const a = document.createElement('a')
    const href = URL.createObjectURL(blob)
    a.href = href
    a.download = fileName
    a.rel = 'noopener'
    a.click()
    URL.revokeObjectURL(href)
    window.$message?.success(
      `已下载压缩包（${embedded} 个文件${linkOnly ? `，${linkOnly} 个为链接 txt` : ''}）`
    )
  } catch (e) {
    window.$message?.error('打包失败：' + (e?.message || e))
  }
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
  clearVueFlowSelection()
  selectedGroupId.value = gid
  window.$message?.success('已打组：框大小已固定；拖标题条可连带移动框与组内节点')
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
  { id: 'script', name: '脚本', icon: DocumentTextOutline, action: () => addNewNode('script') },
  { id: 'undo', name: '撤销', icon: ArrowUndoOutline, action: () => undo(), disabled: () => !canUndo() },
  { id: 'redo', name: '重做', icon: ArrowRedoOutline, action: () => redo(), disabled: () => !canRedo() }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'llmConfig', name: 'LLM文本生成', icon: ChatbubbleOutline, color: '#a855f7' },
  { type: 'imageConfig', name: '文生图配置', icon: ColorPaletteOutline, color: '#22c55e' },
  { type: 'videoConfig', name: '视频生成配置', icon: VideocamOutline, color: '#f59e0b' },
  { type: 'script', name: '脚本生成器', icon: DocumentTextOutline, color: '#f59e0b' },
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
const onNodeClick = () => {
  selectedGroupId.value = null
}

/** 拖拽开始时把节点提到最前，保证打组框内也能顺畅拖出、不被其它层干扰 | Bring node to front while dragging */
const onNodeDragStart = ({ node }) => {
  if (!node?.id) return
  const maxZ = Math.max(0, ...nodes.value.map(n => Number(n.zIndex) || 0))
  updateNode(node.id, { zIndex: maxZ + 1 })
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
// pane-click 只在点到空白背景时触发（节点不冒泡），用来做框内空白选组
const onPaneClick = (event) => {
  showNodeMenu.value = false
  closePaneContextMenu()
  // 检查点击坐标是否落在某个打组框内 | Check if click is inside a group frame
  const flowPos = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const hit = canvasGroups.value.find(g => {
    const r = groupFrameRect(g)
    return flowPos.x >= r.x && flowPos.x <= r.x + r.width &&
           flowPos.y >= r.y && flowPos.y <= r.y + r.height
  })
  if (hit) {
    selectGroup(hit.id)
  } else {
    selectedGroupId.value = null
    clearVueFlowSelection()
  }
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
  window.addEventListener('keydown', handleCanvasGlobalKeydown)

  if (typeof navigator !== 'undefined') {
    const pf = navigator.platform || ''
    const ua = navigator.userAgent || ''
    const phoneLike = /\biPhone\b|\biPod\b/i.test(ua)
    canvasWheelPan.value = !phoneLike && (/^Mac/i.test(pf) || /Mac OS X/.test(ua))
  }

  /* 默认 0 时轻微手抖会导致 pane-click 不触发，空白处难以取消选中 */
  setPaneClickDistance(8)
  
  // Initialize projects store | 初始化项目存储
  initProjectsStore()
  
  // Load project data | 加载项目数据
  loadProjectById(route.params.id)
  
  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('shanchuang-space-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('shanchuang-space-initial-prompt')
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
  window.removeEventListener('keydown', handleCanvasGlobalKeydown)
  closePaneContextMenu()
  abortGroupChromeDrag()
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

/* 节点层：保持 Vue Flow 默认（不覆盖 z-index），打组框为纯视觉层不拦截事件 | Keep VueFlow default */
.canvas-flow :deep(.vue-flow__nodes) {
  /* default: pointer-events: none, transform-origin: 0 0 */
}
.canvas-flow :deep(.vue-flow__edges) {
  position: relative;
  z-index: 0;
}

/* 透明底色色块：棋盘格示意 | Transparent fill swatch */
.group-fill-swatch-none {
  background-color: var(--bg-tertiary);
  background-image:
    linear-gradient(45deg, rgba(128, 128, 128, 0.22) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(128, 128, 128, 0.22) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(128, 128, 128, 0.22) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(128, 128, 128, 0.22) 75%);
  background-size: 5px 5px;
  background-position: 0 0, 0 2.5px, 2.5px -2.5px, -2.5px 0;
}

/* ─── Batch video panel（画布内锚定在打组框下方） ───────────────────────── */
.bv-panel {
  border-radius: 16px; overflow: hidden;
  background: rgba(30,30,35,0.96); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
}
.bv-panel--anchored {
  max-height: min(420px, 70vh);
  display: flex;
  flex-direction: column;
}
.bv-panel--anchored .bv-settings {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.bv-settings { padding: 20px 24px 12px; display: flex; flex-direction: column; gap: 16px; }
.bv-section { display: flex; flex-direction: column; gap: 8px; }
.bv-section-title { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85); }
.bv-option-row { display: flex; gap: 8px; }
.bv-option-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px; font-size: 13px;
  color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.08); cursor: pointer;
  transition: all 0.15s; min-width: 72px;
}
.bv-option-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.9); }
.bv-option-btn.active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.35); color: white; font-weight: 500; }
.bv-ratio-icon { display: inline-block; border: 1.5px solid currentColor; border-radius: 2px; }
.ratio-16x9 { width: 16px; height: 9px; }
.ratio-1x1  { width: 12px; height: 12px; }
.ratio-9x16 { width: 9px;  height: 16px; }
.ratio-4x3  { width: 14px; height: 10px; }
.ratio-3x4  { width: 10px; height: 14px; }
.ratio-21x9 { width: 18px; height: 8px; }
.bv-bottom-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(20,20,25,0.6);
}
.bv-close-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-size: 14px; color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; transition: all 0.12s; flex-shrink: 0;
}
.bv-close-btn:hover { background: rgba(255,255,255,0.12); color: white; }
.bv-model-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
  color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
  white-space: nowrap; transition: all 0.12s;
}
.bv-model-btn:hover { background: rgba(255,255,255,0.14); }
.bv-summary { display: flex; align-items: center; gap: 4px; font-size: 12px; color: rgba(255,255,255,0.5); white-space: nowrap; }
.bv-scene-count { font-size: 12px; color: rgba(255,255,255,0.5); white-space: nowrap; margin-left: auto; }
.bv-generate-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600;
  color: white; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none; cursor: pointer; white-space: nowrap;
  transition: all 0.15s; flex-shrink: 0;
}
.bv-generate-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
.bv-generate-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; filter: none; }
.bv-panel-enter-active { transition: all 0.25s ease-out; }
.bv-panel-leave-active { transition: all 0.2s ease-in; }
.bv-panel-enter-from { opacity: 0; transform: translateY(40px); }
.bv-panel-leave-to { opacity: 0; transform: translateY(40px); }

.bv-panel--image-batch {
  max-height: min(560px, 78vh);
}
.bi-link-btn {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.bi-link-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
}
.bi-scene-check-list {
  max-height: min(140px, 28vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 2px 0;
}
.bi-scene-check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 8px;
  outline: none;
}
.bi-scene-check-hit {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}
.bi-scene-check-row:hover {
  background: rgba(255, 255, 255, 0.06);
}
.bi-scene-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bi-progress-wrap {
  padding: 0 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(20, 20, 25, 0.45);
}
.bi-progress-hint {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}
</style>
