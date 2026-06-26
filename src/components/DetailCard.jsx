import { useState, useEffect, useRef } from 'react'

const COLOR_PALETTE = ['#D45858','#D4924A','#C8A832','#4EAA72','#48B8A0','#5B9FD4','#9B7DC8']

// ── 公开卡：只读流派 ──────────────────────────────────
function MovementView({ data, artists }) {
  const reps = artists.filter(a => a.movements.includes(data.id))
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      <div style={s.meta}>
        {data.start}–{data.end}{data.region ? ` · ${data.region}` : ''}
        {reps.length > 0 && <><br />代表艺术家：{reps.map(a => a.zh).join('、')}</>}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {data.url && (
        <div style={{ marginTop: 6 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>
        </div>
      )}
    </>
  )
}

// ── 公开卡：只读艺术家 ────────────────────────────────
function ArtistView({ data, movements }) {
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvNames = data.movements.map(id => mvMap.get(id)?.zh).filter(Boolean)
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      {data.sub && <div style={s.sub}>{data.sub}</div>}
      <div style={s.meta}>
        {data.birth}–{data.death}
        {mvNames.length > 0 && <><br />所属流派：{mvNames.join('、')}</>}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {data.url && (
        <div style={{ marginTop: 6 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>
        </div>
      )}
      {data.works?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>代表作</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 10px' }}>
            {data.works.map((w, i) => (
              <span key={i} style={s.workLink}>
                {w.url
                  ? <a href={w.url} target="_blank" rel="noreferrer" style={s.workLinkA}>{w.title} ↗</a>
                  : w.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── 私密卡参照行 ──────────────────────────────────────
function NoteSummary({ data, type, movements }) {
  const summary = type === 'movement'
    ? `${data.zh}　${data.start}–${data.end}`
    : `${data.zh}　${data.birth}–${data.death}` +
      (data.movements?.length
        ? `　${data.movements.map(id => movements.find(m => m.id === id)?.zh).filter(Boolean).join('、')}`
        : '')
  return <div style={s.noteHeader}>{summary}</div>
}

function genModId() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` }

// ── 私密卡：手风琴浏览 ────────────────────────────────
function NoteAccordion({ modules, openSet, onToggle }) {
  if (!modules?.length) {
    return <div style={s.notePlaceholder}>（还没有笔记，点 ＋新建模块 添加）</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {modules.map(mod => {
        const open = openSet.has(mod.id)
        return (
          <div key={mod.id}>
            <div style={s.accTitle} onClick={() => onToggle(mod.id)}>
              <span style={s.accArrow}>{open ? '▾' : '▸'}</span>
              {mod.title || '无标题'}
            </div>
            {open && (
              <div className="note-content" style={s.accBody} dangerouslySetInnerHTML={{ __html: mod.content || '' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 单个模块的富文本编辑器 ────────────────────────────
function ModuleEditor({ mod, onChange, onDelete, editorRef }) {
  const localRef = useRef(null)
  const initialized = useRef(false)

  function setRef(el) {
    localRef.current = el
    if (editorRef) editorRef(el)
  }

  useEffect(() => {
    if (localRef.current && !initialized.current) {
      localRef.current.innerHTML = mod.content || ''
      initialized.current = true
    }
  }, [mod.content])

  function exec(cmd, val) {
    localRef.current?.focus()
    document.execCommand(cmd, false, val ?? null)
  }

  // 弹 prompt 前先记住编辑器内的光标/选区，输完后恢复再执行（否则 prompt 会丢选区导致插入失败）
  function execWithPrompt(cmd, message, wrap) {
    const el = localRef.current
    const sel = window.getSelection()
    const saved = (sel && sel.rangeCount && el && el.contains(sel.anchorNode))
      ? sel.getRangeAt(0).cloneRange() : null
    const u = prompt(message)
    if (!u) return
    el?.focus()
    if (saved) { sel.removeAllRanges(); sel.addRange(saved) }
    else if (el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel.removeAllRanges(); sel.addRange(r) }
    document.execCommand(cmd, false, wrap ? wrap(u) : u)
  }

  return (
    <div style={s.modBlock}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input style={{ ...s.input, fontSize: 12, fontWeight: 500 }}
          placeholder="模块标题" value={mod.title}
          onChange={e => onChange({ ...mod, title: e.target.value })} />
        <span style={s.workEntryDel} onClick={onDelete}>删除</span>
      </div>
      <div style={s.noteToolbar}>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); exec('bold') }} title="加粗"><b>B</b></button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); exec('formatBlock', '<h3>') }} title="标题">H</button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); execWithPrompt('createLink', '输入链接 URL：') }} title="链接">🔗</button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); execWithPrompt('insertHTML', '输入图片 URL：', u => `<img src="${u}" style="max-width:100%;border-radius:4px;margin:4px 0" />`) }} title="图片URL">🖼</button>
      </div>
      <div ref={setRef} contentEditable suppressContentEditableWarning
        style={s.noteEditable} />
    </div>
  )
}

// ── 颜色下拉选择器 ──────────────────────────────────────
const COLOR_NAMES = ['红','橙','黄','绿','青','蓝','紫']
function ColorPicker({ value, onChange, showAuto }) {
  const [open, setOpen] = useState(false)
  const displayColor = value || (showAuto ? 'var(--axis-border)' : COLOR_PALETTE[0])
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        ...s.colorSwatch, background: displayColor, cursor: 'pointer',
        ...(value ? {} : { border: '2px dashed var(--axis-border)' }),
      }}>
        {!value && showAuto && <span style={{ fontSize: 7, color: 'var(--text-faint)' }}>自动</span>}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={s.colorDropdown}>
            {showAuto && (
              <div onClick={() => { onChange(''); setOpen(false) }} style={s.colorOption}>
                <span style={{ ...s.colorDot, background: 'var(--axis-border)', border: '1px dashed var(--text-faint)' }} />
                <span>自动</span>
                {!value && <span style={s.colorCheck}>✓</span>}
              </div>
            )}
            {COLOR_PALETTE.map((c, i) => (
              <div key={c} onClick={() => { onChange(c); setOpen(false) }} style={s.colorOption}>
                <span style={{ ...s.colorDot, background: c }} />
                <span>{COLOR_NAMES[i]}</span>
                {value === c && <span style={s.colorCheck}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── 公开卡编辑表单：流派 ──────────────────────────────
function MovementEditForm({ formData, onChange }) {
  return (
    <div style={s.form}>
      <div style={s.field}>
        <label style={s.fieldLabel}>名称</label>
        <input style={s.input} value={formData.zh}
          onChange={e => onChange({ ...formData, zh: e.target.value })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>副标题</label>
        <input style={s.input} value={formData.sub}
          onChange={e => onChange({ ...formData, sub: e.target.value })} placeholder="可选" />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>年份</label>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input style={{ ...s.input, flex: 1 }} type="number" value={formData.start} placeholder="开始"
            onChange={e => onChange({ ...formData, start: e.target.value === '' ? '' : Number(e.target.value) })} />
          <input style={{ ...s.input, flex: 1 }} type="number" value={formData.end} placeholder="结束"
            onChange={e => onChange({ ...formData, end: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>国别</label>
        <input style={s.input} value={formData.region}
          onChange={e => onChange({ ...formData, region: e.target.value })} />
      </div>
      <div style={s.fieldBlock}>
        <label style={s.blockLabel}>简介</label>
        <textarea style={s.textarea} rows={10} value={formData.description}
          onChange={e => onChange({ ...formData, description: e.target.value })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>链接</label>
        <input style={s.input} value={formData.url}
          onChange={e => onChange({ ...formData, url: e.target.value })} placeholder="https://..." />
      </div>
      <div style={s.fieldBlock}>
        <label style={s.blockLabel}>颜色</label>
        <ColorPicker value={formData.color} onChange={c => onChange({ ...formData, color: c })} />
      </div>
      <div style={{ ...s.field, marginTop: 2 }}>
        <label style={{ ...s.fieldLabel, cursor: 'pointer' }}>
          <input type="checkbox" checked={formData.isEvent} style={{ marginRight: 4 }}
            onChange={e => onChange({ ...formData, isEvent: e.target.checked })} />
          大事件
        </label>
      </div>
    </div>
  )
}

function MvSelector({ selected, allMovements, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = allMovements.filter(m =>
    !m.isEvent && (!search.trim() || m.zh.includes(search.trim()))
  )
  function toggle(mvId) {
    if (selected.includes(mvId)) onChange(selected.filter(id => id !== mvId))
    else onChange([...selected, mvId])
  }
  return (
    <div style={s.mvWrap}>
      {selected.length > 0 && (
        <div style={s.mvTags}>
          {selected.map(id => {
            const mv = allMovements.find(m => m.id === id)
            return mv ? (
              <span key={id} style={s.mvTag}>
                {mv.zh}
                <span style={s.mvTagRm} onMouseDown={e => { e.preventDefault(); toggle(id) }}>×</span>
              </span>
            ) : null
          })}
        </div>
      )}
      <input style={s.mvSearch} placeholder="搜索流派…" value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <div style={s.mvDropdown}>
          {filtered.length > 0 ? filtered.map(m => (
            <div key={m.id}
              onMouseDown={e => { e.preventDefault(); toggle(m.id) }}
              style={{ ...s.mvOption, ...(selected.includes(m.id) ? { color: 'var(--text)', fontWeight: 500 } : {}) }}>
              {m.zh}{selected.includes(m.id) ? ' ✓' : ''}
            </div>
          )) : (
            <div style={{ padding: '4px 7px', fontSize: 11, color: 'var(--text-faint)' }}>无匹配</div>
          )}
        </div>
      )}
    </div>
  )
}

function ArtistEditForm({ formData, onChange, allMovements }) {
  const works = formData.works ?? []
  const mvIds = formData.movements ?? []
  function updateWork(i, field, value) {
    const next = works.map((w, idx) => idx === i ? { ...w, [field]: value } : w)
    onChange({ ...formData, works: next })
  }
  function addWork() { onChange({ ...formData, works: [...works, { title: '', url: '' }] }) }
  function removeWork(i) { onChange({ ...formData, works: works.filter((_, idx) => idx !== i) }) }
  function moveWork(i, dir) {
    const j = i + dir
    if (j < 0 || j >= works.length) return
    const next = [...works]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange({ ...formData, works: next })
  }
  return (
    <div style={s.form}>
      <div style={s.field}>
        <label style={s.fieldLabel}>名称</label>
        <input style={s.input} value={formData.zh}
          onChange={e => onChange({ ...formData, zh: e.target.value })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>副标题</label>
        <input style={s.input} value={formData.sub}
          onChange={e => onChange({ ...formData, sub: e.target.value })} placeholder="可选" />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>年份</label>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input style={{ ...s.input, flex: 1 }} type="number" value={formData.birth} placeholder="出生"
            onChange={e => onChange({ ...formData, birth: e.target.value === '' ? '' : Number(e.target.value) })} />
          <input style={{ ...s.input, flex: 1 }} type="number" value={formData.death} placeholder="逝世"
            onChange={e => onChange({ ...formData, death: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>流派</label>
        <div style={{ flex: 1 }}>
          <MvSelector selected={mvIds} allMovements={allMovements}
            onChange={mvs => onChange({ ...formData, movements: mvs })} />
        </div>
      </div>
      {mvIds.length === 0 && (
        <>
          <div style={s.field}>
            <label style={s.fieldLabel}>位置</label>
            <input style={s.input} type="number" value={formData.posStart ?? ''}
              placeholder="年份，留空按出生年（仅无流派时用于左右定位）"
              onChange={e => onChange({ ...formData, posStart: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
          <div style={s.fieldBlock}>
            <label style={s.blockLabel}>颜色</label>
            <ColorPicker value={formData.color || ''} showAuto
              onChange={c => onChange({ ...formData, color: c })} />
          </div>
        </>
      )}
      <div style={s.fieldBlock}>
        <label style={s.blockLabel}>简介</label>
        <textarea style={s.textarea} rows={10} value={formData.description}
          onChange={e => onChange({ ...formData, description: e.target.value })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>链接</label>
        <input style={s.input} value={formData.url}
          onChange={e => onChange({ ...formData, url: e.target.value })} placeholder="https://..." />
      </div>
      <div style={s.worksSection}>
        <div style={s.worksHd}><label style={s.blockLabel}>代表作</label></div>
        {works.map((w, i) => (
          <div key={i} style={s.workEntry}>
            <div style={s.workEntryHeader}>
              <input style={s.workTitleInp} placeholder="作品名" value={w.title}
                onChange={e => updateWork(i, 'title', e.target.value)} />
              <button style={s.workMoveBtn} disabled={i === 0} onClick={() => moveWork(i, -1)}>↑</button>
              <button style={s.workMoveBtn} disabled={i === works.length - 1} onClick={() => moveWork(i, 1)}>↓</button>
              <span style={s.workEntryDel} onClick={() => removeWork(i)}>删除</span>
            </div>
            <input style={s.workUrlInp} placeholder="https://..." value={w.url}
              onChange={e => updateWork(i, 'url', e.target.value)} />
          </div>
        ))}
        <button onClick={addWork} style={s.workAddBtn}>＋ 新增作品</button>
      </div>
    </div>
  )
}

// ── 主组件 ──────────────────────────────────────────────
export default function DetailCard({
  mode, selected, movements, artists, onClose, hasToken, onSave,
  adding, onAdd, onDelete, pinPos, cardRef,
  notes, showPrivate, onShowPrivate, onSaveNote,
}) {
  const [editing, setEditing] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState([])
  const [openSet, setOpenSet] = useState(new Set())
  const [formData, setFormData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const editorRefsMap = useRef(new Map())

  const selectedId = selected?.data?.id

  useEffect(() => {
    setEditing(false)
    setEditingNote(false)
    setNoteDraft([])
    setOpenSet(new Set())
    setSaveError(null)
    setFormData(null)
    setConfirming(false)
    editorRefsMap.current.clear()
  }, [selectedId])

  useEffect(() => {
    if (adding === 'movement') {
      const color = COLOR_PALETTE[movements.length % COLOR_PALETTE.length]
      setFormData({ zh: '', sub: '', start: '', end: '', region: '', description: '', url: '', color, isEvent: false })
      setSaveError(null); setConfirming(false)
    } else if (adding === 'artist') {
      setFormData({ zh: '', sub: '', birth: '', death: '', description: '', works: [], movements: [], url: '', color: '' })
      setSaveError(null); setConfirming(false)
    }
  }, [adding, movements?.length])

  const isAdding = mode === 'adding'
  const isHover  = mode === 'hover'
  const isPinned = mode === 'pinned'
  const type = isAdding ? adding : selected?.type
  const data = selected?.data

  const hasNote = (notes?.[data?.id]?.length || 0) > 0

  const usePrivate = hasToken && showPrivate && !isAdding && !editing

  if (!mode) {
    return <div ref={cardRef} style={{ ...s.card, display: 'none' }} />
  }

  function enterEdit() {
    if (type === 'movement') {
      setFormData({
        zh: data.zh ?? '', sub: data.sub ?? '',
        start: data.start, end: data.end,
        region: data.region ?? '', description: data.description ?? '',
        url: data.url ?? '', color: data.color ?? '#888888', isEvent: !!data.isEvent,
      })
    } else {
      setFormData({
        zh: data.zh ?? '', sub: data.sub ?? '',
        birth: data.birth, death: data.death,
        description: data.description ?? '',
        works: data.works ? JSON.parse(JSON.stringify(data.works)) : [],
        movements: data.movements ?? [], url: data.url ?? '',
        posStart: data.posStart ?? '', color: data.color ?? '',
      })
    }
    setSaveError(null); setEditing(true)
  }

  async function handleSave() {
    if (!formData) return
    const isMovement = type === 'movement'
    if (!formData.zh?.trim()) { setSaveError('名称不能为空'); return }
    if (isMovement) {
      const sv = Number(formData.start), ev = Number(formData.end)
      if (!sv || !ev || sv >= ev) { setSaveError('年份无效（需要 开始 < 结束）'); return }
    } else {
      const bv = Number(formData.birth), dv = Number(formData.death)
      if (!bv || !dv || bv >= dv) { setSaveError('年份无效（需要 出生 < 逝世）'); return }
    }
    setSaving(true); setSaveError(null)
    try {
      if (isAdding) { await onAdd(type, formData) }
      else { await onSave(type, { ...data, ...formData }); setEditing(false) }
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  async function handleConfirmDelete() {
    setSaving(true); setSaveError(null)
    try { await onDelete(type, data.id) }
    catch (err) { setSaveError(err.message); setConfirming(false) }
    finally { setSaving(false) }
  }

  function handleCancel() {
    if (isAdding) onClose()
    else { setEditing(false); setSaveError(null); setConfirming(false) }
  }

  const showForm = (isAdding || editing) && formData

  let cardStyle
  if (usePrivate && isPinned) {
    cardStyle = { ...s.card, ...s.cardCentered }
  } else if (isHover) {
    cardStyle = { ...s.card, right: 'auto', pointerEvents: 'none' }
  } else if (isPinned && pinPos) {
    cardStyle = { ...s.card, left: pinPos.x, top: pinPos.y, right: 'auto', maxHeight: `calc(100vh - ${pinPos.y}px - 16px)` }
  } else {
    cardStyle = { ...s.card, right: 24, top: 56 }
  }

  function toggleAccordion(modId) {
    setOpenSet(prev => {
      const next = new Set(prev)
      if (next.has(modId)) next.delete(modId); else next.add(modId)
      return next
    })
  }

  function enterNoteEdit(addEmpty) {
    const existing = (notes?.[data?.id] || []).map(m => ({ ...m }))
    if (addEmpty) existing.push({ id: genModId(), title: '', content: '' })
    setNoteDraft(existing)
    setEditingNote(true)
    setSaveError(null)
    editorRefsMap.current.clear()
  }

  function updateDraftMod(idx, updated) {
    setNoteDraft(prev => prev.map((m, i) => i === idx ? updated : m))
  }

  function deleteDraftMod(idx) {
    const removed = noteDraft[idx]
    if (removed) editorRefsMap.current.delete(removed.id)
    setNoteDraft(prev => prev.filter((_, i) => i !== idx))
  }

  function addDraftMod() {
    setNoteDraft(prev => [...prev, { id: genModId(), title: '', content: '' }])
  }

  async function handleSaveNotes() {
    const modules = noteDraft.map(mod => ({
      id: mod.id,
      title: mod.title || '',
      content: editorRefsMap.current.get(mod.id)?.innerHTML ?? mod.content ?? '',
    }))
    setSaving(true); setSaveError(null)
    try {
      await onSaveNote(data.id, modules)
      setEditingNote(false)
      editorRefsMap.current.clear()
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  function renderPrivateCard() {
    const modules = notes?.[data?.id] || []

    if (editingNote && isPinned) {
      return (
        <>
          <NoteSummary data={data} type={type} movements={movements} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {noteDraft.map((mod, idx) => (
              <ModuleEditor key={mod.id} mod={mod}
                onChange={updated => updateDraftMod(idx, updated)}
                onDelete={() => deleteDraftMod(idx)}
                editorRef={el => { if (el) editorRefsMap.current.set(mod.id, el); }}
              />
            ))}
          </div>
          <button onClick={addDraftMod} style={{ ...s.workAddBtn, marginTop: 6 }}>＋ 新建模块</button>
          {saveError && <div style={s.errorMsg}>{saveError}</div>}
          <div style={s.editBtnRow}>
            <button onClick={() => { setEditingNote(false); editorRefsMap.current.clear() }} disabled={saving} style={s.cancelBtn}>取消</button>
            <button onClick={handleSaveNotes} disabled={saving}
              style={{ ...s.saveBtn, ...(saving ? { opacity: 0.5 } : {}) }}>
              {saving ? '保存中…' : '保存笔记'}
            </button>
          </div>
        </>
      )
    }

    return (
      <>
        <NoteSummary data={data} type={type} movements={movements} />
        <NoteAccordion modules={modules} openSet={openSet} onToggle={toggleAccordion} />
        {isPinned && (
          <>
            <div style={s.editBtnRow}>
              <button onClick={() => enterNoteEdit(true)} style={s.editEntryBtn}>＋ 新建模块</button>
              <button onClick={() => enterNoteEdit(false)} style={s.editEntryBtn}>✎ 编辑笔记</button>
              <button onClick={enterEdit} style={s.editEntryBtn}>✎ 编辑公开</button>
            </div>
          </>
        )}
      </>
    )
  }

  // 公开卡渲染
  function renderPublicCard() {
    if (showForm) {
      return (
        <>
          <div style={s.editTitle}>
            {isAdding
              ? (type === 'movement' ? '新增流派' : '新增艺术家')
              : `编辑：${data.zh}`}
          </div>
          {type === 'movement'
            ? <MovementEditForm formData={formData} onChange={setFormData} />
            : <ArtistEditForm formData={formData} onChange={setFormData} allMovements={movements} />}
          {saveError && <div style={s.errorMsg}>{saveError}</div>}
          <div style={s.editBtnRow}>
            <button onClick={handleCancel} disabled={saving} style={s.cancelBtn}>取消</button>
            <button onClick={handleSave} disabled={saving}
              style={{ ...s.saveBtn, ...(saving ? { opacity: 0.5 } : {}) }}>
              {saving ? '保存中…' : (isAdding ? '添加' : '保存')}
            </button>
          </div>
          {!isAdding && hasToken && (
            <button onClick={() => setConfirming(true)} disabled={saving} style={s.deleteBtn}>
              删除此条目
            </button>
          )}
        </>
      )
    }

    if (!data) return null

    return (
      <>
        {type === 'movement'
          ? <MovementView data={data} artists={artists} />
          : <ArtistView data={data} movements={movements} />}
        {isPinned && hasToken && (
          <div style={s.editBtnRow}>
            <button onClick={enterEdit} style={s.editEntryBtn}>编辑</button>
            <button onClick={onShowPrivate} style={s.editEntryBtn}>
              {hasNote ? `📝 笔记(${notes[data.id].length})` : '📝 添加笔记'}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {(isPinned || isAdding) && <div onClick={onClose} style={s.backdrop} />}

      <div ref={cardRef} style={cardStyle}>
        {!isHover && <button onClick={onClose} style={s.closeBtn} aria-label="关闭">×</button>}

        {usePrivate && data ? renderPrivateCard() : renderPublicCard()}
      </div>

      {confirming && (
        <>
          <div onClick={() => setConfirming(false)} style={s.confirmOverlay} />
          <div style={s.confirmBox}>
            <div style={s.confirmMsg}>确定删除「{data.zh}」？此操作无法撤销。</div>
            <div style={s.confirmBtns}>
              <button onClick={() => setConfirming(false)} style={s.cancelBtn}>取消</button>
              <button onClick={handleConfirmDelete} disabled={saving}
                style={{ ...s.confirmDangerBtn, ...(saving ? { opacity: 0.5 } : {}) }}>
                {saving ? '删除中…' : '删除'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── 样式 ────────────────────────────────────────────────
const s = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 10 },
  card: {
    position: 'fixed',
    width: 320, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
    background: 'var(--tip-bg)', border: '1px solid var(--tip-border)', borderRadius: 10,
    padding: '12px 14px', zIndex: 11,
    color: 'var(--text)', fontFamily: "'Noto Sans SC', system-ui, sans-serif",
    fontSize: 12, lineHeight: 1.8, boxShadow: '0 8px 32px var(--tip-shadow)',
  },
  cardCentered: {
    left: '50%', top: '50%', right: 'auto',
    transform: 'translate(-50%, -50%)',
    width: 'min(92vw, 680px)', maxHeight: '85vh',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 12,
    background: 'none', border: 'none', color: 'var(--text-faint)',
    fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
  },
  title:       { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2, paddingRight: 24 },
  sub:         { fontSize: 10, color: 'var(--text-faint)', marginBottom: 2, fontStyle: 'italic' },
  meta:        { fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.7, marginBottom: 6 },
  description: { fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' },
  section:     { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--axis-border)' },
  sectionTitle:{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
  link:        { color: 'inherit', opacity: 0.55, fontSize: 10.5, textDecoration: 'none' },
  workLink:    { fontSize: 11.5, borderBottom: '1px solid currentColor', opacity: 0.75, whiteSpace: 'nowrap' },
  workLinkA:   { color: 'inherit', textDecoration: 'none' },
  editTitle:   { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, paddingRight: 24 },
  form:        { display: 'flex', flexDirection: 'column', gap: 6 },
  field:       { display: 'flex', alignItems: 'center', gap: 8 },
  fieldLabel:  { fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap', flexShrink: 0, width: 46, textAlign: 'left' },
  fieldBlock:  { display: 'flex', flexDirection: 'column', gap: 3 },
  blockLabel:  { fontSize: 10, color: 'var(--text-faint)' },
  input: {
    flex: 1, minWidth: 0, width: '100%',
    border: '1px solid var(--axis-border)', borderRadius: 6,
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'inherit', fontSize: 11.5,
    padding: '4px 7px', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', border: '1px solid var(--axis-border)', borderRadius: 6,
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'inherit', fontSize: 11.5, lineHeight: 1.6,
    padding: '4px 7px', outline: 'none', resize: 'vertical', minHeight: 160, boxSizing: 'border-box',
  },
  worksSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  worksHd:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  workEntry:    { display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', border: '1px solid var(--axis-border)', borderRadius: 6 },
  workEntryHeader: { display: 'flex', alignItems: 'center', gap: 6 },
  workTitleInp: {
    flex: 1, border: 'none', borderBottom: '1px solid var(--axis-border)',
    background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11.5,
    padding: '2px 0', outline: 'none',
  },
  workUrlInp: {
    width: '100%', border: 'none', borderBottom: '1px solid var(--axis-border)',
    background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11,
    padding: '2px 0', outline: 'none',
  },
  workEntryDel: { color: '#e55', cursor: 'pointer', fontSize: 10.5, flexShrink: 0, fontFamily: 'inherit' },
  colorSwatch: {
    width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
    border: '2px solid transparent', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  colorDropdown: {
    position: 'absolute', left: 0, top: 28, zIndex: 51,
    background: 'var(--tip-bg)', border: '1px solid var(--axis-border)',
    borderRadius: 6, boxShadow: '0 4px 12px var(--tip-shadow)',
    padding: 4, minWidth: 90,
  },
  colorOption: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
    fontSize: 11, color: 'var(--text)', whiteSpace: 'nowrap',
  },
  colorDot: {
    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
  },
  colorCheck: {
    marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)',
  },
  workMoveBtn: {
    background: 'none', border: '1px solid var(--axis-border)', borderRadius: 4,
    color: 'var(--text-faint)', fontSize: 10, padding: '0 4px', cursor: 'pointer',
    fontFamily: 'inherit', lineHeight: 1.4, flexShrink: 0,
  },
  workAddBtn: {
    alignSelf: 'flex-start', marginTop: 4,
    background: 'none', border: '1px solid var(--axis-border)', color: 'var(--text-muted)',
    borderRadius: 6, fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit',
  },
  editBtnRow:  { display: 'flex', gap: 6, marginTop: 6 },
  saveBtn: {
    flex: 1, background: 'var(--text)', color: 'var(--bg)', border: 'none',
    borderRadius: 6, fontSize: 11, padding: '5px 0', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 500,
  },
  cancelBtn: {
    flex: 1, background: 'none', border: '1px solid var(--axis-border)', color: 'var(--text-muted)',
    borderRadius: 6, fontSize: 11, padding: '5px 0', cursor: 'pointer', fontFamily: 'inherit',
  },
  editEntryBtn: {
    flex: 1, background: 'none', border: '1px solid var(--axis-border)', color: 'var(--text-faint)',
    borderRadius: 6, fontSize: 10, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit',
  },
  deleteBtn: {
    marginTop: 6, width: '100%', padding: '5px 0',
    background: 'none', border: '1px solid var(--axis-border)', color: '#e55',
    borderRadius: 6, fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit',
  },
  errorMsg: { color: '#e55', fontSize: 11, marginTop: 6, lineHeight: 1.5 },
  mvWrap:     { display: 'flex', flexDirection: 'column', gap: 4 },
  mvTags:     { display: 'flex', flexWrap: 'wrap', gap: 4 },
  mvTag: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    background: 'var(--text)', color: 'var(--bg)',
    borderRadius: 10, padding: '2px 8px 2px 9px', fontSize: 10.5, cursor: 'default',
  },
  mvTagRm:    { cursor: 'pointer', opacity: 0.7, fontSize: 11, lineHeight: 1 },
  mvSearch: {
    width: '100%', border: '1px solid var(--axis-border)', borderRadius: 6,
    background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11.5,
    padding: '4px 7px', outline: 'none', boxSizing: 'border-box',
  },
  mvDropdown: {
    display: 'flex', flexDirection: 'column', gap: 2,
    border: '1px solid var(--axis-border)', borderRadius: 6,
    padding: 4, maxHeight: 120, overflowY: 'auto', background: 'var(--tip-bg)',
  },
  mvOption: {
    padding: '3px 7px', borderRadius: 4, fontSize: 11, color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
    zIndex: 100,
  },
  confirmBox: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    zIndex: 101, background: 'var(--tip-bg)', border: '1px solid var(--tip-border)',
    borderRadius: 14, padding: '20px 20px 16px', minWidth: 220, maxWidth: 300,
    boxShadow: '0 12px 40px var(--tip-shadow)',
  },
  confirmMsg:  { fontSize: 13, lineHeight: 1.6, color: 'var(--text)', marginBottom: 14 },
  confirmBtns: { display: 'flex', gap: 8 },
  confirmDangerBtn: {
    flex: 1, background: '#e55', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 12, padding: '6px 0', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 500,
  },

  // 私密笔记样式
  noteHeader: {
    fontSize: 11, color: 'var(--text-faint)', marginBottom: 8,
    paddingBottom: 6, borderBottom: '1px solid var(--axis-border)',
    paddingRight: 24,
  },
  notePlaceholder: {
    fontSize: 11.5, color: 'var(--text-faint)', fontStyle: 'italic',
    padding: '12px 0',
  },
  // 手风琴
  accTitle: {
    fontSize: 12, fontWeight: 500, color: 'var(--text)',
    cursor: 'pointer', padding: '4px 0', userSelect: 'none',
    display: 'flex', alignItems: 'center', gap: 5,
  },
  accArrow: { fontSize: 10, color: 'var(--text-faint)', width: 12, flexShrink: 0, textAlign: 'center' },
  accBody: {
    fontSize: 12, lineHeight: 1.8, color: 'var(--text)',
    padding: '2px 0 6px 17px', wordBreak: 'break-word',
  },
  // 模块编辑
  modBlock: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '6px 8px', border: '1px solid var(--axis-border)', borderRadius: 6,
  },
  noteToolbar: {
    display: 'flex', gap: 4, paddingBottom: 4,
    borderBottom: '1px solid var(--axis-border)',
  },
  noteToolBtn: {
    background: 'var(--bg)', border: '1px solid var(--axis-border)',
    borderRadius: 4, padding: '2px 8px', fontSize: 11,
    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
    lineHeight: 1.4,
  },
  noteEditable: {
    minHeight: 140, maxHeight: 200, overflowY: 'auto',
    border: '1px solid var(--axis-border)', borderRadius: 6,
    background: 'var(--bg)', color: 'var(--text)',
    fontFamily: 'inherit', fontSize: 12, lineHeight: 1.8,
    padding: '6px 8px', outline: 'none',
    wordBreak: 'break-word',
  },
}
