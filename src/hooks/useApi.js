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
import { getModelByName, usesVolcengineImageApi, usesVolcengineVideoApi } from '@/config/models'
import { getProviderConfig, getDefaultBaseUrl } from '@/config/providers'
import { getVolcengineApiKey, getVolcengineBaseUrl } from '@/config/volcengineEnv'
import {
  setVideoPollContext,
  getVideoPollContext,
  deleteVideoPollContext
} from '@/config/videoPollContext'
import { useApiConfig } from './useApiConfig'
import { useProvider } from './useProvider'
import { useModelStore } from '@/stores/pinia'

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

      // Build request data | 构建请求数据
      const requestData = {
        model: params.model,
        prompt: params.prompt,
        size: params.size || modelConfig?.defaultParams?.size || '2048x2048',
        // n: params.n || 1
      }

      if (params.quality != null && params.quality !== '') {
        requestData.quality = params.quality
      }
      if (params.n != null) {
        requestData.n = params.n
      }

      // Add reference image if provided | 添加参考图
      if (params.image) {
        requestData.image = params.image
      }

      const imageProvider = usesVolcengineImageApi(params.model) ? 'volcengine' : modelStore.currentProvider
      const providerCfg = getProviderConfig(imageProvider)
      const baseUrl =
        imageProvider === 'volcengine'
          ? modelStore.baseUrlsByProvider?.volcengine || getVolcengineBaseUrl()
          : modelStore.baseUrlsByProvider?.[imageProvider] || getDefaultBaseUrl(imageProvider)
      const imagePath = providerCfg.endpoints?.image || '/images/generations'
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

      const adaptReq = providerCfg.requestAdapter?.image
      const adaptedParams = adaptReq ? adaptReq(requestData) : requestData

      const response = await generateImage(adaptedParams, {
        requestType: 'json',
        endpoint,
        headers: { Authorization: `Bearer ${apiKeyForImage}` }
      })

      const adaptResp = providerCfg.responseAdapter?.image
      const adaptedData = adaptResp ? adaptResp(response) : adaptResponse('image', response)

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

    const videoProvider = usesVolcengineVideoApi(params.model) ? 'volcengine' : modelStore.currentProvider
    const providerCfg = getProviderConfig(videoProvider)
    const chatfireCfg = getProviderConfig('chatfire')

    const baseUrl =
      videoProvider === 'volcengine'
        ? modelStore.baseUrlsByProvider?.volcengine || getVolcengineBaseUrl()
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

    const modelStr = String(params.model || '')
    const useChatfireSeedanceBody =
      modelStr.includes('seedance') &&
      (usesVolcengineVideoApi(params.model) || videoProvider === 'chatfire')

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

    if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
      const volcResp = providerCfg.responseAdapter?.video?.(task)
      const url =
        volcResp?.url || task.data?.url || task.url || task.content?.video_url
      return { taskId: null, url }
    }

    const newTaskId = task.id || task.task_id || task.taskId
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

        const adaptedResult = ctx
          ? volcCfg.responseAdapter?.video?.(result) || adaptResponse('video', result)
          : adaptResponse('video', result)

        if (result.status === 'completed' || result.status === 'succeeded' || result.data) {
          const videoUrl =
            adaptedResult.url ||
            result.data?.url ||
            result.data?.[0]?.url ||
            result.url ||
            result.content?.video_url ||
            result.video_url
          return { ...adaptedResult, url: videoUrl }
        }

        if (result.status === 'failed' || result.status === 'error') {
          throw new Error(result.error?.message || result.message || '视频生成失败')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      }

      throw new Error('视频生成超时')
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

  return { loading, error, status, video, taskId, progress, generate, reset, createVideoTaskOnly, pollVideoTask }
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
