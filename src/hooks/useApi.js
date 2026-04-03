/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import { ref, reactive, onUnmounted } from 'vue'
import {
  generateImage,
  createVideoTask,
  getVideoTaskStatus,
  streamChatCompletions
} from '@/api'
import { request } from '@/utils'
import {
  getModelByName,
  usesVolcengineImageApi,
  usesVolcengineVideoApi,
  usesModelverseGeminiImage
} from '@/config/models'
import { getProviderConfig, getDefaultBaseUrl } from '@/config/providers'
import {
  getVolcengineApiKey,
  getVolcengineBaseUrl,
  getVolcengineImagePath,
  normalizeVolcengineInferenceBase
} from '@/config/volcengineEnv'
import {
  setVideoPollContext,
  getVideoPollContext,
  deleteVideoPollContext
} from '@/config/videoPollContext'
import { useApiConfig } from './useApiConfig'
import { useProvider } from './useProvider'
import { useModelStore } from '@/stores/pinia'

/** 画布尺寸 key → Gemini imageConfig.aspectRatio */
function mapBananaSizeToGeminiAspect(sizeKey) {
  const m = {
    '16x9': '16:9',
    '4x3': '4:3',
    '3x2': '3:2',
    '1x1': '1:1',
    '2x3': '2:3',
    '3x4': '3:4',
    '9x16': '9:16'
  }
  return m[sizeKey] || '1:1'
}

/** 解析 Modelverse Gemini generateContent 响应为与 OpenAI 生图一致的 { url } 列表 */
function extractGeminiImageParts(response) {
  const cands = response?.candidates || []
  const out = []
  for (const c of cands) {
    const parts = c?.content?.parts || []
    for (const p of parts) {
      if (p?.thought) continue
      const data = p?.inlineData?.data
      const mime = p?.inlineData?.mimeType || 'image/png'
      if (data) {
        out.push({ url: `data:${mime};base64,${data}`, revisedPrompt: '' })
      }
    }
  }
  return out
}

/** 火山推理 Base：环境变量已 normalize；UI 里填写的 Base 也做纠错 */
function resolveVolcengineInferenceBase(modelStore) {
  const s = modelStore.baseUrlsByProvider?.volcengine
  if (s != null && String(s).trim()) {
    return normalizeVolcengineInferenceBase(String(s).trim())
  }
  return getVolcengineBaseUrl()
}

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()
  const modelStore = useModelStore()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true, chatOptions = {}) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      // 构建用户消息内容（支持参考图片）
      let userContent
      const images = chatOptions.images || options.images || []

      if (images.length > 0) {
        // 多模态消息：文本 + 图片
        userContent = [
          { type: 'text', text: content },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img.url || img }
          }))
        ]
      } else {
        userContent = content
      }

      const msgList = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...messages.value,
        { role: 'user', content: userContent }
      ]

        // 适配请求参数
        const adaptedParams = adaptRequest('chat', {
          model: modelStore.selectedChatModel || options.model || 'gpt-4o-mini',
          messages: msgList
        })

        if (stream) {
          status.value = 'streaming'
          abortController = new AbortController()
          let fullResponse = ''

          // 使用 modelStore 获取完整 URL
          const chatUrl = modelStore.getChatEndpoint()
          const url = new URL(chatUrl)
          const endpoint = url.pathname

          for await (const chunk of streamChatCompletions(
            adaptedParams,
            abortController.signal,
            { baseUrl: url.origin, endpoint }
          )) {
          fullResponse += chunk
          currentResponse.value = fullResponse
        }

        messages.value.push({ role: 'user', content })
        messages.value.push({ role: 'assistant', content: fullResponse })
        setSuccess()
        return fullResponse
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()
  const modelStore = useModelStore()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with fixed params | 固定参数生成图片
   * @param {Object} params - { model, prompt, size, n, image (optional ref image) }
   */
  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      const modelConfig = getModelByName(params.model)

      // ── Resolve provider, endpoint, API key ─────────────────────────────────
      const imageProvider =
        usesVolcengineImageApi(params.model) && modelStore.currentProvider === 'volcengine'
          ? 'volcengine'
          : modelStore.currentProvider
      const providerCfg = getProviderConfig(imageProvider)
      const baseUrl =
        imageProvider === 'volcengine'
          ? resolveVolcengineInferenceBase(modelStore)
          : modelStore.baseUrlsByProvider?.[imageProvider] || getDefaultBaseUrl(imageProvider)
      const imagePath =
        imageProvider === 'volcengine'
          ? getVolcengineImagePath()
          : providerCfg.endpoints?.image || '/images/generations'
      const endpoint = `${String(baseUrl).replace(/\/$/, '')}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`

      const apiKeyForImage =
        imageProvider === 'volcengine'
          ? getVolcengineApiKey() || modelStore.apiKeysByProvider?.volcengine || ''
          : modelStore.apiKeysByProvider?.[imageProvider] || ''
      if (!apiKeyForImage) {
        const hint =
          imageProvider === 'volcengine'
            ? '豆包 Seedream 需火山引擎 Key：请在项目根目录 .env 设置 VITE_VOLCENGINE_API_KEY，或在 API 设置中填写「火山引擎」密钥'
            : '请先配置 API Key'
        const err = new Error(hint)
        setError(err)
        throw err
      }

      // ── Single-request helper ────────────────────────────────────────────────
      const callOnce = async () => {
        const requestData = {
          model: params.model,
          prompt: params.prompt,
          size: params.size || modelConfig?.defaultParams?.size || '2048x2048',
        }
        if (params.quality != null && params.quality !== '') requestData.quality = params.quality
        if (params.image) requestData.image = params.image
        // Always n=1 per call; multiple images are handled by parallel calls below
        requestData.n = 1

        // 星图 Gemini：Modelverse v1beta generateContent + x-goog-api-key
        if (usesModelverseGeminiImage(params.model) && imageProvider === 'astraflow') {
          const aspect = mapBananaSizeToGeminiAspect(
            params.size || modelConfig?.defaultParams?.size || '1x1'
          )
          const q = params.quality || modelConfig?.defaultParams?.quality
          const imageSize = q === '4k' ? '4K' : '1K'
          const body = {
            contents: [{ parts: [{ text: params.prompt || '' }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: { aspectRatio: aspect, imageSize }
            }
          }
          const geminiId = encodeURIComponent(params.model)
          const geminiPath = `/v1beta/models/${geminiId}:generateContent`
          const geminiUrl = `${String(baseUrl).replace(/\/$/, '')}${geminiPath}`
          const response = await request({
            url: geminiUrl,
            method: 'post',
            data: body,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKeyForImage
            }
          })
          if (response?.error?.message) {
            throw new Error(response.error.message)
          }
          const list = extractGeminiImageParts(response)
          if (!list.length) {
            throw new Error('生图响应中未找到图片数据')
          }
          return list
        }

        const adaptReq = providerCfg.requestAdapter?.image
        const adaptedParams = adaptReq ? adaptReq(requestData) : requestData

        const response = await generateImage(adaptedParams, {
          requestType: 'json',
          endpoint,
          headers: { Authorization: `Bearer ${apiKeyForImage}` }
        })

        const adaptResp = providerCfg.responseAdapter?.image
        return adaptResp ? adaptResp(response) : adaptResponse('image', response)
      }

      // ── Fire n parallel requests (most image APIs only support n=1 per call) ─
      const count = Math.max(1, params.n || 1)
      const results = await Promise.all(Array.from({ length: count }, () => callOnce()))
      const adaptedData = results.flat()

      images.value = adaptedData
      currentImage.value = adaptedData[0] || null
      setSuccess()
      return adaptedData
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format
 */

export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()
  const modelStore = useModelStore()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Create video task only (no polling) | 仅创建视频任务（不轮询）
   */
  const createVideoTaskOnly = async (params) => {
    const modelConfig = getModelByName(params.model)

    const requestData = {
      model: params.model,
      prompt: params.prompt || ''
    }
    if (params.first_frame_image) requestData.first_frame_image = params.first_frame_image
    if (params.last_frame_image) requestData.last_frame_image = params.last_frame_image
    if (params.ratio) requestData.size = params.ratio
    if (params.dur) requestData.seconds = params.dur
    if (params.resolution) requestData.resolution = params.resolution
    else if (modelConfig?.defaultResolution) requestData.resolution = modelConfig.defaultResolution
    if (params.generateAudio !== undefined) requestData.generateAudio = params.generateAudio

    const videoProvider =
      usesVolcengineVideoApi(params.model) && modelStore.currentProvider === 'volcengine'
        ? 'volcengine'
        : modelStore.currentProvider
    const providerCfg = getProviderConfig(videoProvider)
    const chatfireCfg = getProviderConfig('chatfire')

    const baseUrl =
      videoProvider === 'volcengine'
        ? resolveVolcengineInferenceBase(modelStore)
        : modelStore.baseUrlsByProvider?.[videoProvider] || getDefaultBaseUrl(videoProvider)

    const videoPath = providerCfg.endpoints?.video || '/videos'
    const createEndpoint = `${String(baseUrl).replace(/\/$/, '')}${videoPath.startsWith('/') ? videoPath : `/${videoPath}`}`

    const apiKey =
      videoProvider === 'volcengine'
        ? getVolcengineApiKey() || modelStore.apiKeysByProvider?.volcengine || ''
        : modelStore.apiKeysByProvider?.[videoProvider] || ''

    if (!apiKey) {
      throw new Error(
        videoProvider === 'volcengine'
          ? 'Seedance 1.5 Pro 需火山引擎 Key：请在根目录 .env 设置 VITE_VOLCENGINE_API_KEY，或在 API 设置中填写「火山引擎」密钥'
          : '请先配置 API Key'
      )
    }

    if (videoProvider === 'astraflow' && modelConfig?.modelverseTaskStyle === 'openai_videos') {
      throw new Error(
        'Sora-2 官方接口为 multipart /v1/videos，与 /v1/tasks/submit 不同。请改用「OpenAI Sora2 文生视频」或「图生视频」任务模型。'
      )
    }

    const modelStr = String(params.model || '')
    const useChatfireSeedanceBody =
      modelStr.includes('seedance') &&
      ((videoProvider === 'volcengine' && usesVolcengineVideoApi(params.model)) ||
        videoProvider === 'chatfire')

    const adaptedParams = useChatfireSeedanceBody
      ? chatfireCfg.requestAdapter.video(requestData)
      : providerCfg.requestAdapter?.video
        ? providerCfg.requestAdapter.video(requestData)
        : adaptRequest('video', requestData)

    const task = await createVideoTask(adaptedParams, {
      requestType: 'json',
      endpoint: createEndpoint,
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    const isAsync = modelConfig?.async !== false

    if (!isAsync || task.data?.url || task.url || task.content?.video_url || task.output?.video_url) {
      const volcResp = providerCfg.responseAdapter?.video?.(task)
      const url =
        volcResp?.url ||
        task.output?.video_url ||
        task.data?.url ||
        task.url ||
        task.content?.video_url
      return { taskId: null, url }
    }

    const newTaskId = task.id || task.task_id || task.taskId || task.output?.task_id
    if (!newTaskId) {
      throw new Error('未获取到任务 ID')
    }

    if (videoProvider === 'volcengine') {
      const queryTpl = providerCfg.endpoints?.videoQuery || '/videos/{taskId}'
      const taskPath = queryTpl.startsWith('/') ? queryTpl : `/${queryTpl}`
      const endpointTemplate = `${String(baseUrl).replace(/\/$/, '')}${taskPath}`
      setVideoPollContext(newTaskId, {
        headers: { Authorization: `Bearer ${apiKey}` },
        endpointTemplate
      })
    }

    return { taskId: newTaskId }
  }

  /**
   * Poll video task | 轮询视频任务
   */
  const pollVideoTask = async (pollTaskId, onProgress = () => {}) => {
    const maxAttempts = 120
    const interval = 5000
    const ctx = getVideoPollContext(pollTaskId)
    const volcCfg = getProviderConfig('volcengine')

    try {
      for (let i = 0; i < maxAttempts; i++) {
        onProgress(i + 1, Math.min(Math.round((i / maxAttempts) * 100), 99))

        let taskEndpoint
        let pollHeaders = {}
        if (ctx?.endpointTemplate) {
          taskEndpoint = ctx.endpointTemplate.includes('{taskId}')
            ? ctx.endpointTemplate.replace('{taskId}', pollTaskId)
            : ctx.endpointTemplate
          pollHeaders = ctx.headers || {}
        } else {
          taskEndpoint = modelStore.getVideoTaskEndpoint()
          if (taskEndpoint.includes('{taskId}')) {
            taskEndpoint = taskEndpoint.replace('{taskId}', pollTaskId)
          }
        }

        const result = await getVideoTaskStatus(pollTaskId, {
          endpoint: taskEndpoint,
          headers: pollHeaders
        })

        // UCloud Modelverse 视频异步：output.task_status / output.urls
        const mvOut = result?.output
        if (mvOut && typeof mvOut.task_status === 'string') {
          if (mvOut.task_status === 'Success' && Array.isArray(mvOut.urls) && mvOut.urls[0]) {
            return { url: mvOut.urls[0], ...result }
          }
          if (mvOut.task_status === 'Failure' || mvOut.task_status === 'Expired') {
            throw new Error(mvOut.error_message || '视频生成失败')
          }
          await new Promise(resolve => setTimeout(resolve, interval))
          continue
        }

        const adaptedResult = ctx
          ? volcCfg.responseAdapter?.video?.(result) || adaptResponse('video', result)
          : adaptResponse('video', result)

        const videoUrl =
          adaptedResult.url ||
          result.output?.video_url ||
          result.output?.url ||
          (Array.isArray(result.output) && result.output[0]?.url) ||
          result.data?.url ||
          result.data?.[0]?.url ||
          result.url ||
          result.content?.video_url ||
          result.video_url

        if (videoUrl) {
          return { ...adaptedResult, url: videoUrl }
        }

        const st = result.status
        if (st === 'failed' || st === 'error' || st === 'cancelled') {
          throw new Error(
            result.error?.message || result.message || result.error?.code || '视频生成失败'
          )
        }

        if (st === 'completed' || st === 'succeeded' || st === 'success') {
          throw new Error('任务已完成但未返回视频地址，请查看控制台任务详情')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('视频生成超时')
    } finally {
      deleteVideoPollContext(pollTaskId)
    }
  }

  /**
   * 单次查询任务状态，取视频 URL（用于本地文件丢失后凭 taskId 刷新签名地址）
   */
  const fetchVideoResultUrlOnce = async (pollTaskId, modelName) => {
    if (!pollTaskId || !modelName) return null
    const videoProvider =
      usesVolcengineVideoApi(modelName) && modelStore.currentProvider === 'volcengine'
        ? 'volcengine'
        : modelStore.currentProvider
    const providerCfg = getProviderConfig(videoProvider)
    const apiKey =
      videoProvider === 'volcengine'
        ? getVolcengineApiKey() || modelStore.apiKeysByProvider?.volcengine || ''
        : modelStore.apiKeysByProvider?.[videoProvider] || ''
    if (!apiKey) return null

    const baseUrl =
      videoProvider === 'volcengine'
        ? resolveVolcengineInferenceBase(modelStore)
        : modelStore.baseUrlsByProvider?.[videoProvider] || getDefaultBaseUrl(videoProvider)

    let taskEndpoint
    let pollHeaders = {}

    if (videoProvider === 'volcengine') {
      const queryTpl = providerCfg.endpoints?.videoQuery || '/videos/{taskId}'
      const taskPath = queryTpl.startsWith('/') ? queryTpl : `/${queryTpl}`
      const endpointTemplate = `${String(baseUrl).replace(/\/$/, '')}${taskPath}`
      taskEndpoint = endpointTemplate.includes('{taskId}')
        ? endpointTemplate.replace('{taskId}', pollTaskId)
        : endpointTemplate
      pollHeaders = { Authorization: `Bearer ${apiKey}` }
      setVideoPollContext(pollTaskId, { headers: pollHeaders, endpointTemplate })
    } else {
      taskEndpoint = modelStore.getVideoTaskEndpoint()
      if (taskEndpoint.includes('{taskId}')) {
        taskEndpoint = taskEndpoint.replace('{taskId}', pollTaskId)
      }
    }

    const volcCfg = getProviderConfig('volcengine')

    try {
      const result = await getVideoTaskStatus(pollTaskId, {
        endpoint: taskEndpoint,
        headers: pollHeaders
      })
      const mvOut = result?.output
      if (mvOut && mvOut.task_status === 'Success' && Array.isArray(mvOut.urls) && mvOut.urls[0]) {
        return mvOut.urls[0]
      }
      const ctx = getVideoPollContext(pollTaskId)
      const adaptedResult = ctx
        ? volcCfg.responseAdapter?.video?.(result) || adaptResponse('video', result)
        : adaptResponse('video', result)
      const videoUrl =
        adaptedResult.url ||
        result.output?.video_url ||
        result.output?.url ||
        (Array.isArray(result.output) && result.output[0]?.url) ||
        result.data?.url ||
        result.data?.[0]?.url ||
        result.url ||
        result.content?.video_url ||
        result.video_url
      return videoUrl || null
    } catch {
      return null
    } finally {
      deleteVideoPollContext(pollTaskId)
    }
  }

  /**
   * Generate video with fixed params (includes polling) | 固定参数生成视频（含轮询）
   * @param {Object} params - { model, prompt, first_frame_image, last_frame_image, ratio, duration }
   */
  const generate = async (params) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      // 创建任务
      const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

      // 如果有直接 URL，返回
      if (url) {
        video.value = { url }
        setSuccess()
        return video.value
      }

      // 需要轮询
      taskId.value = newTaskId
      status.value = 'polling'

      // 轮询获取结果
      const result = await pollVideoTask(newTaskId, (attempt, percentage) => {
        progress.attempt = attempt
        progress.percentage = percentage
      })

      video.value = result
      setSuccess()
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return {
    loading,
    error,
    status,
    video,
    taskId,
    progress,
    generate,
    reset,
    createVideoTaskOnly,
    pollVideoTask,
    fetchVideoResultUrlOnce
  }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const config = useApiConfig()
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()

  return { config, chat, image, video: videoGen }
}
