/**
 * API Provider Adapters | API 渠道适配器
 * 适配不同 API 提供商的请求参数和响应格式
 */

/** 星图（UCloud Modelverse）保存 API 设置时的默认模型，与 PRD 对齐 */
export const ASTRAFLOW_DEFAULT_MODELS = {
  chat: 'deepseek-ai/DeepSeek-V3.2',
  image: 'gemini-3.1-flash-image-preview',
  video: 'doubao-seedance-1-5-pro-251215'
}

/** 将画布侧比例 key（如 16x9）转为 Modelverse 文档中的 ratio（如 16:9） */
function toModelverseVideoRatio(sizeOrRatio) {
  if (!sizeOrRatio || typeof sizeOrRatio !== 'string') return 'adaptive'
  if (sizeOrRatio.includes(':')) return sizeOrRatio
  const map = {
    '16x9': '16:9',
    '9x16': '9:16',
    '1x1': '1:1',
    '4x3': '4:3',
    '3x4': '3:4',
    '21x9': '21:9'
  }
  return map[sizeOrRatio] || 'adaptive'
}

// 渠道适配配置
export const PROVIDERS = {
  chatfire: {
    label: 'Chatfire',
    defaultBaseUrl: 'https://api.chatfire.site',
    // 端点路径
    endpoints: {
      chat: '/v1/chat/completions',
      image: '/v1/images/generations',
      video: '/v1/video/generations',
      videoQuery: '/v1/video/task/{taskId}'
    },
    // Chatfire 渠道请求适配
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => {
        const model = params.model || ''

        // Seedance 模型 — 使用 content 数组 + 顶层参数格式
        // 参考: https://www.volcengine.com/docs/82379/1520757
        if (model.includes('seedance')) {
          const content = []

          content.push({ type: 'text', text: params.prompt || '' })

          // 首帧图 (role: first_frame)
          if (params.first_frame_image) {
            const entry = {
              type: 'image_url',
              image_url: { url: params.first_frame_image }
            }
            if (params.last_frame_image) entry.role = 'first_frame'
            content.push(entry)
          }

          // 尾帧图 (role: last_frame)
          if (params.last_frame_image) {
            content.push({
              type: 'image_url',
              image_url: { url: params.last_frame_image },
              role: 'last_frame'
            })
          }

          const adapted = {
            model: model,
            content: content,
            generate_audio: params.generateAudio !== undefined ? !!params.generateAudio : true
          }

          // 顶层参数（优先于 text 内 --flag，兼容火山引擎 Ark 和 Chatfire）
          if (params.resolution) adapted.resolution = params.resolution
          if (params.size) adapted.ratio = params.size
          if (params.seconds) adapted.duration = Number(params.seconds)
          if (params.seed !== undefined) adapted.seed = params.seed
          if (params.wm !== undefined) adapted.watermark = !!params.wm
          if (params.cf !== undefined) adapted.camerafixed = !!params.cf

          return adapted
        }

        // Kling 模型 - 使用 kling 特定格式
        if (model.includes('kling')) {
          // 将 ratio 转换为 aspect_ratio 格式
          const ratioMap = {
            '16:9': '16:9',
            '9:16': '9:16',
            '1:1': '1:1',
            '4:3': '4:3',
            '3:4': '3:4'
          }

          const adapted = {
            model_name: model,
            mode: 'std',
            prompt: params.prompt || '',
            aspect_ratio: ratioMap[params.size] || '16:9',
            duration: params.seconds || 5,
            negative_prompt: '',
            cfg_scale: 0.5
          }

          // 添加参考图（如果有）
          if (params.first_frame_image) {
            adapted.image = params.first_frame_image
          }

          return adapted
        }

        // 默认格式（veo 等）
        const adapted = {
          model: params.model,
          prompt: params.prompt || ''
        }
        if (params.first_frame_image) adapted.first_frame_image = params.first_frame_image
        if (params.last_frame_image) adapted.last_frame_image = params.last_frame_image
        if (params.size) adapted.size = params.size
        if (params.seconds) adapted.seconds = params.seconds

        return adapted
      }
    },
    // Chatfire 渠道响应格式
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        return {
          url: response.data?.url || response.url || response.data?.[0]?.url || '',
          ...response
        }
      }
    }
  },
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.chatfire.cn',
    // 端点路径
    endpoints: {
      chat: '/v1/chat/completions',
      image: '/v1/images/generations',
      video: '/v1/videos',
      videoQuery: '/v1/videos/{taskId}'
    },
    // 请求参数适配
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        // 添加可选参数
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt || ''
        }
        if (params.first_frame_image) adapted.first_frame_image = params.first_frame_image
        if (params.last_frame_image) adapted.last_frame_image = params.last_frame_image
        if (params.size) adapted.size = params.size
        if (params.seconds) adapted.seconds = params.seconds
        return adapted
      }
    },
    // 响应数据适配
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        return {
          url: response.data?.url || response.url || response.data?.[0]?.url || '',
          ...response
        }
      }
    }
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    endpoints: {
      chat: '/chat/completions',
      image: '/images/generations',
      video: '/videos',
      videoQuery: '/videos/{taskId}'
    },
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => params,
      video: (params) => params
    },
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => response,
      video: (response) => response
    }
  },
  volcengine: {
    label: '火山引擎 (Volcengine)',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    // 图片：https://www.volcengine.com/docs/82379/1541523
    // 视频创建/查询：https://www.volcengine.com/docs/82379/1520757 、1521309（Contents Generations Tasks）
    endpoints: {
      chat: '/chat/completions',
      image: '/images/generations',
      video: '/contents/generations/tasks',
      videoQuery: '/contents/generations/tasks/{taskId}'
    },
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => params
    },
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        const url =
          response.output?.video_url ||
          response.output?.url ||
          (Array.isArray(response.output) && response.output[0]?.url) ||
          response.data?.url ||
          response.url ||
          response.data?.[0]?.url ||
          response.content?.video_url ||
          response.video_url ||
          ''
        return { url, ...response }
      }
    }
  },
  /**
   * 星图 Astraflow / UCloud Modelverse（国内站 api.modelverse.cn）
   * 文本：OpenAI 兼容 /v1/chat/completions；图：Gemini generateContent 见 useImageGeneration；
   * 视频：Seedance 走 /v1/tasks/submit + /v1/tasks/status
   */
  astraflow: {
    label: '星图 (Astraflow)',
    defaultBaseUrl: 'https://api.modelverse.cn',
    endpoints: {
      chat: '/v1/chat/completions',
      image: '/v1/images/generations',
      video: '/v1/tasks/submit',
      videoQuery: '/v1/tasks/status?task_id={taskId}'
    },
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => {
        const model = params.model || ''
        if (!model.includes('seedance')) {
          return {
            model,
            input: {
              content: [{ type: 'text', text: params.prompt || '' }]
            },
            parameters: {
              resolution: params.resolution || '720p',
              ratio: toModelverseVideoRatio(params.size),
              duration: params.seconds != null ? Number(params.seconds) : 5
            }
          }
        }
        const content = []
        content.push({ type: 'text', text: params.prompt || '' })
        if (params.first_frame_image) {
          const entry = {
            type: 'image_url',
            image_url: { url: params.first_frame_image }
          }
          if (params.last_frame_image) entry.role = 'first_frame'
          content.push(entry)
        }
        if (params.last_frame_image) {
          content.push({
            type: 'image_url',
            image_url: { url: params.last_frame_image },
            role: 'last_frame'
          })
        }
        const parameters = {
          generate_audio: params.generateAudio !== undefined ? !!params.generateAudio : true,
          draft: false,
          resolution: params.resolution || '720p',
          ratio: toModelverseVideoRatio(params.size),
          duration: params.seconds != null ? Number(params.seconds) : 5,
          watermark: params.wm !== undefined ? !!params.wm : false,
          camera_fixed: params.cf !== undefined ? !!params.cf : false
        }
        if (params.seed !== undefined) parameters.seed = params.seed
        return { model, input: { content }, parameters }
      }
    },
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        const tid = response.output?.task_id || response.task_id || response.taskId || response.id
        const url = response.output?.urls?.[0] || response.data?.url || response.url || ''
        return { url, taskId: tid, ...response }
      }
    }
  },
  diy: {
    label: 'DIY (自定义)',
    defaultBaseUrl: 'https://api.example.com/v1',
    endpoints: {
      chat: '/chat/completions',
      image: '/images/generations',
      video: '/videos',
      videoQuery: '/videos/{taskId}'
    },
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => params,
      video: (params) => params
    },
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => response,
      video: (response) => response
    }
  },

  // 默认使用 OpenAI 格式
  default: 'deepseek'
}

// 获取渠道列表
export const getProviderList = () => {
  return Object.entries(PROVIDERS)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => ({
      key,
      label: value.label
    }))
}

// 获取默认渠道
export const getDefaultProvider = () => {
  return PROVIDERS.default || 'deepseek'
}

// 获取渠道的默认 Base URL
export const getDefaultBaseUrl = (providerKey) => {
  const config = getProviderConfig(providerKey)
  return config.defaultBaseUrl || ''
}

// 获取渠道配置
export const getProviderConfig = (providerKey) => {
  return PROVIDERS[providerKey] || PROVIDERS[PROVIDERS.default]
}
