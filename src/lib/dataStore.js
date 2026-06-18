export const TOKEN_KEY = 'gh_token'   // 全 app 共享常量，保持一致

const OWNER       = '33-huang'
const REPO        = 'art-timeline'
const DATA_BRANCH = 'data'

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
