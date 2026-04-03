/**
 * 本地媒体缓存服务：将生成的图片/视频 URL 拉取并保存到可配置目录（默认项目根下 uploads/）
 * 环境变量：MEDIA_ROOT、MEDIA_SERVER_PORT（默认 8787）
 * Sora2 图生视频首帧：可选 TOS_*（与常见后端一致），或旧名 VOLCENGINE_TOS_*，见 README
 */
import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { TosClient, ACLType } from '@volcengine/tos-sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const MEDIA_ROOT = process.env.MEDIA_ROOT
  ? path.resolve(process.env.MEDIA_ROOT)
  : path.join(repoRoot, 'uploads')
const DEFAULT_DEV_PORT = 8787
const LISTEN_PORT = Number(process.env.PORT || process.env.MEDIA_SERVER_PORT || process.env.SERVER_PORT || DEFAULT_DEV_PORT)
const SERVE_STATIC =
  process.env.SERVE_STATIC === '1' ||
  process.env.SERVE_STATIC === 'true' ||
  process.env.SERVE_STATIC === 'yes'

function sanitizeProjectId (id) {
  if (!id || typeof id !== 'string') return 'default'
  const s = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)
  return s || 'default'
}

function isHttpUrl (u) {
  try {
    const x = new URL(u)
    return x.protocol === 'http:' || x.protocol === 'https:'
  } catch {
    return false
  }
}

function extFromMime (ct, kind) {
  const c = (ct || '').toLowerCase()
  if (kind === 'video' || c.includes('video')) return 'mp4'
  if (c.includes('png')) return 'png'
  if (c.includes('jpeg') || c.includes('jpg')) return 'jpg'
  if (c.includes('webp')) return 'webp'
  if (c.includes('gif')) return 'gif'
  return 'bin'
}

function parseImageDataUrl (dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const m = dataUrl.match(/^data:image\/([\w+.-]+);base64,(.+)$/i)
  if (!m) return null
  const subtype = m[1].toLowerCase()
  const b64 = m[2].replace(/\s/g, '')
  let buf
  try {
    buf = Buffer.from(b64, 'base64')
  } catch {
    return null
  }
  if (!buf.length || buf.length > 20 * 1024 * 1024) return null
  const mime = `image/${subtype}`
  let ext = subtype === 'jpeg' ? 'jpg' : subtype.split('+')[0]
  if (!/^[a-z0-9]+$/i.test(ext)) ext = 'png'
  return { buf, mime, ext }
}

/** TOS 对象键前缀：仅允许安全字符，多段用 / 分隔 */
function sanitizeTosObjectPrefix (raw) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.trim().replace(/^\/+|\/+$/g, '')
  if (!s) return ''
  return s
    .split('/')
    .map(p => p.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 200))
    .filter(Boolean)
    .join('/')
}

function getTosRuntime () {
  const accessKeyId =
    process.env.TOS_ACCESS_KEY || process.env.VOLCENGINE_TOS_ACCESS_KEY_ID
  const accessKeySecret =
    process.env.TOS_SECRET_KEY || process.env.VOLCENGINE_TOS_SECRET_ACCESS_KEY
  const bucket = process.env.TOS_BUCKET || process.env.VOLCENGINE_TOS_BUCKET
  const region = (
    process.env.TOS_REGION ||
    process.env.VOLCENGINE_TOS_REGION ||
    'cn-beijing'
  ).trim()
  const endpointRaw =
    process.env.TOS_ENDPOINT ||
    process.env.VOLCENGINE_TOS_ENDPOINT ||
    `tos-${region}.volces.com`
  const endpoint = String(endpointRaw).replace(/^https?:\/\//i, '')
  const objectPrefix = sanitizeTosObjectPrefix(
    process.env.TOS_OBJECT_PREFIX || process.env.VOLCENGINE_TOS_OBJECT_PREFIX
  )
  if (!accessKeyId || !accessKeySecret || !bucket) return null
  const client = new TosClient({
    accessKeyId,
    accessKeySecret,
    region,
    endpoint
  })
  return { client, bucket, region, objectPrefix }
}

/** 虚拟托管域名或自定义 CDN 前缀 */
function buildTosPublicObjectUrl (bucket, region, key) {
  const custom =
    process.env.TOS_PUBLIC_BASE_URL || process.env.VOLCENGINE_TOS_PUBLIC_BASE_URL
  const enc = key.split('/').map(encodeURIComponent).join('/')
  if (custom && String(custom).trim()) {
    return `${String(custom).replace(/\/$/, '')}/${enc}`
  }
  return `https://${bucket}.tos-${region}.volces.com/${enc}`
}

const app = express()

/**
 * 大 JSON body：必须在全局 express.json(2mb) 之前注册，否则整段 body 会先被 2mb 限制拒绝（413）
 */
app.post('/api/media/sora-frame-upload', express.json({ limit: '25mb' }), async (req, res) => {
  const tos = getTosRuntime()
  if (!tos) {
    return res.status(503).json({
      ok: false,
      error:
        '未配置火山 TOS：请设置 TOS_ACCESS_KEY、TOS_SECRET_KEY、TOS_BUCKET（或旧名 VOLCENGINE_TOS_ACCESS_KEY_ID 等）'
    })
  }
  const parsed = parseImageDataUrl(req.body?.dataUrl)
  if (!parsed) {
    return res.status(400).json({
      ok: false,
      error: '无效的 dataUrl，需为 data:image/*;base64,...'
    })
  }
  const pid = sanitizeProjectId(req.body?.projectId)
  const subKey = `sora-i2v-frames/${pid}/${crypto.randomUUID()}.${parsed.ext}`
  const key = tos.objectPrefix ? `${tos.objectPrefix}/${subKey}` : subKey
  try {
    await tos.client.putObject({
      bucket: tos.bucket,
      key,
      body: parsed.buf,
      contentType: parsed.mime,
      acl: ACLType.ACLPublicRead
    })
    const url = buildTosPublicObjectUrl(tos.bucket, tos.region, key)
    res.json({ ok: true, url })
  } catch (e) {
    console.error('[media-server] sora-frame-upload', e)
    res.status(502).json({ ok: false, error: String(e?.message || e) })
  }
})

app.use(express.json({ limit: '2mb' }))

/** 健康检查 */
app.get('/api/media/health', (_req, res) => {
  res.json({ ok: true, mediaRoot: MEDIA_ROOT })
})

/**
 * HEAD / GET — 检查本地文件是否存在（供前端优先走本地）
 */
app.head('/api/media/file/:projectId/:filename', async (req, res) => {
  const pid = sanitizeProjectId(req.params.projectId)
  const fn = path.basename(req.params.filename || '')
  if (!fn || fn !== req.params.filename) {
    return res.status(400).end()
  }
  const full = path.join(MEDIA_ROOT, pid, fn)
  try {
    await fs.access(full)
    res.status(200).end()
  } catch {
    res.status(404).end()
  }
})

app.get('/api/media/file/:projectId/:filename', async (req, res) => {
  const pid = sanitizeProjectId(req.params.projectId)
  const fn = path.basename(req.params.filename || '')
  if (!fn || fn !== req.params.filename) {
    return res.status(400).send('bad filename')
  }
  const full = path.join(MEDIA_ROOT, pid, fn)
  try {
    const stat = await fs.stat(full)
    if (!stat.isFile()) return res.status(404).end()
    res.sendFile(full, { maxAge: '7d', immutable: true })
  } catch {
    res.status(404).end()
  }
})

/**
 * POST — 从远程 URL 下载并落盘
 * body: { projectId, sourceUrl, kind?: 'image'|'video' }
 */
app.post('/api/media/cache', async (req, res) => {
  const { projectId, sourceUrl, kind } = req.body || {}
  if (!sourceUrl || typeof sourceUrl !== 'string' || !isHttpUrl(sourceUrl)) {
    return res.status(400).json({ ok: false, error: 'invalid sourceUrl' })
  }
  const pid = sanitizeProjectId(projectId)
  const dir = path.join(MEDIA_ROOT, pid)
  await fs.mkdir(dir, { recursive: true })

  let r
  try {
    r = await fetch(sourceUrl, { redirect: 'follow', headers: { 'User-Agent': 'shanchuang-space-media-cache/1.0' } })
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e?.message || e) })
  }
  if (!r.ok) {
    return res.status(502).json({ ok: false, error: `upstream ${r.status}` })
  }
  const buf = Buffer.from(await r.arrayBuffer())
  const ct = r.headers.get('content-type') || ''
  const ext = extFromMime(ct, kind)
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 24)
  const filename = `${hash}.${ext}`
  const full = path.join(dir, filename)
  await fs.writeFile(full, buf)
  const localKey = `${pid}/${filename}`
  res.json({ ok: true, localKey })
})

if (SERVE_STATIC) {
  const dist = path.join(repoRoot, 'dist')
  app.use(
    '/shanchuang-space',
    express.static(dist, { fallthrough: true }),
    (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'))
    }
  )
}

app.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[media-server] MEDIA_ROOT=${MEDIA_ROOT}`)
  console.log(`[media-server] SERVE_STATIC=${SERVE_STATIC}`)
  console.log(`[media-server] listening on :${LISTEN_PORT}`)
})
