import { useState, useMemo, useEffect, useRef } from 'react'
import { MovementView, ArtistView } from './detail/PublicViews'
import { ViewStyleContext } from './detail/viewStyle'
import { sMobile } from './detail/styles'

// 手机视图：左列名字（横向滑动时固定）+ 右侧可横向滑动的时间轴。
// 顶部一排多选标签决定显示哪些条目；点名字=时间轴滑到它的位置，点轴上那一行=弹出卡片。只读。
const MIN_YEAR = 1580
const MAX_YEAR = 2000
const PX = 3                 // 每年多少像素
const PAD = 12               // 时间轴左右留白
const AXIS_W = PAD + (MAX_YEAR - MIN_YEAR) * PX + 80   // 右边多留一点给年份文字
const EVENT_GRAY = '#8a8a8a'
const ORPHAN_PALETTE = ['#D45858','#D4924A','#C8A832','#4EAA72','#48B8A0','#5B9FD4','#9B7DC8']
function autoColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ORPHAN_PALETTE[Math.abs(h) % ORPHAN_PALETTE.length]
}
const xOf = yr => PAD + (Math.min(Math.max(yr, MIN_YEAR), MAX_YEAR) - MIN_YEAR) * PX

// 标签：数据里没有 tags 的条目按类型给默认值
const TAG_ORDER = ['艺术和设计', '建筑', '历史大事件', '艺术家', '其他人物和团体']
const DEFAULT_ON = ['艺术和设计', '历史大事件']
const mvTags = m => m.tags?.length ? m.tags : [m.isEvent ? '历史大事件' : '艺术和设计']
const artTags = a => a.tags?.length ? a.tags : ['艺术家']
const LS_KEY = 'm_tags'
// 人名太长时只显示最后一段（姓），全名在卡片里看
const shortName = n => (n.length > 6 && n.includes('·') ? n.split('·').pop() : n)

function loadTags() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY))
    if (Array.isArray(v) && v.length) return new Set(v)
  } catch { /* 读不到就用默认 */ }
  return new Set(DEFAULT_ON)
}

export default function MobileView({ movements, artists }) {
  const [on, setOn] = useState(loadTags)
  const [stack, setStack] = useState([])   // 卡片里点名字会往下钻，可返回
  const [flash, setFlash] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...on])) } catch { /* 忽略 */ }
  }, [on])

  // 所有标签：固定顺序在前，数据里新出现的（如以后的「英国史」）接在后面
  const allTags = useMemo(() => {
    const seen = new Set(TAG_ORDER)
    const extra = []
    for (const m of movements) for (const t of mvTags(m)) if (!seen.has(t)) { seen.add(t); extra.push(t) }
    for (const a of artists) for (const t of artTags(a)) if (!seen.has(t)) { seen.add(t); extra.push(t) }
    return [...TAG_ORDER, ...extra]
  }, [movements, artists])

  const mvMap = useMemo(() => new Map(movements.map(m => [m.id, m])), [movements])

  // 组装行：流派和人物同时显示时，人物缩进排在自己的流派下面；否则一律按开始年份排
  const rows = useMemo(() => {
    const hit = tags => tags.some(t => on.has(t))
    const mvs = movements.filter(m => hit(mvTags(m))).sort((a, b) => a.start - b.start || a.end - b.end)
    const people = artists.filter(a => hit(artTags(a))).sort((a, b) => a.birth - b.birth || a.death - b.death)
    const colorOf = a => {
      if (a.color) return a.color
      const m = (a.movements ?? []).map(id => mvMap.get(id)).find(Boolean)
      return m ? m.color : autoColor(a.id)
    }
    const mvRow = m => ({ key: m.id, kind: m.isEvent ? 'event' : 'mv', name: m.zh, start: m.start, end: m.end,
      color: m.isEvent ? EVENT_GRAY : m.color, sel: { type: 'movement', data: m } })
    const personRow = (a, color, nested, keyPrefix = '') => ({ key: keyPrefix + a.id, kind: 'person', nested, name: shortName(a.zh),
      start: a.birth, end: a.death, color, sel: { type: 'artist', data: a } })

    if (!mvs.length || !people.length) {
      return [...mvs.map(mvRow), ...people.map(a => personRow(a, colorOf(a), false))]
        .sort((a, b) => a.start - b.start || a.end - b.end)
    }
    const shownMv = new Set(mvs.map(m => m.id))
    const tops = [
      ...mvs.map(m => ({ start: m.start, end: m.end, m })),
      ...people.filter(a => !(a.movements ?? []).some(id => shownMv.has(id)))
        .map(a => ({ start: a.birth, end: a.death, a })),
    ].sort((x, y) => x.start - y.start || x.end - y.end)
    const out = []
    for (const t of tops) {
      if (t.a) { out.push(personRow(t.a, colorOf(t.a), false)); continue }
      out.push(mvRow(t.m))
      for (const a of people) {
        if ((a.movements ?? []).includes(t.m.id)) out.push(personRow(a, a.color || t.m.color, true, t.m.id + ':'))
      }
    }
    return out
  }, [movements, artists, on, mvMap])

  // 切换标签后，时间轴跳到最早的那一条，避免前面一大段空白
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !rows.length) return
    const first = Math.min(...rows.map(r => r.start))
    el.scrollTo({ left: Math.max(0, xOf(first) - 16) })
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps

  // 打开卡片时禁止背后的列表跟着滚
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.style.overflow = stack.length ? 'hidden' : 'auto'
  }, [stack.length])

  function toggle(t) {
    setOn(prev => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t); else n.add(t)
      return n
    })
  }

  // 点名字：时间轴滑到这一条（短的居中，长的让开头露出来），并闪一下高亮
  function locate(r) {
    const el = scrollRef.current
    if (!el) return
    const nameW = el.querySelector('.tl-name')?.offsetWidth ?? 0
    const viewW = el.clientWidth - nameW
    const x1 = xOf(r.start), x2 = xOf(r.end)
    const target = x2 - x1 < viewW - 40 ? (x1 + x2) / 2 - viewW / 2 : x1 - 24
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    setFlash(r.key)
    setTimeout(() => setFlash(f => (f === r.key ? null : f)), 1200)
  }

  const open = sel => setStack([sel])
  const push = sel => setStack(st => [...st, sel])
  const back = () => setStack(st => st.slice(0, -1))
  const close = () => setStack([])
  const cur = stack[stack.length - 1]

  const ticks = []
  for (let y = 1600; y <= MAX_YEAR; y += 50) ticks.push(y)

  return (
    <div className="m-app">
      <header className="m-header">
        <div className="m-title">艺术时间轴</div>
        <div className="m-chips">
          {allTags.map(t => (
            <button key={t} className={on.has(t) ? 'on' : ''} onClick={() => toggle(t)}>{t}</button>
          ))}
        </div>
      </header>

      <div className="tl-scroll" ref={scrollRef}>
        <div className="tl-ruler">
          <div className="tl-name tl-corner">{rows.length} 条</div>
          <div className="tl-axis" style={{ width: AXIS_W }}>
            {ticks.map(y => (
              <span key={y} className={'tl-tick' + (y % 100 === 0 ? ' major' : '')} style={{ left: xOf(y) }}>{y}</span>
            ))}
          </div>
        </div>

        {rows.length === 0 && <div className="tl-empty">没有选中的标签，点上面的标签来显示</div>}

        {rows.map(r => {
          const x1 = xOf(r.start)
          const w = Math.max(xOf(r.end) - x1, r.kind === 'event' ? 6 : 4)
          const yrs = r.start === r.end ? `${r.start}` : `${r.start}–${r.end}`
          return (
            <div key={r.key} className={`tl-row ${r.kind}${r.nested ? ' nested' : ''}${flash === r.key ? ' flash' : ''}`}>
              <button className="tl-name" onClick={() => locate(r)}>
                <span className="tl-name-txt">{r.name}</span>
              </button>
              <div className="tl-track" style={{ width: AXIS_W }} onClick={() => open(r.sel)}>
                <span className="tl-bar" style={{ left: x1, width: w, background: r.color }} />
                <span className="tl-yr" style={{ left: x1 + w + 5 }}>{yrs}</span>
              </div>
            </div>
          )
        })}
      </div>

      {cur && (
        <>
          <div className="m-overlay" onClick={close} />
          <div className="m-sheet" role="dialog">
            <div className="m-sheet-bar">
              {stack.length > 1
                ? <button className="m-sheet-btn" onClick={back}>‹ 返回</button>
                : <span />}
              <button className="m-sheet-btn close" onClick={close} aria-label="关闭">×</button>
            </div>
            <div className="m-sheet-body" key={cur.data.id}>
              <ViewStyleContext.Provider value={sMobile}>
                {cur.type === 'movement'
                  ? <MovementView data={cur.data} artists={artists}
                      onPickArtist={a => push({ type: 'artist', data: a })} />
                  : <ArtistView data={cur.data} movements={movements}
                      onPickMovement={m => push({ type: 'movement', data: m })} />}
              </ViewStyleContext.Provider>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
