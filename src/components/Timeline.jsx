import { useState, useRef, useEffect, useMemo } from 'react'

// ── 常量（与 v2 完全一致）────────────────────────────────────
const MIN_YEAR    = 1580
const MAX_YEAR    = 1990
const PX_PER_YEAR = 4.5
const TOP_PAD     = 20
const BOTTOM_PAD  = 40
const MIN_COL_GAP = 4
const MIN_MV_W    = 14
const MIN_ART_W   = 9
const ART_INDENT  = 3
const ART_GAP     = 2
const LABEL_GAP   = 28
const LABEL_PAD   = 3

function yearToY(yr) {
  return TOP_PAD + (yr - MIN_YEAR) * PX_PER_YEAR
}

function hexRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ── 列布局算法（移植自 v2 computeLayout）────────────────────
function computeLayout(mvs, arts, filter, viewW) {
  const showMv  = filter !== 'artists'
  const showArt = filter !== 'movements'

  const mvIds = new Set(mvs.map(m => m.id))

  // 每个流派对应一个 group，包含其艺术家的贪心泳道分配
  const groups = [...mvs]
    .sort((a, b) => a.start - b.start)
    .map(m => {
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

  // 孤儿艺术家（不属于任何流派）→ 虚拟隐藏流派
  const orphans = arts.filter(
    a => !a.movements || !a.movements.some(id => mvIds.has(id))
  )
  orphans.forEach(a => {
    const start = a.posStart ?? a.birth
    groups.push({
      m: { id: '_orp_' + a.id, zh: '', start, end: a.death, color: a.color || '#aaaaaa', isHidden: true, isEvent: false },
      lanes: [[a]],
    })
  })
  groups.sort((a, b) => a.m.start - b.m.start)

  // 计算总 slot 数
  let totalSlots = 0
  groups.forEach(g => {
    if (showMv && !g.m.isHidden) totalSlots += 1
    if (showArt) totalSlots += g.lanes.length
  })
  if (totalSlots === 0) totalSlots = 1

  // 分配宽度
  const sidePad      = 20
  const artIndentTot = groups.reduce((s, g) => (showMv && !g.m.isHidden && showArt && g.lanes.length > 0) ? s + ART_INDENT : s, 0)
  const artGapTot    = groups.reduce((s, g) => showArt && g.lanes.length > 1 ? s + (g.lanes.length - 1) * ART_GAP : s, 0)
  const gapCount     = Math.max(0, groups.length - 1)
  const minGapTot    = gapCount * MIN_COL_GAP
  const availW       = viewW - sidePad * 2 - artIndentTot - artGapTot - minGapTot

  let slotW = Math.max(MIN_MV_W, Math.floor(availW / totalSlots))
  slotW = Math.min(slotW, 36)
  const mvW  = slotW
  const artW = Math.max(MIN_ART_W, Math.round(slotW * 0.7))

  // 每组实际宽度
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

// ── 估算标签尺寸（用于避碰，替代 v2 的 DOM 测量）────────────
function estimateLblSize(text, fontSize, hasSub, start, end) {
  const nameW = text.length * fontSize + 4
  const yrW   = `${start}—${end}`.length * 5.5 + 4
  const w     = Math.max(nameW, yrW, 18)
  const h     = fontSize * 1.35 + 9 * 1.35 + (hasSub ? 8.5 * 1.35 : 0) + 2
  return { w, h }
}

// ── 标签 Y 轴避碰（移植自 v2 collision avoidance）────────────
function resolveLabels(infos) {
  infos.sort((a, b) => b.idealTop - a.idealTop)   // 从屏幕最低处开始
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

// ── 渲染数据：三遍（bars → resolveLabels → labels+conns）────
function buildRenderData(lo) {
  const { groups, mvW, artW, showMv, showArt, canvasW } = lo

  // 网格线
  const gridLines = []
  for (let yr = 1600; yr <= MAX_YEAR; yr += 10) {
    gridLines.push({ y: yearToY(yr), major: yr % 50 === 0 })
  }

  // 年份轴标签（每 50 年）
  const axisLabels = []
  for (let yr = 1600; yr <= 1980; yr += 50) {
    axisLabels.push({ y: yearToY(yr), yr })
  }

  const bars       = []
  const labelInfos = []

  groups.forEach(({ m, lanes, x }) => {
    // ── 流派条 ──
    if (showMv && !m.isHidden) {
      const y1    = yearToY(m.start)
      const barH  = Math.max(yearToY(m.end) - y1, 8)
      const barCx = x + mvW / 2

      if (m.isEvent) {
        const evW = Math.round(mvW * 0.55)
        const evX = x + Math.round((mvW - evW) / 2)
        bars.push({
          id: 'm:' + m.id, cls: 'mv-bar',
          style: { left: evX, top: y1, width: evW, height: barH, background: hexRgba(m.color, 0.25) },
          sel: { type: 'movement', data: m },
        })
      } else {
        bars.push({
          id: 'm:' + m.id, cls: 'mv-bar',
          style: { left: x, top: y1, width: mvW, height: barH, background: hexRgba(m.color, 0.15), border: `1.5px solid ${m.color}` },
          sel: { type: 'movement', data: m },
        })
      }

      // 标签（含大事件）
      const hasSub = !!m.sub
      const { w: lblW, h: lblH } = estimateLblSize(m.zh, 10, hasSub, m.start, m.end)
      labelInfos.push({
        id: 'm:' + m.id, anchorX: barCx, anchorY: y1, lblW, lblH,
        idealTop: y1 - LABEL_GAP - lblH,
        html: `<span class="lbl-name" style="color:${m.color}">${m.zh}</span>${hasSub ? `<span class="lbl-sub">${m.sub}</span>` : ''}<span class="lbl-yr">${m.start}—${m.end}</span>`,
        sel: { type: 'movement', data: m }, art: false, color: m.color,
      })
    }

    // ── 艺术家条 ──
    if (showArt) {
      const artX0 = (showMv && !m.isHidden) ? x + mvW + ART_INDENT : x
      lanes.forEach((lane, li) => {
        const artX  = artX0 + li * (artW + ART_GAP)
        const artCx = artX + artW / 2
        lane.forEach(a => {
          const ay1 = yearToY(a.birth)
          const ah  = Math.max(yearToY(a.death) - ay1, 6)
          bars.push({
            id: 'a:' + a.id, cls: 'art-bar',
            style: { left: artX, top: ay1, width: artW, height: ah, background: 'var(--bar-artist-bg)', border: `1px solid ${m.color}` },
            sel: { type: 'artist', data: a },
          })
          const hasSub = !!a.sub
          const { w: lblW, h: lblH } = estimateLblSize(a.zh, 9, hasSub, a.birth, a.death)
          labelInfos.push({
            id: 'a:' + a.id, anchorX: artCx, anchorY: ay1, lblW, lblH,
            idealTop: ay1 - LABEL_GAP - lblH,
            html: `<span class="lbl-name" style="color:${m.color}">${a.zh}</span>${hasSub ? `<span class="lbl-sub">${a.sub}</span>` : ''}<span class="lbl-yr">${a.birth}—${a.death}</span>`,
            sel: { type: 'artist', data: a }, art: true, color: m.color,
          })
        })
      })
    }
  })

  // 避碰计算
  resolveLabels(labelInfos)

  const labels = []
  const conns  = []

  labelInfos.forEach(info => {
    const left = Math.max(0, Math.min(info.anchorX - info.lblW / 2, canvasW - info.lblW))
    labels.push({
      id: info.id, html: info.html,
      style: { left, top: info.resolvedTop },
      sel: info.sel, art: info.art,
    })
    const connTop = info.resolvedTop + info.lblH
    const connH   = info.anchorY - connTop
    if (connH > 3) {
      conns.push({
        id: info.id,
        style: { left: info.anchorX, top: connTop, height: connH },
      })
    }
  })

  return { gridLines, axisLabels, bars, labels, conns }
}

// ── 主组件 ────────────────────────────────────────────────────
export default function Timeline({ movements, artists, onSelect, filter }) {
  const scrollRef = useRef(null)
  const axisRef   = useRef(null)
  const [viewW, setViewW] = useState(0)
  const [hoveredId, setHoveredId] = useState(null)

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

  const onScroll = (e) => {
    if (axisRef.current) {
      axisRef.current.style.transform = `translateY(${-e.target.scrollTop}px)`
    }
  }

  if (!lo || !rd) return <div className="timeline-wrap" ref={scrollRef} />

  return (
    <div className="timeline-wrap">
      {/* 左侧年份轴（通过 JS transform 与滚动同步）*/}
      <div className="axis-col">
        <div className="axis-inner" ref={axisRef} style={{ height: lo.canvasH }}>
          {rd.axisLabels.map(({ y, yr }) => (
            <div key={yr} className="axis-label" style={{ top: y }}>{yr}</div>
          ))}
        </div>
      </div>

      {/* 可竖向滚动的时间轴主体 */}
      <div className="scroll-area" ref={scrollRef} onScroll={onScroll}>
        <div className="timeline-canvas" style={{ width: lo.canvasW, height: lo.canvasH }}>

          {/* 网格线 */}
          {rd.gridLines.map(({ y, major }) => (
            <div key={y} className={major ? 'grid-line major' : 'grid-line'}
              style={{ top: y, width: lo.canvasW }} />
          ))}

          {/* 流派条 / 艺术家条 */}
          {rd.bars.map(bar => (
            <div
              key={bar.id}
              className={bar.cls + (hoveredId && hoveredId !== bar.id ? ' dimmed' : '')}
              style={bar.style}
              onClick={() => onSelect(bar.sel)}
              onMouseEnter={() => setHoveredId(bar.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}

          {/* 连接线（虚线：标签底部 → 色块顶部）*/}
          {rd.conns.map(conn => (
            <div
              key={'C' + conn.id}
              className={`bar-conn${hoveredId && hoveredId !== conn.id ? ' dimmed' : ''}`}
              style={conn.style}
            />
          ))}

          {/* 标签（名称 + 年份，带避碰）*/}
          {rd.labels.map(lbl => (
            <div
              key={'L' + lbl.id}
              className={`bar-label${lbl.art ? ' art' : ''}${hoveredId && hoveredId !== lbl.id ? ' dimmed' : ''}`}
              style={lbl.style}
              onClick={() => onSelect(lbl.sel)}
              onMouseEnter={() => setHoveredId(lbl.id)}
              onMouseLeave={() => setHoveredId(null)}
              dangerouslySetInnerHTML={{ __html: lbl.html }}
            />
          ))}

        </div>
      </div>
    </div>
  )
}
