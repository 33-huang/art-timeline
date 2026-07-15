import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

const MIN_YEAR    = 1580
const MAX_YEAR    = 1990
const PX_PER_YEAR = 4.5
const TOP_PAD     = 20
const BOTTOM_PAD  = 40
const MIN_COL_GAP = 12
const MIN_MV_W    = 14
const MIN_ART_W   = 9
const ART_INDENT  = 3
const ART_GAP     = 2
const LABEL_GAP   = 28
const LABEL_PAD   = 3

function yearToY(yr) { return TOP_PAD + (yr - MIN_YEAR) * PX_PER_YEAR }

// 大事件统一用中性灰（忽略其自定义颜色）
const EVENT_GRAY = '#8a8a8a'

// 独立(无流派)艺术家的自动配色：按 id 稳定哈希取调色板色，代替灰色
const ORPHAN_PALETTE = ['#D45858','#D4924A','#C8A832','#4EAA72','#48B8A0','#5B9FD4','#9B7DC8']
function autoColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ORPHAN_PALETTE[Math.abs(h) % ORPHAN_PALETTE.length]
}

function hexRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// 按 posAfter「跟随」关系排列各列：设了「排在 A 后」就永远紧跟 A（A 移动 B 也跟着）。
// 无 posAfter 的按 posStart??start/birth 排；锚点找不到或成环则退回按基准键。
function orderGroups(groups, arts) {
  const isOrphan = g => g.m.id.startsWith('_orp_')
  const baseKey  = g => (g.m.posStart ?? g.m.start)
  const entId    = g => isOrphan(g) ? g.lanes[0][0].id : g.m.id
  const paOf     = g => isOrphan(g) ? g.lanes[0][0].posAfter : g.m.posAfter
  const byEnt = new Map(groups.map(g => [entId(g), g]))

  function resolveAnchor(anchorId) {
    if (byEnt.has(anchorId)) return byEnt.get(anchorId)   // 锚点是流派或独立艺术家（有独立列）
    const ar = arts.find(a => a.id === anchorId)          // 锚点是有流派的艺术家 → 落到其所属流派列
    if (ar && ar.movements) for (const mid of ar.movements) if (byEnt.has(mid)) return byEnt.get(mid)
    return null
  }

  const anchorOf = new Map()
  for (const g of groups) { const pa = paOf(g); anchorOf.set(g, pa ? resolveAnchor(pa) : null) }
  // 断环：顺着 anchor 链走回自己 → 当作无 anchor
  for (const g of groups) {
    let cur = anchorOf.get(g); const seen = new Set([g])
    while (cur) { if (seen.has(cur)) { anchorOf.set(g, null); break } seen.add(cur); cur = anchorOf.get(cur) }
  }

  const children = new Map(groups.map(g => [g, []]))
  const roots = []
  for (const g of groups) {
    const a = anchorOf.get(g)
    if (a && a !== g) children.get(a).push(g); else roots.push(g)
  }
  const bySort = (a, b) => baseKey(a) - baseKey(b) || a.m.start - b.m.start
  const out = [], emitted = new Set()
  function emit(g) {
    if (emitted.has(g)) return
    emitted.add(g); out.push(g)
    for (const c of children.get(g).slice().sort(bySort)) emit(c)
  }
  roots.sort(bySort).forEach(emit)
  groups.slice().sort(bySort).forEach(g => { if (!emitted.has(g)) emit(g) })   // 兜底：漏网的补到最后
  return out
}

function computeLayout(mvs, arts, filter, viewW) {
  const showMv  = filter !== 'artists'
  const showArt = filter !== 'movements'
  const mvIds = new Set(mvs.map(m => m.id))

  const groups = [...mvs].sort((a, b) => (a.posStart ?? a.start) - (b.posStart ?? b.start) || a.start - b.start).map(m => {
    const thisArts = arts.filter(a => a.movements.includes(m.id))
    const lanes = []
    ;[...thisArts].sort((a, b) => a.birth - b.birth).forEach(a => {
      let placed = false
      for (const lane of lanes) {
        const last = lane[lane.length - 1]
        if (a.birth >= last.death + 5) { lane.push(a); placed = true; break }
      }
      if (!placed) lanes.push([a])
    })
    return { m, lanes }
  })

  const orphans = arts.filter(a => !a.movements || !a.movements.some(id => mvIds.has(id)))
  orphans.forEach(a => {
    const start = a.posStart ?? a.birth
    groups.push({
      m: { id: '_orp_' + a.id, zh: '', start, end: a.death, color: a.color || autoColor(a.id), isHidden: true, isEvent: false },
      lanes: [[a]],
    })
  })
  // 按 posAfter 跟随关系重排（B 排在 A 后就一直跟着 A）；无 posAfter 的按 posStart/年份
  const ordered = orderGroups(groups, arts)
  groups.length = 0
  groups.push(...ordered)

  // 柱宽固定,不随流派/艺术家数量变化;画布按内容实际需要的宽度延伸,靠横向滚动容纳
  const sidePad  = 20
  const gapCount = Math.max(0, groups.length - 1)
  const mvW      = Math.max(MIN_MV_W, 36)
  const artW     = Math.max(MIN_ART_W, Math.round(mvW * 0.7))

  let totalContentW = 0
  groups.forEach(g => {
    let w = 0
    if (showMv && !g.m.isHidden) w += mvW
    if (showArt && g.lanes.length > 0) {
      if (showMv && !g.m.isHidden) w += ART_INDENT
      w += g.lanes.length * artW + (g.lanes.length - 1) * ART_GAP
    }
    g.groupW = w
    totalContentW += w
  })

  const remainW = viewW - sidePad * 2 - totalContentW
  const colGap  = gapCount > 0 ? Math.max(MIN_COL_GAP, Math.floor(remainW / gapCount)) : 0

  let x = sidePad
  groups.forEach((g, i) => {
    g.x = x
    x += g.groupW + (i < groups.length - 1 ? colGap : 0)
  })

  const canvasW = Math.max(x + sidePad, viewW)
  const canvasH = yearToY(MAX_YEAR) + BOTTOM_PAD
  return { groups, canvasW, canvasH, mvW, artW, showMv, showArt }
}

function estimateLblSize(text, fontSize, hasSub, start, end) {
  const nameW = text.length * fontSize + 4
  const yrW   = `${start}—${end}`.length * 5.5 + 4
  const w     = Math.max(nameW, yrW, 18)
  const h     = fontSize * 1.35 + 9 * 1.35 + (hasSub ? 8.5 * 1.35 : 0) + 2
  return { w, h }
}

function resolveLabels(infos) {
  infos.sort((a, b) => b.idealTop - a.idealTop)
  const placed = []
  for (const info of infos) {
    let y  = Math.max(2, info.idealTop)
    const lx = info.anchorX - info.lblW / 2
    const rx = lx + info.lblW
    let iter = 200, moved = true
    while (moved && iter-- > 0) {
      moved = false
      for (const p of placed) {
        if (rx + LABEL_PAD > p.lx && lx < p.rx + LABEL_PAD &&
            y + info.lblH + LABEL_PAD > p.y && y < p.y + p.h + LABEL_PAD) {
          y = Math.max(2, p.y - info.lblH - LABEL_PAD)
          moved = true
          break
        }
      }
    }
    info.resolvedTop = y
    placed.push({ lx, rx, y, h: info.lblH })
  }
}

function buildRenderData(lo) {
  const { groups, mvW, artW, showMv, showArt, canvasW } = lo

  const gridLines = []
  for (let yr = 1600; yr <= MAX_YEAR; yr += 10)
    gridLines.push({ y: yearToY(yr), major: yr % 50 === 0 })

  const axisLabels = []
  for (let yr = 1600; yr <= 1980; yr += 50)
    axisLabels.push({ y: yearToY(yr), yr })

  const bars       = []
  const labelInfos = []

  groups.forEach(({ m, lanes, x }) => {
    if (showMv && !m.isHidden) {
      const y1   = yearToY(m.start)
      const barH = Math.max(yearToY(m.end) - y1, 8)
      const barCx = x + mvW / 2

      if (m.isEvent) {
        const evW = Math.round(mvW * 0.55)
        const evX = x + Math.round((mvW - evW) / 2)
        bars.push({
          key: 'm:' + m.id, id: 'm:' + m.id, cls: 'mv-bar',
          geom: { left: evX, top: y1, width: evW, height: barH },
          color: EVENT_GRAY, isEvent: true, isArt: false,
          sel: { type: 'movement', data: m },
        })
      } else {
        bars.push({
          key: 'm:' + m.id, id: 'm:' + m.id, cls: 'mv-bar',
          geom: { left: x, top: y1, width: mvW, height: barH, border: `1.5px solid ${m.color}` },
          color: m.color, isEvent: false, isArt: false,
          sel: { type: 'movement', data: m },
        })
      }

      const hasSub = !!m.sub
      const mColor = m.isEvent ? EVENT_GRAY : m.color                       // 大事件名字用灰色
      const mYr = m.start === m.end ? `${m.start}` : `${m.start}—${m.end}`  // 单年事件只显示一个年份
      const { w: lblW, h: lblH } = estimateLblSize(m.zh, 10, hasSub, m.start, m.end)
      labelInfos.push({
        key: 'm:' + m.id, id: 'm:' + m.id, anchorX: barCx, anchorY: y1, lblW, lblH,
        idealTop: y1 - LABEL_GAP - lblH,
        html: `<span class="lbl-name" style="color:${mColor}">${m.zh}</span>${hasSub ? `<span class="lbl-sub">${m.sub}</span>` : ''}<span class="lbl-yr">${mYr}</span>`,
        sel: { type: 'movement', data: m }, art: false, color: mColor,
      })
    }

    if (showArt) {
      const artX0 = (showMv && !m.isHidden) ? x + mvW + ART_INDENT : x
      lanes.forEach((lane, li) => {
        const artX  = artX0 + li * (artW + ART_GAP)
        const artCx = artX + artW / 2
        lane.forEach(a => {
          const ay1 = yearToY(a.birth)
          const ah  = Math.max(yearToY(a.death) - ay1, 6)
          bars.push({
            key: 'a:' + m.id + ':' + a.id, id: 'a:' + a.id, cls: 'art-bar',
            geom: { left: artX, top: ay1, width: artW, height: ah, border: `1px solid ${m.color}` },
            color: m.color, isEvent: false, isArt: true,
            sel: { type: 'artist', data: a },
          })
          const hasSub = !!a.sub
          const { w: lblW, h: lblH } = estimateLblSize(a.zh, 9, hasSub, a.birth, a.death)
          labelInfos.push({
            key: 'a:' + m.id + ':' + a.id, id: 'a:' + a.id, anchorX: artCx, anchorY: ay1, lblW, lblH,
            idealTop: ay1 - LABEL_GAP - lblH,
            html: `<span class="lbl-name" style="color:${m.color}">${a.zh}</span>${hasSub ? `<span class="lbl-sub">${a.sub}</span>` : ''}<span class="lbl-yr">${a.birth}—${a.death}</span>`,
            sel: { type: 'artist', data: a }, art: true, color: m.color,
          })
        })
      })
    }
  })

  resolveLabels(labelInfos)

  const labels = []
  const conns  = []
  labelInfos.forEach(info => {
    const left = Math.max(0, Math.min(info.anchorX - info.lblW / 2, canvasW - info.lblW))
    labels.push({
      key: info.key, id: info.id, html: info.html,
      style: { left, top: info.resolvedTop },
      sel: info.sel, art: info.art,
    })
    const connTop = info.resolvedTop + info.lblH
    const connH   = info.anchorY - connTop
    if (connH > 3) {
      conns.push({ key: info.key, id: info.id, style: { left: info.anchorX, top: connTop, height: connH } })
    }
  })

  return { gridLines, axisLabels, bars, labels, conns }
}

// 计算「相关项」集合（照 v2 applyHover 逻辑）
function computeRelated(activeId, movements, artists) {
  if (!activeId) return null
  const [t, itemId] = [activeId.slice(0, 1), activeId.slice(2)]
  const set = new Set([activeId])
  if (t === 'm') {
    artists.forEach(a => { if (a.movements.includes(itemId)) set.add('a:' + a.id) })
  } else {
    // hover 艺术家：只高亮该艺术家 + 其所属流派（不高亮同门艺术家，与 v2 一致）
    const art = artists.find(a => a.id === itemId)
    if (art) art.movements.forEach(mid => set.add('m:' + mid))
  }
  return set
}

// 按 hover 状态算 bar 背景色（照 v2 applyHover）
function barBg(bar, related) {
  if (!related) {
    if (bar.isEvent) return hexRgba(bar.color, 0.25)
    return bar.isArt ? 'var(--bar-artist-bg)' : hexRgba(bar.color, 0.15)
  }
  const rel = related.has(bar.id)
  if (bar.isEvent) return hexRgba(bar.color, rel ? 0.45 : 0.25)
  if (rel) return bar.isArt ? hexRgba(bar.color, 0.35) : bar.color
  return bar.isArt ? 'var(--bar-artist-bg)' : hexRgba(bar.color, 0.15)
}

export default function Timeline({
  movements, artists, filter,
  activeId, onBarEnter, onBarMove, onBarLeave, onBarClick, onCanvasClick,
}) {
  const scrollRef = useRef(null)
  const axisRef   = useRef(null)
  const [viewW, setViewW] = useState(0)

  useEffect(() => {
    if (!scrollRef.current) return
    const obs = new ResizeObserver(ents => setViewW(ents[0].contentRect.width))
    obs.observe(scrollRef.current)
    return () => obs.disconnect()
  }, [])

  const lo = useMemo(
    () => viewW > 0 ? computeLayout(movements, artists, filter, viewW) : null,
    [movements, artists, filter, viewW]
  )
  const rd = useMemo(() => lo ? buildRenderData(lo) : null, [lo])

  const related = useMemo(
    () => computeRelated(activeId, movements, artists),
    [activeId, movements, artists]
  )

  const onScroll = useCallback(e => {
    if (axisRef.current) axisRef.current.style.transform = `translateY(${-e.target.scrollTop}px)`
  }, [])

  const handleCanvasClick = useCallback(e => {
    if (!e.target.closest('[data-bar-id]')) onCanvasClick?.()
  }, [onCanvasClick])

  if (!lo || !rd) return <div className="timeline-wrap" ref={scrollRef} />

  return (
    <div className="timeline-wrap">
      <div className="axis-col">
        <div className="axis-inner" ref={axisRef} style={{ height: lo.canvasH }}>
          {rd.axisLabels.map(({ y, yr }) => (
            <div key={yr} className="axis-label" style={{ top: y }}>{yr}</div>
          ))}
        </div>
      </div>

      <div className="scroll-area" ref={scrollRef} onScroll={onScroll}>
        <div className="timeline-canvas" style={{ width: lo.canvasW, height: lo.canvasH }}
          onClick={handleCanvasClick}
          onMouseMove={e => { if (!e.target.closest('[data-bar-id]')) onBarLeave?.() }}
          onMouseLeave={() => onBarLeave?.()}>

          {rd.gridLines.map(({ y, major }) => (
            <div key={y} className={major ? 'grid-line major' : 'grid-line'}
              style={{ top: y, width: lo.canvasW }} />
          ))}

          {rd.bars.map(bar => {
            const bg = barBg(bar, related)
            const dim = related && !related.has(bar.id)
            return (
              <div key={bar.key} data-bar-id={bar.id}
                className={bar.cls + (dim ? ' dimmed' : '')}
                style={{ ...bar.geom, background: bg }}
                onClick={e => { e.stopPropagation(); onBarClick?.(bar.id, bar.sel, e) }}
                onMouseEnter={e => onBarEnter?.(bar.id, bar.sel, e)}
                onMouseMove={e => onBarMove?.(e)}
                onMouseLeave={() => onBarLeave?.()}
              />
            )
          })}

          {rd.conns.map(conn => {
            const dim = related && !related.has(conn.id)
            return (
              <div key={'C' + conn.key}
                className={`bar-conn${dim ? ' dimmed' : ''}`}
                style={conn.style} />
            )
          })}

          {rd.labels.map(lbl => {
            const dim = related && !related.has(lbl.id)
            return (
              <div key={'L' + lbl.key} data-bar-id={lbl.id}
                className={`bar-label${lbl.art ? ' art' : ''}${dim ? ' dimmed' : ''}`}
                style={lbl.style}
                onClick={e => { e.stopPropagation(); onBarClick?.(lbl.id, lbl.sel, e) }}
                onMouseEnter={e => onBarEnter?.(lbl.id, lbl.sel, e)}
                onMouseMove={e => onBarMove?.(e)}
                onMouseLeave={() => onBarLeave?.()}
                dangerouslySetInnerHTML={{ __html: lbl.html }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
