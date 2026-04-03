/**
 * Models Configuration | 模型配置
 * Centralized model configuration | 集中模型配置
 */

// Seedream image size options | 豆包图片尺寸选项
export const SEEDREAM_SIZE_OPTIONS = [
    { label: '21:9', key: '3024x1296' },
    { label: '16:9', key: '2560x1440' },
    { label: '4:3', key: '2304x1728' },
    { label: '3:2', key: '2496x1664' },
    { label: '1:1', key: '2048x2048' },
    { label: '2:3', key: '1664x2496' },
    { label: '3:4', key: '1728x2304' },
    { label: '9:16', key: '1440x2560' },
    { label: '9:21', key: '1296x3024' }
]

// Seedream 4K image size options | 豆包4K图片尺寸选项
export const SEEDREAM_4K_SIZE_OPTIONS = [
    { label: '21:9', key: '6198x2656' },
    { label: '16:9', key: '5404x3040' },
    { label: '4:3', key: '4694x3520' },
    { label: '3:2', key: '4992x3328' },
    { label: '1:1', key: '4096x4096' },
    { label: '2:3', key: '3328x4992' },
    { label: '3:4', key: '3520x4694' },
    { label: '9:16', key: '3040x5404' },
    { label: '9:21', key: '2656x6198' }
]

// Seedream quality options | 豆包画质选项
export const SEEDREAM_QUALITY_OPTIONS = [
    { label: '标准画质', key: 'standard' },
    { label: '4K 高清', key: '4k' }
]

export const BANANA_SIZE_OPTIONS = [
    { label: '16:9', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '3:2', key: '3x2' },
    { label: '1:1', key: '1x1' },
    { label: '2:3', key: '2x3' },
    { label: '3:4', key: '3x4' },
    { label: '9:16', key: '9x16' },
]

/** OpenAI 兼容生图常用尺寸（星图 /v1/images/generations） */
const ASTRAFLOW_OPENAI_IMAGE_SIZES = ['1024x1024', '1792x1024', '1024x1792', '2048x2048']

/**
 * 星图图片模型清单（PRD 写死，model 与 UCloud Modelverse 文档一致）
 * Gemini 系列走 generateContent，其余默认走 OpenAI 兼容 images/generations
 */
const ASTRAFLOW_IMAGE_MODELS = [
    { label: 'Nano Banana (Gemini 2.5 Flash Image)', key: 'gemini-2.5-flash-image', provider: ['astraflow'], sizes: BANANA_SIZE_OPTIONS.map(s => s.key), defaultParams: { size: '1x1', quality: 'standard', style: 'vivid' } },
    { label: 'Nano Banana Pro (Gemini 3 Pro Image)', key: 'gemini-3-pro-image', provider: ['astraflow'], sizes: BANANA_SIZE_OPTIONS.map(s => s.key), defaultParams: { size: '1x1', quality: 'standard', style: 'vivid' } },
    { label: 'Nano Banana 2 (Gemini 3.1 Flash Image)', key: 'gemini-3.1-flash-image-preview', provider: ['astraflow'], sizes: BANANA_SIZE_OPTIONS.map(s => s.key), defaultParams: { size: '1x1', quality: 'standard', style: 'vivid' } },
    { label: 'Flux 2 Pro', key: 'flux-2-pro', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Pro', key: 'flux-kontext-pro', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Pro 1.1', key: 'flux-pro-1.1', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux.1 Dev', key: 'black-forest-labs/flux.1-dev', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Pro', key: 'black-forest-labs/flux-kontext-pro', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Pro Multi', key: 'black-forest-labs/flux-kontext-pro/multi', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Pro 文生图', key: 'black-forest-labs/flux-kontext-pro/text-to-image', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Step1X Edit', key: 'stepfun-ai/step1x-edit', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Max', key: 'black-forest-labs/flux-kontext-max', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Max Multi', key: 'black-forest-labs/flux-kontext-max/multi', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Flux Kontext Max 文生图', key: 'black-forest-labs/flux-kontext-max/text-to-image', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Qwen Image Edit', key: 'Qwen/Qwen-Image-Edit', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'Qwen Image', key: 'Qwen/Qwen-Image', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'GPT Image 1', key: 'gpt-image-1', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: 'GPT Image 1.5', key: 'gpt-image-1.5', provider: ['astraflow'], sizes: ASTRAFLOW_OPENAI_IMAGE_SIZES, defaultParams: { size: '1024x1024', quality: 'standard', style: 'vivid' } },
    { label: '豆包 Seedream 4.5', key: 'doubao-seedream-4.5', provider: ['astraflow'], sizes: [...SEEDREAM_SIZE_OPTIONS.map(s => s.key), '2K', '4K'], defaultParams: { size: '2048x2048', quality: 'standard', style: 'vivid' } },
    { label: '豆包 Seedream 5.0', key: 'doubao-seedream-5-0-260128', provider: ['astraflow'], sizes: [...SEEDREAM_SIZE_OPTIONS.map(s => s.key), '2K', '4K'], defaultParams: { size: '2048x2048', quality: 'standard', style: 'vivid' } }
]

// Image generation models | 图片生成模型
export const IMAGE_MODELS = [
    {
        label: 'Nano Banana 2',
        key: 'nano-banana-2',
        provider: ['chatfire'], // Chatfire 渠道
        sizes: BANANA_SIZE_OPTIONS.map(s => s.key),
        // qualities: SEEDREAM_QUALITY_OPTIONS,
        // getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: {
            size: '1x1',
            quality: 'standard',
            style: 'vivid'
        }
    },
    {
        label: 'Nano Banana Pro',
        key: 'nano-banana-pro',
        provider: ['chatfire'], // Chatfire 渠道
        sizes: BANANA_SIZE_OPTIONS.map(s => s.key),
        // qualities: SEEDREAM_QUALITY_OPTIONS,
        // getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: {
            size: '1x1',
            quality: 'standard',
            style: 'vivid'
        }
    },
    {
        label: '豆包 Seedream 4.5',
        key: 'doubao-seedream-4-5-251128',
        provider: ['chatfire'], // Chatfire 渠道
        sizes: SEEDREAM_SIZE_OPTIONS.map(s => s.key),
        qualities: SEEDREAM_QUALITY_OPTIONS,
        getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: {
            size: '2048x2048',
            quality: 'standard',
            style: 'vivid'
        }
    },
    {
        label: 'Nano Banana',
        key: 'nano-banana',
        provider: ['chatfire'], // Chatfire 渠道
        tips: '尺寸写在提示词中: 尺寸 9:16',
        sizes: [],
        defaultParams: {
            quality: 'standard',
            style: 'vivid'
        }
    },
    ...ASTRAFLOW_IMAGE_MODELS

]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_LIST = [
    { label: '16:9 (横版)', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '1:1 (方形)', key: '1x1' },
    { label: '3:4', key: '3x4' },
    { label: '9:16 (竖版)', key: '9x16' }
]

// Video resolution options for Seedance | Seedance 分辨率选项
export const SEEDANCE_RESOLUTION_OPTIONS = [
    { label: '480p', key: '480p' },
    { label: '720p', key: '720p' },
    { label: '1080p', key: '1080p' }
]

/** 星图视频：与 VideoConfig 节点一致的 ratio 字符串 */
const AF_V_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9']
const AF_V_D510 = [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }]
const AF_V_D4812 = [{ label: '4 秒', key: 4 }, { label: '8 秒', key: 8 }, { label: '12 秒', key: 12 }]
const AF_V_D468 = [{ label: '4 秒', key: 4 }, { label: '6 秒', key: 6 }, { label: '8 秒', key: 8 }]
const AF_V_RES = ['480p', '720p', '1080p']

/**
 * 星图视频模型（PRD + Modelverse 文档 model 字段；部分 key 为 UI 专用，submitModel 为实际请求 model）
 * modelverseTaskStyle 由 config/providers buildAstraflowVideoSubmit 消费
 */
const ASTRAFLOW_VIDEO_MODELS = [
    { label: 'OpenAI Sora2 文生视频', key: 'openai/sora-2/text-to-video', provider: ['astraflow'], type: 't2v', ratios: AF_V_RATIOS, durs: AF_V_D4812, resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 4, resolution: '720p' }, modelverseTaskStyle: 'sora2_t2v', submitModel: 'openai/sora-2/text-to-video' },
    { label: 'OpenAI Sora2 图生视频', key: 'openai/sora-2/image-to-video', provider: ['astraflow'], type: 'i2v', ratios: AF_V_RATIOS, durs: AF_V_D4812, resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '9:16', duration: 4, resolution: '720p' }, modelverseTaskStyle: 'sora2_i2v', submitModel: 'openai/sora-2/image-to-video' },
    { label: 'OpenAI Sora-2 官方视频', key: 'sora-2', provider: ['astraflow'], type: 't2v+i2v', ratios: AF_V_RATIOS, durs: AF_V_D4812, resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 8, resolution: '720p' }, modelverseTaskStyle: 'openai_videos', tips: '走 multipart /v1/videos，与任务 submit 不同；画布暂未串联该链路，请优先用 Sora2 文生/图生任务接口' },
    { label: 'Wan 2.2 文生视频', key: 'Wan-AI/Wan2.2-T2V', provider: ['astraflow'], type: 't2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'Wan 2.2 图生视频', key: 'Wan-AI/Wan2.2-I2V', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'Wan 2.5 文生视频', key: 'Wan-AI/Wan2.5-T2V', provider: ['astraflow'], type: 't2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'Wan 2.5 图生视频', key: 'Wan-AI/Wan2.5-I2V', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'Wan 2.6 文生视频', key: 'Wan-AI/Wan2.6-T2V', provider: ['astraflow'], type: 't2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'Wan 2.6 图生视频', key: 'Wan-AI/Wan2.6-I2V', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '8 秒', key: 8 }], resolutions: ['480p', '720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'wan' },
    { label: 'MiniMax Hailuo 2.3 文生视频', key: 'MiniMax-Hailuo-2.3-t2v', provider: ['astraflow'], type: 't2v', ratios: AF_V_RATIOS, durs: [{ label: '6 秒', key: 6 }, { label: '10 秒', key: 10 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 6, resolution: '1080p' }, modelverseTaskStyle: 'minimax_t2v', submitModel: 'MiniMax-Hailuo-2.3' },
    { label: 'MiniMax Hailuo 2.3 图生视频', key: 'MiniMax-Hailuo-2.3-i2v', provider: ['astraflow'], type: 'i2v', ratios: ['16:9'], durs: [{ label: '6 秒', key: 6 }, { label: '10 秒', key: 10 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 6, resolution: '1080p' }, modelverseTaskStyle: 'minimax_i2v', submitModel: 'MiniMax-Hailuo-2.3' },
    { label: 'MiniMax Hailuo 2.3 Fast', key: 'MiniMax-Hailuo-2.3-Fast', provider: ['astraflow'], type: 'i2v', ratios: ['16:9'], durs: [{ label: '6 秒', key: 6 }, { label: '10 秒', key: 10 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 6, resolution: '1080p' }, modelverseTaskStyle: 'minimax_fast', submitModel: 'MiniMax-Hailuo-2.3-Fast' },
    { label: 'MiniMax Hailuo 02', key: 'MiniMax-Hailuo-02', provider: ['astraflow'], type: 't2v+i2v', ratios: AF_V_RATIOS, durs: [{ label: '6 秒', key: 6 }, { label: '10 秒', key: 10 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 6, resolution: '1080p' }, modelverseTaskStyle: 'minimax02', submitModel: 'MiniMax-Hailuo-02' },
    { label: 'Vidu 文生视频', key: 'vidu-viduq2-text2video', provider: ['astraflow'], type: 't2v', ratios: AF_V_RATIOS, durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'vidu', submitModel: 'viduq2', modelverseViduType: 'text2video' },
    { label: 'Vidu 图生视频', key: 'vidu-viduq3-img2video', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16'], durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'vidu_img2', submitModel: 'viduq3-pro' },
    { label: 'Vidu 参考图生视频', key: 'vidu-viduq2-reference2video', provider: ['astraflow'], type: 'i2v', ratios: AF_V_RATIOS, durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'vidu_ref', submitModel: 'viduq2' },
    { label: 'Vidu 首尾帧生视频', key: 'vidu-viduq2pro-startend', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16'], durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'vidu_startend', submitModel: 'viduq2-pro' },
    { label: 'Vidu 视频延长', key: 'vidu-viduq2turbo-extend', provider: ['astraflow'], type: 'i2v', ratios: ['16:9'], durs: [{ label: '5 秒', key: 5 }, { label: '7 秒', key: 7 }], resolutions: AF_V_RES, defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }, modelverseTaskStyle: 'vidu_extend', submitModel: 'viduq2-turbo', tips: '首帧连接处请传待延长视频的 URL（video_url）；尾帧可选' },
    { label: 'Vidu 对口型', key: 'vidu-lip-sync', provider: ['astraflow'], type: 'i2v', ratios: ['16:9'], durs: [{ label: '10 秒', key: 10 }], resolutions: ['720p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 10, resolution: '720p' }, modelverseTaskStyle: 'vidu_lip', submitModel: 'vidu-lip-sync' },
    { label: 'Vidu 一键生成 MV', key: 'vidu-mv', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durs: [{ label: '30 秒', key: 30 }], resolutions: ['540p', '720p', '1080p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 30, resolution: '720p' }, modelverseTaskStyle: 'vidu_mv', submitModel: 'vidu-mv', tips: '首帧传参考图，尾帧连接可传音频 URL 作为 audio_url' },
    { label: '可灵 Kling O1', key: 'kling-video-o1', provider: ['astraflow'], type: 't2v+i2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'kling_o1', submitModel: 'kling-video-o1' },
    { label: '可灵 v2.6 文生视频', key: 'kling-v2-6-t2v', provider: ['astraflow'], type: 't2v', ratios: ['16:9', '9:16', '1:1'], durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'kling_v26_t2v', submitModel: 'kling-v2-6' },
    { label: '可灵 v2.6 图生视频', key: 'kling-v2-6-i2v', provider: ['astraflow'], type: 'i2v', ratios: ['16:9', '9:16', '1:1'], durs: AF_V_D510, resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'kling_v26_i2v', submitModel: 'kling-v2-6' },
    { label: '可灵 v3 多模态视频', key: 'kling-v3', provider: ['astraflow'], type: 't2v+i2v', ratios: ['16:9', '9:16', '1:1'], durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }, { label: '15 秒', key: 15 }], resolutions: AF_V_RES, defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }, modelverseTaskStyle: 'kling_v3', submitModel: 'kling-v3' },
    { label: 'Veo 3.1 文图生视频', key: 'veo-3.1-generate-001', provider: ['astraflow'], type: 't2v+i2v', ratios: ['16:9', '9:16'], durs: AF_V_D468, resolutions: ['720p', '1080p'], defaultResolution: '1080p', defaultParams: { ratio: '16:9', duration: 8, resolution: '1080p' }, modelverseTaskStyle: 'veo31', submitModel: 'veo-3.1-generate-001' },
    { label: 'Veo 3.1 Fast', key: 'veo-3.1-fast-generate-001', provider: ['astraflow'], type: 't2v+i2v', ratios: ['16:9', '9:16'], durs: AF_V_D468, resolutions: ['720p', '1080p'], defaultResolution: '720p', defaultParams: { ratio: '16:9', duration: 8, resolution: '720p' }, modelverseTaskStyle: 'veo31', submitModel: 'veo-3.1-fast-generate-001' }
]

// Video generation models | 视频生成模型
export const VIDEO_MODELS = [
     // Seedance 模型 - 1.5 Pro
    {
        label: 'Seedance 1.5 Pro (图文视频)',
        key: 'doubao-seedance-1-5-pro-251215',
        provider: ['chatfire', 'astraflow'],
        type: 't2v+i2v',
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 10, resolution: '1080p' }
    },
    // Seedance 模型 - 文生视频
    {
        label: 'Seedance 1.0 Lite (文生视频)',
        key: 'doubao-seedance-1-0-lite-t2v-250428',
        provider: ['chatfire'],
        type: 't2v', // 文生视频
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '720p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }
    },
    // Seedance 模型 - 图生视频
    {
        label: 'Seedance 1.0 Lite (图生视频)',
        key: 'doubao-seedance-1-0-lite-i2v-250428',
        provider: ['chatfire'],
        type: 'i2v', // 图生视频
        ratios: ['16:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '720p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }
    },
    // Seedance 模型 - 图文视频 Pro
    {
        label: 'Seedance 1.0 Pro (图文视频)',
        key: 'doubao-seedance-1-0-pro-250528',
        provider: ['chatfire'],
        type: 't2v+i2v', // 图文视频
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '16:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }
    },
   
    // Seedance 模型 - 1.0 Pro Fast
    {
        label: 'Seedance 1.0 Pro Fast (图文视频)',
        key: 'doubao-seedance-1-0-pro-fast-251015',
        provider: ['chatfire'],
        type: 't2v+i2v',
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }
    },
    ...ASTRAFLOW_VIDEO_MODELS,
    // 可灵 Kling
    // {
    //     label: '可灵 Kling v2.5-turbo',
    //     key: 'kling-v2-1',
    //     provider: ['chatfire'], // 仅 Chatfire 渠道
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '9:16', duration: 10 }
    // },
    // {
    //     label: 'runway/gen4-turbo',
    //     key: 'runway/gen4-turbo',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: '可灵视频 O1',
    //     key: 'kling-video-o1',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: 'viduq2-pro_720p', key: 'viduq2-pro_720p',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: 'Sora 2', key: 'sora-2',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // }
]

// Chat/LLM models | 对话模型
export const CHAT_MODELS = [
    { label: 'DeepSeek V3.2', key: 'deepseek-ai/DeepSeek-V3.2', provider: ['astraflow'] },
    { label: 'GPT-4o Mini', key: 'gpt-4o-mini', provider: ['openai'] },
    { label: 'GPT-4o', key: 'gpt-4o', provider: ['openai'] },
    { label: 'GPT-5.2', key: 'gpt-5.2', provider: ['openai'] },
    { label: 'DeepSeek Chat', key: 'deepseek-chat', provider: ['openai', 'chatfire', 'deepseek'] },
    { label: 'DeepSeek Reasoner', key: 'deepseek-reasoner', provider: ['deepseek'] },
    { label: '豆包 Seed Flash', key: 'doubao-seed-1-6-flash-250615', provider: ['chatfire'] },
    { label: 'Gemini 3 Pro', key: 'gemini-3-pro', provider: ['openai'] },
    { label: 'Doubao Pro 32k', key: 'ep-20250212200155-2nx8j', provider: ['volcengine'] },
    { label: 'Doubao Lite 32k', key: 'ep-20250212200332-9c4kt', provider: ['volcengine'] }
]

// Image size options | 图片尺寸选项
export const IMAGE_SIZE_OPTIONS = [
    { label: '2048x2048', key: '2048x2048' },
    { label: '1792x1024 (横版)', key: '1792x1024' },
    { label: '1024x1792 (竖版)', key: '1024x1792' }
]

// Image quality options | 图片质量选项
export const IMAGE_QUALITY_OPTIONS = [
    { label: '标准', key: 'standard' },
    { label: '高清', key: 'hd' }
]

// Image style options | 图片风格选项
export const IMAGE_STYLE_OPTIONS = [
    { label: '生动', key: 'vivid' },
    { label: '自然', key: 'natural' }
]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST

// Video duration options | 视频时长选项
export const VIDEO_DURATION_OPTIONS = [
    { label: '5 秒', key: 5 },
    { label: '10 秒', key: 10 }
]

// Default values | 默认值
export const DEFAULT_IMAGE_MODEL = 'doubao-seedream-4-5-251128'
export const DEFAULT_VIDEO_MODEL = 'doubao-seedance-1-5-pro-251215'
export const DEFAULT_CHAT_MODEL = 'deepseek-chat'
export const DEFAULT_IMAGE_SIZE = '2048x2048'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

// Get model by key | 根据 key 获取模型
export const getModelByName = (key) => {
    const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
    return allModels.find(m => m.key === key)
}

/**
 * 豆包 Seedream 系列需直连火山引擎 Ark 生图接口（与全局聊天渠道无关）
 */
export const usesVolcengineImageApi = (modelKey) =>
    typeof modelKey === 'string' && modelKey.toLowerCase().includes('doubao-seedream')

/**
 * Seedance 1.5 Pro 需直连火山引擎 Ark 视频接口
 */
export const usesVolcengineVideoApi = (modelKey) =>
    typeof modelKey === 'string' && modelKey.includes('doubao-seedance-1-5-pro')

/** 星图 Gemini 生图：走 Modelverse generateContent + x-goog-api-key，非 OpenAI images 接口 */
export const usesModelverseGeminiImage = (modelKey) =>
    typeof modelKey === 'string' && /^gemini-.+image/i.test(modelKey)

/**
 * 画布模型 key → generateContent URL 中的模型 ID（与 UCloudDoc-Team/modelverse 文档 curl 一致）
 * 例：gemini-3-pro-image → gemini-3-pro-image-preview
 */
export const MODELVERSE_GEMINI_GENERATE_CONTENT_PATH_ID = {
  'gemini-3-pro-image': 'gemini-3-pro-image-preview'
}

export function resolveModelverseGeminiGenerateContentPathId (modelKey) {
  if (typeof modelKey !== 'string') return modelKey
  return MODELVERSE_GEMINI_GENERATE_CONTENT_PATH_ID[modelKey] || modelKey
}

/** Gemini 2.5 Flash Image：官方示例仅含 responseModalities，不含 imageConfig */
export function isGemini25FlashImageModel (modelKey) {
  return typeof modelKey === 'string' && modelKey === 'gemini-2.5-flash-image'
}
