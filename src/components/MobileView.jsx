import { useState, useMemo, useEffect } from 'react'
import { MovementView, ArtistView } from './detail/PublicViews'
import { ViewStyleContext } from './detail/viewStyle'
import { sMobile } from './detail/styles'

// 手机视图：按年代排的列表 + 点开从底部弹出的卡片。只读，不含编辑和私密笔记。
const MIN_YEAR = 1580
const MAX_YEAR = 1990
const EVENT_GRAY = '#8a8a8a'
const ORPHAN_PALETTE = ['#D45858','#D4924A','#C8A832','#4EAA72','#48B8A0','#5B9FD4','#9B7DC8']
function autoColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ORPHAN_PALETTE[Math.abs(h) % ORPHAN_PALETTE.length]
}

const century = yr => Math.floor((yr - 1) / 100) + 1
const pct = yr => ((Math.min(Math.max(yr, MIN_YEAR), MAX_YEAR) - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100

// 一条细轴，标出这一项在 1580–1990 里的位置，方便上下对比
function RangeTrack({ start, end, color }) {
  const left = pct(start)
  const width = Math.max(pct(end) - left, 1.2)
  return (
    <div className="m-track">
      {[1700, 1800, 1900].map(y => <span key={y} className="m-track-tick" style={{ left: pct(y) + '%' }} />)}
      <span className="m-track-bar" style={{ left: left + '%', width: width + '%', background: color }} />
    </div>
  )
}

function groupByCentury(items, yearOf) {
  const out = []
  for (const it of items) {
    const c = century(yearOf(it))
    if (!out.length || out[out.length - 1].c !== c) out.push({ c, items: [] })
    out[out.length - 1].items.push(it)
  }
  return out
}

export default function MobileView({ movements, artists }) {
  const [tab, setTab] = useState('mv')
  const [stack, setStack] = useState([])   // 卡片里点名字会往下钻，可返回

  const mvMap = useMemo(() => new Map(movements.map(m => [m.id, m])), [movements])
  const artColor = a => {
    if (a.color) return a.color
    const m = (a.movements ?? []).map(id => mvMap.get(id)).find(Boolean)
    return m ? m.color : autoColor(a.id)
  }

  const mvGroups = useMemo(() => groupByCentury(
    [...movements].sort((a, b) => a.start - b.start || a.end - b.end), m => m.start
  ), [movements])
  const artGroups = useMemo(() => groupByCentury(
    [...artists].sort((a, b) => a.birth - b.birth || a.death - b.death), a => a.birth
  ), [artists])

  // 打开卡片时禁止背后的列表跟着滚
  useEffect(() => {
    const el = document.querySelector('.m-scroll')
    if (el) el.style.overflowY = stack.length ? 'hidden' : 'auto'
  }, [stack.length])

  const open = sel => setStack([sel])
  const push = sel => setStack(st => [...st, sel])
  const back = () => setStack(st => st.slice(0, -1))
  const close = () => setStack([])
  const cur = stack[stack.length - 1]

  return (
    <div className="m-app">
      <header className="m-header">
        <div className="m-title">艺术时间轴</div>
        <div className="m-seg">
          <button className={tab === 'mv' ? 'on' : ''} onClick={() => setTab('mv')}>流派和事件</button>
          <button className={tab === 'art' ? 'on' : ''} onClick={() => setTab('art')}>艺术家</button>
        </div>
      </header>

      <div className="m-scroll">
        {tab === 'mv' && mvGroups.map(g => (
          <section key={g.c}>
            <h2 className="m-century">{g.c} 世纪</h2>
            {g.items.map(m => {
              const color = m.isEvent ? EVENT_GRAY : m.color
              const names = artists.filter(a => (a.movements ?? []).includes(m.id)).map(a => a.zh)
              return (
                <button key={m.id} className={'m-row' + (m.isEvent ? ' event' : '')}
                  onClick={() => open({ type: 'movement', data: m })}>
                  <span className="m-dot" style={{ background: color }} />
                  <span className="m-body">
                    <span className="m-line1">
                      <span className="m-name" style={{ color: m.isEvent ? 'var(--text-muted)' : undefined }}>
                        {m.zh}{m.isEvent && <span className="m-tag">大事件</span>}
                      </span>
                      <span className="m-years">{m.start === m.end ? m.start : `${m.start}–${m.end}`}</span>
                    </span>
                    {names.length > 0 && <span className="m-sub">{names.join('、')}</span>}
                    <RangeTrack start={m.start} end={m.end} color={color} />
                  </span>
                </button>
              )
            })}
          </section>
        ))}

        {tab === 'art' && artGroups.map(g => (
          <section key={g.c}>
            <h2 className="m-century">{g.c} 世纪出生</h2>
            {g.items.map(a => {
              const color = artColor(a)
              const mvNames = (a.movements ?? []).map(id => mvMap.get(id)?.zh).filter(Boolean)
              return (
                <button key={a.id} className="m-row" onClick={() => open({ type: 'artist', data: a })}>
                  <span className="m-dot" style={{ background: color }} />
                  <span className="m-body">
                    <span className="m-line1">
                      <span className="m-name">{a.zh}</span>
                      <span className="m-years">{a.birth}–{a.death}</span>
                    </span>
                    {mvNames.length > 0 && <span className="m-sub">{mvNames.join('、')}</span>}
                    <RangeTrack start={a.birth} end={a.death} color={color} />
                  </span>
                </button>
              )
            })}
          </section>
        ))}
        <div className="m-foot">1580 — 1990</div>
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
