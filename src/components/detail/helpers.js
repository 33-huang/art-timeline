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
