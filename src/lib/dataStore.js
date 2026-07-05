export const TOKEN_KEY = 'gh_token'   // 全 app 共享常量，保持一致

const OWNER       = '33-huang'
const REPO        = 'art-timeline'
const DATA_BRANCH = 'data-test'   // v4 测试站用数据副本；转正时改回 'data'

const NOTES_REPO   = 'art-timeline-notes'
const NOTES_BRANCH = 'test'       // v4 测试站用笔记副本；转正时改回 'main'
const NOTES_FILE   = 'notes.json'

const shaCache = new Map()

export function getSha(filename) {
  return shaCache.get(filename)
}

export async function loadData(filename) {
  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}` +
    `?ref=${DATA_BRANCH}`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github+json' },
  })
  if (!res.ok) {
    throw new Error(`loadData("${filename}") failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  shaCache.set(filename, json.sha)

  // 正确处理 UTF-8 base64（atob 返回 latin1，直接 JSON.parse 中文会乱码）
  const bytes = Uint8Array.from(
    atob(json.content.replace(/\n/g, '')),
    c => c.charCodeAt(0),
  )
  const text = new TextDecoder('utf-8').decode(bytes)
  return JSON.parse(text)
}

export async function saveData(filename, data) {
  // token 只在写入时从 localStorage 取，不进 React state / console.log / URL / 报错信息
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) throw new Error('请先在设置（⚙）中填写 GitHub token')

  const sha = shaCache.get(filename)
  if (!sha) throw new Error(`未找到 ${filename} 的版本信息，请刷新页面后重试`)

  // UTF-8 → base64（btoa 直接接受 JSON.stringify 会破坏中文多字节字符）
  const text = JSON.stringify(data, null, 2)
  const bytes = new TextEncoder().encode(text)          // 先 UTF-8 编码成字节
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)  // 字节 → binary string
  const content = btoa(bin)                              // 再 base64

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filename}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,   // token 只进 header，不拼 URL
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `编辑 ${filename}`,
      content,
      branch: DATA_BRANCH,
      sha,
    }),
  })

  if (!res.ok) {
    // 错误信息里不带 token
    if (res.status === 409) throw new Error('数据已被他人修改，请刷新页面后重试（sha 冲突）')
    if (res.status === 401 || res.status === 403) throw new Error('token 无效或无权限，请检查 ⚙ 设置')
    throw new Error(`保存失败：HTTP ${res.status}`)
  }

  const json = await res.json()
  // 写成功后更新 sha 缓存——GitHub 每次 PUT 后 sha 都会变，连续编辑必须用最新的
  shaCache.set(filename, json.content.sha)
}

// ── 私密笔记（私有仓 art-timeline-notes）──────────────────
export async function loadNotes() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return {}

  const url =
    `https://api.github.com/repos/${OWNER}/${NOTES_REPO}/contents/${NOTES_FILE}` +
    `?ref=${NOTES_BRANCH}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
    },
  })

  if (res.status === 404) {
    shaCache.set(NOTES_FILE, null)
    return {}
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('token 无权限读取笔记仓库')
    throw new Error(`加载笔记失败：HTTP ${res.status}`)
  }

  const json = await res.json()
  shaCache.set(NOTES_FILE, json.sha)

  // GitHub Contents API 对 >1MB 的文件不返回内联 content（content 为空、encoding='none'），
  // 改用 Git Blobs API 按 sha 取（笔记含图片时很容易超过 1MB）
  let b64 = json.content
  if (!b64 && json.encoding === 'none') {
    const blobRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${NOTES_REPO}/git/blobs/${json.sha}`,
      { headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` } },
    )
    if (!blobRes.ok) throw new Error(`加载笔记失败：blob HTTP ${blobRes.status}`)
    b64 = (await blobRes.json()).content
  }

  const bytes = Uint8Array.from(
    atob(b64.replace(/\n/g, '')),
    c => c.charCodeAt(0),
  )
  const text = new TextDecoder('utf-8').decode(bytes)
  return JSON.parse(text)
}

export async function saveNotes(data) {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) throw new Error('请先在设置（⚙）中填写 GitHub token')

  const text = JSON.stringify(data, null, 2)
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const content = btoa(bin)

  const url = `https://api.github.com/repos/${OWNER}/${NOTES_REPO}/contents/${NOTES_FILE}`
  const body = {
    message: `更新笔记`,
    content,
    branch: NOTES_BRANCH,
  }

  const sha = shaCache.get(NOTES_FILE)
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    if (res.status === 409) throw new Error('笔记已被他人修改，请刷新页面后重试')
    if (res.status === 401 || res.status === 403) throw new Error('token 无权限写入笔记仓库')
    throw new Error(`保存笔记失败：HTTP ${res.status}`)
  }

  const json = await res.json()
  shaCache.set(NOTES_FILE, json.content.sha)
}
