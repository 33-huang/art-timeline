const OWNER       = '33-huang'
const REPO        = 'art-timeline'
const DATA_BRANCH = 'data'

// 每次 loadData 后缓存该文件的 sha，供 Step 9 的 saveData 写入时使用
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

  // 缓存 sha，Step 9 PUT 写回时必须带上这个版本号
  shaCache.set(filename, json.sha)

  // 正确处理 UTF-8 base64（atob 返回 latin1 字节串，直接 JSON.parse 会乱码）
  const bytes = Uint8Array.from(
    atob(json.content.replace(/\n/g, '')),
    c => c.charCodeAt(0),
  )
  const text = new TextDecoder('utf-8').decode(bytes)
  return JSON.parse(text)
}

// TODO Step 9: 实现 GitHub Contents API 写回 data 分支（需 token + sha）
export async function saveData(filename, data) {
  throw new Error('saveData 未实现，见 Step 9')
}
