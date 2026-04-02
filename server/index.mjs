/**
 * 本地媒体缓存服务：将生成的图片/视频 URL 拉取并保存到可配置目录（默认项目根下 uploads/）
 * 环境变量：MEDIA_ROOT、MEDIA_SERVER_PORT（默认 8787）
 */
import express from 'express'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

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

const app = express()
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
