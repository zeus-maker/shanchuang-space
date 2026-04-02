/**
 * 分镜脚本：从剧本文本推断目标时长、计算分镜数量、解析 / 修复 LLM 输出的 JSON
 */

/** 每镜按约 5 秒估算镜数（例：30 秒 → 6 镜） */
export const STORYBOARD_SECONDS_PER_SHOT = 5

/**
 * 从「剧本 + 生成要求」中推断目标总秒数（无法识别时返回 null）
 */
export function inferTargetSecondsForStoryboard (text) {
  if (!text || typeof text !== 'string') return null
  const raw = text

  let m = raw.match(/\*\*时长建议\*\*\s*[：:]\s*(\d+)\s*[-–~～]\s*(\d+)\s*秒/)
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2)

  m = raw.match(/(?:时长建议|目标时长|总时长|成片时长|视频总时长|整片时长)\s*[：:]\s*(\d+)\s*[-–~～]\s*(\d+)\s*秒/)
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2)

  m = raw.match(/(\d+)\s*[-–~～]\s*(\d+)\s*秒(?:\s*[,，]|$|\s*[,，]\s*[^\n]{0,20}(?:基调|类型))/m)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a >= 5 && b <= 600 && b >= a) return Math.round((a + b) / 2)
  }

  m = raw.match(/(\d{1,3})\s*秒\s*分镜/)
  if (m) {
    const v = Number(m[1])
    if (v >= 5 && v <= 600) return v
  }

  m = raw.match(/(?:要求|需要|目标|约|共|整片|成片|视频)?\s*(\d{1,3})\s*秒(?:\s*(?:成片|视频|分镜|左右|内|以内))?/)
  if (m) {
    const v = Number(m[1])
    if (v >= 5 && v <= 600) return v
  }

  m = raw.match(/(\d{1,2})\s*分钟/)
  if (m) {
    const v = Number(m[1]) * 60
    if (v >= 30 && v <= 600) return v
  }

  return null
}

/**
 * 由目标秒数得到分镜条数（有上限，避免一次输出过大）
 */
export function computeStoryboardSceneCount (targetSeconds) {
  if (targetSeconds == null || Number.isNaN(targetSeconds) || targetSeconds < 5) return null
  return Math.max(3, Math.min(60, Math.round(targetSeconds / STORYBOARD_SECONDS_PER_SHOT)))
}

/**
 * 构建系统提示（含动态镜数 / 总时长要求）
 */
export function buildStoryboardSystemPrompt ({ targetSeconds, sceneCount }) {
  const fields = `2. 每个分镜对象包含以下字段（字段名使用驼峰命名）：
   - sceneNo: 镜号（从1开始的整数）
   - duration: 预计时长（秒，3-8的整数）
   - description: 画面描述（中文，15-30字）
   - character1: 主要角色名（中文）
   - characterDesc1: 角色外貌详细描述（中文）
   - characterImg1: 角色图片生成提示词（英文，用于 AI 作图）
   - action: 角色动作（中文，10-20字）
   - sceneTag: 场景标签（中文，如：室内/室外/城市/自然/大殿）
   - lighting: 光影氛围（中文，如：日光直射/逆光/霓虹灯/烛光）
   - dialogue: 对白（中文，无对白则为空字符串）
   - storyboardPrompt: 分镜提示词（英文，详细的图片生成 prompt，包含构图、风格、光影、细节）
   - videoMotionPrompt: 视频运动提示词（英文，如：slow zoom in, pan left to right）`

  let rule3
  if (sceneCount != null && targetSeconds != null) {
    rule3 = `3. 【必须】生成恰好 ${sceneCount} 个分镜：JSON 数组长度必须严格等于 ${sceneCount}。用户目标总时长约 ${targetSeconds} 秒（按每镜约 ${STORYBOARD_SECONDS_PER_SHOT} 秒规划镜数）；各分镜 duration 之和应接近 ${targetSeconds} 秒，单镜 duration 取 3-8 的整数。`
  } else {
    rule3 =
      '3. 若用户未给出明确总时长，则根据剧本体量生成 12-18 个分镜；极短剧本可略少、极长可略多。单镜 duration 为 3-8 秒整数，节奏紧凑。'
  }

  return `你是专业的分镜脚本编剧。根据用户提供的剧本内容，生成详细的分镜脚本。
输出规则：
1. 直接输出 JSON 数组，不要任何前置说明、代码块标记（不要使用 \`\`\`json）、或其他内容
${fields}
${rule3}`
}

/**
 * 解析 LLM 输出的分镜 JSON（数组或 { scenes: [] }）
 */
export function parseScriptJSON (text) {
  const tryParse = (s) => {
    const extract = (r) => {
      if (Array.isArray(r) && r.length) return r
      if (r?.scenes && Array.isArray(r.scenes) && r.scenes.length) return r.scenes
      return null
    }
    let raw = String(s).trim()
    raw = raw.replace(/^[\uFEFF\u200B]+/, '')
    raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")

    try {
      const r = JSON.parse(raw)
      const res = extract(r)
      if (res) return res
    } catch { /* continue */ }

    try {
      const repaired = raw
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/"((?:[^"\\]|\\.)*)"/gs, (_, inner) =>
          '"' + inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"'
        )
      const r = JSON.parse(repaired)
      const res = extract(r)
      if (res) return res
    } catch { /* continue */ }

    return null
  }

  const extractByBracket = (s, openCh, closeCh) => {
    const start = s.indexOf(openCh)
    if (start === -1) return null
    let depth = 0
    for (let i = start; i < s.length; i++) {
      if (s[i] === openCh) depth++
      else if (s[i] === closeCh) {
        depth--
        if (depth === 0) return s.slice(start, i + 1)
      }
    }
    return null
  }

  let t = String(text)
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '')
  t = t.replace(/<redacted_thinking>[\s\S]*?<\/redacted_thinking>/gi, '')
  t = t.trim()

  const firstJson = t.search(/[\[{]/)
  if (firstJson > 0) t = t.slice(firstJson)

  if (t.startsWith('[') || t.startsWith('{')) {
    const r = tryParse(t)
    if (r) return r
  }

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    const r = tryParse(fence[1])
    if (r) return r
  }

  const arr = extractByBracket(t, '[', ']')
  if (arr) {
    const r = tryParse(arr)
    if (r) return r
  }

  const obj = extractByBracket(t, '{', '}')
  if (obj) {
    const r = tryParse(obj)
    if (r) return r
  }

  return null
}

/**
 * 调用大模型将破损输出整理为合法 JSON 后再解析（非流式）
 */
export async function repairStoryboardJsonViaLlm ({
  model,
  rawText,
  signal,
  origin,
  pathname,
  apiKey
}) {
  if (!apiKey || !rawText?.trim()) return null

  const system = `你是 JSON 修复器。用户文本本应是分镜脚本 JSON（数组或 {"scenes":[...]}），但可能含说明文字、markdown 代码块、尾随逗号、未转义换行、中文引号等错误。
规则：
1. 只输出一段合法 JSON，不要任何解释、不要 markdown。
2. 输出必须是 JSON 数组 [...] 或对象 {"scenes":[...]}。
3. 保留每条分镜的字段与语义，不要删减分镜条数。`

  const user = String(rawText).slice(0, 120000)

  const res = await fetch(`${origin}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 8192,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal
  })

  if (!res.ok) return null

  const data = await res.json().catch(() => ({}))
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') return null

  return parseScriptJSON(content)
}
