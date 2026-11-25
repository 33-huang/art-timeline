import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
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
// 侧栏里分两组显示；数据里新出现的标签（如以后的「英国史」）放进「其他」
const TAG_GROUPS = [
  { title: '流派和事件', tags: ['艺术和设计', '建筑', '历史大事件', '艺术相关事件'] },
  { title: '人物', tags: ['艺术家', '其他人物和团体'] },
]
const TAG_ORDER = TAG_GROUPS.flatMap(g => g.tags)
const DEFAULT_ON = ['艺术和设计']
const mvTags = m => m.tags?.length ? m.tags : [m.isEvent ? '历史大事件' : '艺术和设计']
const artTags = a => a.tags?.length ? a.tags : ['艺术家']
const LS_KEY = 'm_tags_v2'   // 2026-11-25 默认改为只选「艺术和设计」，换 key 让旧的选择失效

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
  const [panel, setPanel] = useState(false)   // 右侧标签栏
  const [zoom, setZoom] = useState(null)      // 简介里点了带图的词：{ src, title, page }
  const vRef = useRef(null)      // 上下滚动区（名字列和时间轴一起动）
  const hRef = useRef(null)      // 左右滚动区（只有时间轴）
  const rulerRef = useRef(null)  // 顶部年份刻度，跟着 hRef 横移
  const anchorRef = useRef(null) // 切换标签前记下要固定的那一条，换完放回原位
  const touchedRef = useRef(null) // 最近点过的那一条（开过卡片或点过名字）

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...on])) } catch { /* 忽略 */ }
  }, [on])

  // 侧栏分组：固定分组在前，数据里新出现的标签放进「其他」；每个标签带条目数
  const tagGroups = useMemo(() => {
    const count = new Map()
    const add = t => count.set(t, (count.get(t) || 0) + 1)
    for (const m of movements) mvTags(m).forEach(add)
    for (const a of artists) artTags(a).forEach(add)
    const known = new Set(TAG_ORDER)
    const extra = [...count.keys()].filter(t => !known.has(t))
    const groups = extra.length ? [...TAG_GROUPS, { title: '其他', tags: extra }] : TAG_GROUPS
    return groups.map(g => ({ ...g, tags: g.tags.map(t => ({ t, n: count.get(t) || 0 })) }))
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
    const personRow = (a, color, nested, keyPrefix = '') => ({ key: keyPrefix + a.id, kind: 'person', nested, name: a.zh,
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

  // 刚打开页面时，时间轴跳到最早的那一条，避免前面一大段空白（之后切换标签不再跳）
  useEffect(() => {
    const el = hRef.current
    if (!el || !rows.length) return
    const first = Math.min(...rows.map(r => r.start))
    el.scrollTo({ left: Math.max(0, xOf(first) - 16) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 记下要固定的那一条：最近点过、且还在屏幕上的那条优先，否则用屏幕最上面那一条
  function captureAnchor() {
    const v = vRef.current
    if (!v) return null
    const { top, bottom } = v.getBoundingClientRect()
    const els = [...v.querySelectorAll('.tl-name')]
    const touched = els.find(e => e.dataset.id === touchedRef.current)
    if (touched) {
      const r = touched.getBoundingClientRect()
      if (r.bottom > top && r.top < bottom) return { id: touched.dataset.id, start: Number(touched.dataset.start), offset: r.top - top }
    }
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.bottom > top + 1) return { id: el.dataset.id, start: Number(el.dataset.start), offset: r.top - top }
    }
    return null
  }

  // 切换标签后：把记下的那一条放回原位；它被隐藏了就找年份最接近的一条。左右位置不动。
  useLayoutEffect(() => {
    const a = anchorRef.current
    const v = vRef.current
    anchorRef.current = null
    if (!a || !v) return
    const els = [...v.querySelectorAll('.tl-name')]
    if (!els.length) return
    const el = els.find(e => e.dataset.id === a.id)
      ?? els.reduce((best, e) => (Math.abs(Number(e.dataset.start) - a.start) < Math.abs(Number(best.dataset.start) - a.start) ? e : best))
    v.scrollTop += el.getBoundingClientRect().top - v.getBoundingClientRect().top - a.offset
  }, [rows])

  // 打开卡片时禁止背后的列表跟着滚
  useEffect(() => {
    const v = stack.length ? 'hidden' : 'auto'
    if (vRef.current) vRef.current.style.overflowY = v
    if (hRef.current) hRef.current.style.overflowX = v
  }, [stack.length])

  function toggle(t) {
    anchorRef.current = captureAnchor()
    setOn(prev => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t); else n.add(t)
      return n
    })
  }

  // 点名字：时间轴滑到这一条（短的居中，长的让开头露出来），并闪一下高亮
  function locate(r) {
    const el = hRef.current
    if (!el) return
    const viewW = el.clientWidth
    const x1 = xOf(r.start), x2 = xOf(r.end)
    const target = x2 - x1 < viewW - 40 ? (x1 + x2) / 2 - viewW / 2 : x1 - 24
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    touchedRef.current = r.sel.data.id
    setFlash(r.key)
    setTimeout(() => setFlash(f => (f === r.key ? null : f)), 1200)
  }

  const open = sel => { touchedRef.current = sel.data.id; setStack([sel]) }
  const push = sel => setStack(st => [...st, sel])
  const back = () => setStack(st => st.slice(0, -1))
  const close = () => setStack([])
  const cur = stack[stack.length - 1]

  // 时间轴横滑时，刻度跟着移动（刻度在滚动区外面，所以不会跟着上下动）
  const syncRuler = e => {
    if (rulerRef.current) rulerRef.current.style.transform = `translateX(${-e.currentTarget.scrollLeft}px)`
  }

  const ticks = []
  for (let y = 1600; y <= MAX_YEAR; y += 50) ticks.push(y)

  return (
    <div className="m-app">
      <header className="m-header">
        <div className="m-head-row">
          <div className="m-title">知识时间轴</div>
          <button className="m-tag-btn" onClick={() => setPanel(true)} aria-label="选择标签">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
              <circle cx="7.5" cy="7.5" r="1.5" />
            </svg>
            <span className="m-tag-count">{on.size}</span>
          </button>
        </div>
        <div className="m-on" onClick={() => setPanel(true)}>
          {on.size ? TAG_ORDER.concat([...on].filter(t => !TAG_ORDER.includes(t))).filter(t => on.has(t)).join('、') : '未选标签'}
          <span className="m-on-n"> · {rows.length} 条</span>
        </div>
      </header>

      <div className="tl-ruler">
        <div className="tl-axis" ref={rulerRef} style={{ width: AXIS_W }}>
          {ticks.map(y => (
            <span key={y} className={'tl-tick' + (y % 100 === 0 ? ' major' : '')} style={{ left: xOf(y) }}>{y}</span>
          ))}
        </div>
      </div>

      {/* 上下滚动区里叠两层：下层是全宽、可左右滑的时间轴；上层是名字，只跟着上下动、不跟着左右滑 */}
      <div className="tl-v" ref={vRef}>
        {rows.length === 0 && <div className="tl-empty">没有选中的标签，点右上角的标签图标来选</div>}
        <div className="tl-body">
          <div className="tl-h" ref={hRef} onScroll={syncRuler}>
            <div style={{ width: AXIS_W }}>
              {rows.map(r => {
                const x1 = xOf(r.start)
                const w = Math.max(xOf(r.end) - x1, r.kind === 'event' ? 5 : 4)
                return (
                  <div key={r.key} onClick={() => open(r.sel)}
                    className={`tl-track ${r.kind}${flash === r.key ? ' flash' : ''}`}>
                    <span className="tl-bar" style={{ left: x1, width: w, background: r.color }} />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="tl-names">
            {rows.map(r => (
              <div key={r.key} data-id={r.sel.data.id} data-start={r.start}
                className={`tl-name ${r.kind}${r.nested ? ' nested' : ''}`}>
                <button className={'tl-name-btn' + (flash === r.key ? ' flash' : '')} onClick={() => locate(r)}>
                  {r.name}
                  <span className="tl-name-yr">{r.start === r.end ? r.start : `${r.start}–${r.end}`}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {panel && (
        <>
          <div className="m-overlay" onClick={() => setPanel(false)} />
          <aside className="m-panel" role="dialog" aria-label="标签">
            <div className="m-panel-head">
              <span>显示哪些</span>
              <button className="m-sheet-btn close" onClick={() => setPanel(false)} aria-label="关闭">×</button>
            </div>
            <div className="m-panel-body">
              {tagGroups.map(g => (
                <section key={g.title}>
                  <h3>{g.title}</h3>
                  {g.tags.map(({ t, n }) => (
                    <button key={t} className={'m-panel-item' + (on.has(t) ? ' on' : '')} onClick={() => toggle(t)}>
                      <span className="m-check" aria-hidden="true">
                        {on.has(t) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.6l4.5-5" /></svg>}
                      </span>
                      <span className="m-panel-name">{t}</span>
                      <span className="m-panel-n">{n}</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </aside>
        </>
      )}

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
            <div className="m-sheet-body" key={cur.data.id} onClick={openImageLink}>
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

      {zoom && <ImageViewer {...zoom} onClose={() => setZoom(null)} />}
    </div>
  )

  // 简介里带图的链接（<a data-img>）在页面里弹大图，不跳出去
  function openImageLink(e) {
    const a = e.target.closest('a[data-img]')
    if (!a) return
    e.preventDefault()
    setZoom({ src: a.dataset.img, title: a.textContent, page: a.dataset.src })
  }
}

function ImageViewer({ src, title, page, onClose }) {
  const [state, setState] = useState('loading')
  return (
    <div className="m-viewer" onClick={onClose} role="dialog" aria-label={title}>
      <button className="m-viewer-close" aria-label="关闭">×</button>
      {state !== 'error' && (
        <img src={src} alt={title} className={state === 'ok' ? 'on' : ''}
          onLoad={() => setState('ok')} onError={() => setState('error')} />
      )}
      {state === 'loading' && <div className="m-viewer-msg">加载中…</div>}
      {state === 'error' && <div className="m-viewer-msg">图片打不开</div>}
      <div className="m-viewer-cap" onClick={e => e.stopPropagation()}>
        <span>{title}</span>
        {page && <a href={page} target="_blank" rel="noreferrer">来源 ↗&#xFE0E;</a>}
      </div>
    </div>
  )
}
