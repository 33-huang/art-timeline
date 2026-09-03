export function genModId() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` }

// 笔记内容里的链接点击：拦截默认跳转，新窗口打开
export function noteClickHandler(e) {
  const a = e.target.closest('a')
  if (a) { e.preventDefault(); window.open(a.href, '_blank', 'noopener') }
}

// ── 「排在其后」定位 ────────────────────────────────────
// 只有流派和"无流派的独立艺术家"有独立列、受 posStart 影响
export function isOrphanArtist(a, mvIdSet) {
  return !a.movements || !a.movements.some(id => mvIdSet.has(id))
}
// anchor 的列位置键值（与 computeLayout 排序键一致）；有流派的艺术家用其所属流派的列
export function anchorColumnKey(anchorId, movements, artists, mvIdSet) {
  const mv = movements.find(m => m.id === anchorId)
  if (mv) return mv.posStart ?? mv.start
  const ar = artists.find(a => a.id === anchorId)
  if (!ar) return null
  if (isOrphanArtist(ar, mvIdSet)) return ar.posStart ?? ar.birth
  const m = movements.find(m => ar.movements.includes(m.id))
  return m ? (m.posStart ?? m.start) : (ar.posStart ?? ar.birth)
}
// 方案A：算出把当前条目排到 anchor 之后所需的 posStart 数字（取 anchor 键值与下一列键值的中点）
export function computePosAfter(anchorId, movements, artists, selfId) {
  const mvIdSet = new Set(movements.map(m => m.id))
  const anchorKey = anchorColumnKey(anchorId, movements, artists, mvIdSet)
  if (anchorKey == null) return ''
  const keys = []
  for (const m of movements) if (m.id !== selfId) keys.push(m.posStart ?? m.start)
  for (const a of artists) if (a.id !== selfId && isOrphanArtist(a, mvIdSet)) keys.push(a.posStart ?? a.birth)
  const greater = keys.filter(k => k > anchorKey)
  const nextKey = greater.length ? Math.min(...greater) : null
  return nextKey == null ? anchorKey + 1 : (anchorKey + nextKey) / 2
}

// ── 粘贴清洗（白名单，任何来源都只留有用内容，剥掉隐藏垃圾）──────────
// 背景：从 Figma/Word/Google Docs/网页复制会夹带隐藏元数据（如 Figma 的
// data-buffer/data-metadata 里塞着几百KB base64），看不见却撑爆文件。
const ALLOWED_TAGS = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'IMG'])

export function cleanPastedHtml(html) {
  const root = document.createElement('div')
  root.innerHTML = html
  // 1. 删掉明显的垃圾容器（含 Figma 的隐藏 buffer/metadata span）
  root.querySelectorAll('script,style,meta,link,title,[data-buffer],[data-metadata]').forEach(el => el.remove())
  // 2. 删掉注释节点（Office 的条件注释、StartFragment 等）
  const cw = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT)
  const comments = []
  while (cw.nextNode()) comments.push(cw.currentNode)
  comments.forEach(c => c.remove())
  // 3. 遍历所有元素：非白名单标签拆开只留内容；白名单标签只留必要属性
  for (const el of [...root.querySelectorAll('*')]) {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...el.childNodes)   // unwrap：保留文字/子节点，丢掉标签本身
      continue
    }
    const keep = el.tagName === 'A' ? ['href'] : el.tagName === 'IMG' ? ['src'] : []
    for (const attr of [...el.attributes]) {
      if (!keep.includes(attr.name)) el.removeAttribute(attr.name)   // 剥掉 style/class/data-*/id 等
    }
    // 图片只留 http(s) 链接，丢弃 data: 内联大图（这才是体积元凶）
    if (el.tagName === 'IMG' && !/^https?:/i.test(el.getAttribute('src') || '')) el.remove()
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noreferrer') }
  }
  return root.innerHTML
}

// 流派代表作：从一位艺术家「有配图的作品」里选一幅展示
// 优先用作品上手动标记的 repWork:true；没标记的话取中间偏后一位（避开最早期不成熟的作品）
export function pickRepWork(artist) {
  const withImg = (artist.works || []).filter(w => w.imageUrl)
  if (withImg.length === 0) return null
  const manual = withImg.find(w => w.repWork)
  if (manual) return manual
  return withImg[Math.floor(withImg.length / 2)]
}

// contenteditable 的 onPaste 处理：阻止默认，插入清洗后的 HTML（无 HTML 时插纯文本）
export function handleEditorPaste(e) {
  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain')
  e.preventDefault()
  if (html) document.execCommand('insertHTML', false, cleanPastedHtml(html))
  else if (text) document.execCommand('insertText', false, text)
}
