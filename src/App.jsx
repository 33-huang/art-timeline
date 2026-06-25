import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { loadData, saveData, loadNotes, saveNotes, TOKEN_KEY } from './lib/dataStore'
import Timeline from './components/Timeline'
import DetailCard from './components/DetailCard'
import FilterBar from './components/FilterBar'
import TokenSettings from './components/TokenSettings'

function clampTip(el, cx, cy) {
  let lx = cx + 16, ly = cy - 12
  if (el) {
    if (lx + el.offsetWidth > window.innerWidth - 8) lx = cx - el.offsetWidth - 10
    if (ly + el.offsetHeight > window.innerHeight - 8) ly = cy - el.offsetHeight - 10
  }
  if (ly < 56) ly = 56   // 不低于工具栏下方，避免卡片顶部被工具栏遮住
  return { x: lx, y: ly }
}

export default function App() {
  const [movements, setMovements] = useState(null)
  const [artists, setArtists] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem(TOKEN_KEY))
  const [addingType, setAddingType] = useState(null)
  const [notes, setNotes] = useState({})
  const [showPrivate, setShowPrivate] = useState(false)

  // hover / pin 状态
  const [hoveredId, setHoveredId] = useState(null)
  const [hoveredSel, setHoveredSel] = useState(null)
  const [pinnedId, setPinnedId] = useState(null)
  const [pinnedSel, setPinnedSel] = useState(null)
  const [pinnedPrivate, setPinnedPrivate] = useState(false)
  const [pinPos, setPinPos] = useState(null)
  const hoverLocked = useRef(false)
  const hoverMouse = useRef(null)

  const cardRef = useRef(null)

  useEffect(() => {
    Promise.all([loadData('movements.json'), loadData('artists.json')])
      .then(([mvs, arts]) => { setMovements(mvs); setArtists(arts) })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (hasToken) {
      loadNotes().then(raw => {
        const norm = {}
        for (const [id, val] of Object.entries(raw)) {
          if (Array.isArray(val)) norm[id] = val
          else if (typeof val === 'string' && val) {
            norm[id] = [{ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: '笔记', content: val }]
          }
        }
        setNotes(norm)
      }).catch(() => setNotes({}))
    } else {
      setNotes({})
    }
  }, [hasToken])

  // ⌘ 抑制 + Esc 取消固定 + Shift 看私密
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Meta') {
        hoverLocked.current = true
        if (!pinnedId && !addingType) {
          setHoveredId(null); setHoveredSel(null)
          hoverMouse.current = null
        }
      }
      if (e.key === 'Shift' && !e.target.closest('[contenteditable]') &&
          e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setShowPrivate(true)
      }
      if (e.key === 'Escape') {
        if (pinnedId) { setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false) }
        if (addingType) { setAddingType(null) }
      }
    }
    function onKeyUp(e) {
      if (e.key === 'Meta') hoverLocked.current = false
      if (e.key === 'Shift') setShowPrivate(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [pinnedId, addingType])

  // hover 卡片在渲染后定位（首次 hover 时 ref 可能还没挂到可见 DOM）
  useLayoutEffect(() => {
    if (hoveredId && hoveredSel && !pinnedId && !addingType && cardRef.current && hoverMouse.current) {
      const el = cardRef.current
      el.style.display = ''
      const p = clampTip(el, hoverMouse.current.x, hoverMouse.current.y)
      el.style.left = p.x + 'px'
      el.style.top = p.y + 'px'
    }
  }, [hoveredId, hoveredSel, pinnedId, addingType])

  // hover 进入
  const onBarEnter = useCallback((id, sel, e) => {
    if (hoverLocked.current || pinnedId || addingType) return
    hoverMouse.current = { x: e.clientX, y: e.clientY }
    setHoveredId(id); setHoveredSel(sel)
    // 如果 ref 已存在就立即定位
    if (cardRef.current && cardRef.current.style.display !== 'none') {
      const p = clampTip(cardRef.current, e.clientX, e.clientY)
      cardRef.current.style.left = p.x + 'px'
      cardRef.current.style.top = p.y + 'px'
    }
  }, [pinnedId, addingType])

  // hover 移动（只移卡片位置，不触发 re-render）
  const onBarMove = useCallback((e) => {
    if (hoverLocked.current || pinnedId || addingType) return
    if (cardRef.current) {
      const p = clampTip(cardRef.current, e.clientX, e.clientY)
      cardRef.current.style.left = p.x + 'px'
      cardRef.current.style.top = p.y + 'px'
    }
  }, [pinnedId, addingType])

  // hover 离开
  const onBarLeave = useCallback(() => {
    if (pinnedId || addingType) return
    setHoveredId(null); setHoveredSel(null)
    hoverMouse.current = null
  }, [pinnedId, addingType])

  // 单击：固定 / 取消固定
  const onBarClick = useCallback((id, sel, e) => {
    if (addingType) return
    if (pinnedId === id) {
      // 取消固定
      setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
      setHoveredId(null); setHoveredSel(null)
    } else {
      // 固定：top 上限往上收，给（可能展开的）编辑器留出竖向空间
      const pos = clampTip(cardRef.current, e.clientX, e.clientY)
      pos.y = Math.min(pos.y, Math.max(56, window.innerHeight - 300))
      setPinnedId(id); setPinnedSel(sel); setPinPos(pos); setPinnedPrivate(!!e.shiftKey)
      setHoveredId(null); setHoveredSel(null)
    }
  }, [pinnedId, addingType])

  // 切换过滤器：同时清掉 hover/固定/新增，避免被隐藏项的卡片残留
  const handleFilterChange = useCallback((f) => {
    setFilter(f)
    setHoveredId(null); setHoveredSel(null); hoverMouse.current = null
    setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
    setAddingType(null)
  }, [])

  // 点空白：取消固定
  const onCanvasClick = useCallback(() => {
    if (pinnedId) {
      setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
      setHoveredId(null); setHoveredSel(null)
    }
  }, [pinnedId])

  // 高亮用的 activeId：固定 > hover
  const activeId = pinnedId || hoveredId

  // 编辑/新增/删除（与之前一致）
  async function handleSave(type, updatedItem) {
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const list = type === 'movement' ? movements : artists
    if (type === 'artist') {
      if (updatedItem.posStart === '' || updatedItem.posStart == null || isNaN(Number(updatedItem.posStart))) delete updatedItem.posStart
      else updatedItem.posStart = Number(updatedItem.posStart)
    }
    const updatedList = list.map(item => item.id === updatedItem.id ? updatedItem : item)
    await saveData(filename, updatedList)
    if (type === 'movement') setMovements(updatedList)
    else setArtists(updatedList)
    setPinnedSel({ type, data: updatedItem })
  }

  async function handleAdd(type, formData) {
    const list = type === 'movement' ? movements : artists
    const prefix = type === 'movement' ? 'mv' : 'ar'
    const maxNum = list.reduce((max, item) => {
      const n = parseInt(item.id.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    const newId = prefix + String(maxNum + 1).padStart(2, '0')
    const newItem = { id: newId, ...formData }
    if (type === 'movement') {
      if (!newItem.region) delete newItem.region
      if (!newItem.isEvent) delete newItem.isEvent
      if (!newItem.sub) delete newItem.sub
    } else {
      if (!newItem.sub) delete newItem.sub
      if (!newItem.url) delete newItem.url
      if (!newItem.works?.length) delete newItem.works
      if (newItem.posStart === '' || newItem.posStart == null || isNaN(Number(newItem.posStart))) delete newItem.posStart
      else newItem.posStart = Number(newItem.posStart)
    }
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const newList = [...list, newItem]
    await saveData(filename, newList)
    if (type === 'movement') setMovements(newList)
    else setArtists(newList)
    // 保存后直接关闭，不弹出新条目的卡片
    setAddingType(null)
    setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
    setHoveredId(null); setHoveredSel(null)
  }

  async function handleDelete(type, id) {
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const list = type === 'movement' ? movements : artists
    const newList = list.filter(item => item.id !== id)
    await saveData(filename, newList)
    if (type === 'movement') {
      setMovements(newList)
      const needsCleanup = artists.some(a => a.movements.includes(id))
      if (needsCleanup) {
        const updatedArtists = artists.map(a =>
          a.movements.includes(id) ? { ...a, movements: a.movements.filter(mid => mid !== id) } : a
        )
        await saveData('artists.json', updatedArtists)
        setArtists(updatedArtists)
      }
    } else { setArtists(newList) }
    setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
  }

  async function handleSaveNote(id, modules) {
    const updated = { ...notes, [id]: modules }
    if (!modules || modules.length === 0) delete updated[id]
    await saveNotes(updated)
    setNotes(updated)
  }

  function handleCloseCard() {
    setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
    setHoveredId(null); setHoveredSel(null)
    setAddingType(null)
  }

  function startAdd(type) {
    setPinnedId(null); setPinnedSel(null); setPinPos(null); setPinnedPrivate(false)
    setHoveredId(null); setHoveredSel(null)
    setAddingType(type)
  }

  if (error) return (
    <div style={{ padding: '2rem', color: '#f88', fontFamily: 'sans-serif' }}>加载失败：{error}</div>
  )
  if (!movements || !artists) return (
    <div style={{ padding: '2rem', color: '#aaa', fontFamily: 'sans-serif' }}>加载中…</div>
  )

  // 决定卡片 mode
  let cardMode = null
  let cardSel  = null
  if (addingType) {
    cardMode = 'adding'
  } else if (pinnedId && pinnedSel) {
    cardMode = 'pinned'
    cardSel = pinnedSel
  } else if (hoveredId && hoveredSel) {
    cardMode = 'hover'
    cardSel = hoveredSel
  }

  return (
    <>
      <div className="toolbar">
        <FilterBar filter={filter} onFilterChange={handleFilterChange} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasToken && (
            <>
              <button className="add-btn" onClick={() => startAdd('movement')}>＋ 流派</button>
              <button className="add-btn" onClick={() => startAdd('artist')}>＋ 艺术家</button>
            </>
          )}
          <TokenSettings hasToken={hasToken} onTokenChange={setHasToken} />
        </div>
      </div>

      <Timeline
        movements={movements} artists={artists} filter={filter}
        activeId={activeId}
        onBarEnter={onBarEnter} onBarMove={onBarMove}
        onBarLeave={onBarLeave} onBarClick={onBarClick}
        onCanvasClick={onCanvasClick}
      />

      <DetailCard
        mode={cardMode}
        selected={cardSel}
        movements={movements} artists={artists}
        onClose={handleCloseCard}
        hasToken={hasToken}
        onSave={handleSave}
        adding={addingType}
        onAdd={handleAdd}
        onDelete={handleDelete}
        pinPos={pinPos}
        cardRef={cardRef}
        notes={notes}
        showPrivate={(pinnedId && pinnedPrivate) || showPrivate}
        onShowPrivate={() => setPinnedPrivate(true)}
        onSaveNote={handleSaveNote}
      />
    </>
  )
}
