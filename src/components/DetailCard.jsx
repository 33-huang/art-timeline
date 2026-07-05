import { useState, useEffect, useRef } from 'react'
import { s, COLOR_PALETTE } from './detail/styles'
import { genModId, noteClickHandler } from './detail/helpers'
import { MovementView, ArtistView } from './detail/PublicViews'
import { NoteSummary, NoteAccordion, ModuleEditor } from './detail/Notes'
import { MovementEditForm, ArtistEditForm } from './detail/Forms'

// ── 主组件 ──────────────────────────────────────────────
export default function DetailCard({
  mode, selected, movements, artists, onClose, hasToken, onSave,
  adding, onAdd, onDelete, pinPos, cardRef,
  notes, showPrivate, onShowPrivate, onSaveNote,
}) {
  const [editing, setEditing] = useState(false)
  const [editingModId, setEditingModId] = useState(null)
  const [modDraft, setModDraft] = useState(null)
  const [openSet, setOpenSet] = useState(new Set())
  const [formData, setFormData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const editorRefsMap = useRef(new Map())

  const selectedId = selected?.data?.id

  useEffect(() => {
    setEditing(false)
    setEditingModId(null)
    setModDraft(null)
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
        posStart: data.posStart ?? '', posAfter: data.posAfter ?? '',
      })
    } else {
      setFormData({
        zh: data.zh ?? '', sub: data.sub ?? '',
        birth: data.birth, death: data.death,
        description: data.description ?? '',
        works: data.works ? JSON.parse(JSON.stringify(data.works)) : [],
        movements: data.movements ?? [], url: data.url ?? '',
        posStart: data.posStart ?? '', posAfter: data.posAfter ?? '', color: data.color ?? '',
      })
    }
    setSaveError(null); setEditing(true)
  }

  async function handleSave() {
    if (!formData) return
    const isMovement = type === 'movement'
    if (!formData.zh?.trim()) { setSaveError('名称不能为空'); return }
    let payload = formData
    if (isMovement) {
      const sv = Number(formData.start)
      if (!sv) { setSaveError('请填写开始年份'); return }
      const endEmpty = formData.end === '' || formData.end == null
      if (formData.isEvent && endEmpty) {
        payload = { ...formData, end: sv }   // 单年大事件：结束留空则=开始
      } else {
        const ev = Number(formData.end)
        if (!ev || sv >= ev) { setSaveError('年份无效（需要 开始 < 结束）'); return }
      }
    } else {
      const bv = Number(formData.birth), dv = Number(formData.death)
      if (!bv || !dv || bv >= dv) { setSaveError('年份无效（需要 出生 < 逝世）'); return }
    }
    setSaving(true); setSaveError(null)
    try {
      if (isAdding) { await onAdd(type, payload) }
      else { await onSave(type, { ...data, ...payload }); setEditing(false) }
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

  function enterModEdit(mod) {
    setEditingModId(mod.id)
    setModDraft({ ...mod })
    setSaveError(null)
    editorRefsMap.current.clear()
  }

  function enterNewMod() {
    const newMod = { id: genModId(), title: '', content: '' }
    setEditingModId(newMod.id)
    setModDraft(newMod)
    setSaveError(null)
    editorRefsMap.current.clear()
  }

  function cancelModEdit() {
    setEditingModId(null)
    setModDraft(null)
    setSaveError(null)
    editorRefsMap.current.clear()
  }

  async function handleSaveNotes() {
    const editorEl = editorRefsMap.current.get(editingModId)
    const updated = {
      id: modDraft.id,
      title: modDraft.title || '',
      content: editorEl?.innerHTML ?? modDraft.content ?? '',
    }
    const existing = notes?.[data?.id] || []
    const isNew = !existing.some(m => m.id === editingModId)
    const modules = isNew ? [...existing, updated] : existing.map(m => m.id === editingModId ? updated : m)
    setSaving(true); setSaveError(null)
    try {
      await onSaveNote(data.id, modules)
      setEditingModId(null)
      setModDraft(null)
      editorRefsMap.current.clear()
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  async function deleteModule(modId) {
    const existing = notes?.[data?.id] || []
    const modules = existing.filter(m => m.id !== modId)
    setSaving(true); setSaveError(null)
    try {
      await onSaveNote(data.id, modules)
      setEditingModId(null)
      setModDraft(null)
      editorRefsMap.current.clear()
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  function renderPrivateCard() {
    const modules = notes?.[data?.id] || []
    const isNewMod = editingModId && !modules.some(m => m.id === editingModId)
    const headerActions = isPinned && (
      <>
        {!editingModId && <span style={s.noteHeaderBtn} onClick={enterNewMod}>＋ 新建模块</span>}
        {!editingModId && <span style={s.noteHeaderBtn} onClick={enterEdit}>↗ 编辑公开</span>}
        <span style={s.noteHeaderClose} onClick={onClose}>×</span>
      </>
    )

    return (
      <>
        <NoteSummary data={data} type={type} movements={movements} actions={headerActions} />
        {editingModId && modDraft && !isNewMod ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {modules.map(mod => {
              if (mod.id === editingModId) {
                return (
                  <div key={mod.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <ModuleEditor mod={modDraft}
                      onChange={setModDraft}
                      onDelete={() => deleteModule(mod.id)}
                      editorRef={el => { if (el) editorRefsMap.current.set(modDraft.id, el); }}
                    />
                    {saveError && <div style={s.errorMsg}>{saveError}</div>}
                    <div style={s.editBtnRow}>
                      <button onClick={cancelModEdit} disabled={saving} style={s.cancelBtn}>取消</button>
                      <button onClick={handleSaveNotes} disabled={saving}
                        style={{ ...s.saveBtn, ...(saving ? { opacity: 0.5 } : {}) }}>
                        {saving ? '保存中…' : '保存'}
                      </button>
                    </div>
                  </div>
                )
              }
              const open = openSet.has(mod.id)
              return (
                <div key={mod.id}>
                  <div style={s.accTitle} onClick={() => toggleAccordion(mod.id)}>
                    <span style={s.accArrow}>{open ? '▾' : '▸'}</span>
                    <span style={{ flex: 1 }}>{mod.title || '无标题'}</span>
                  </div>
                  {open && (
                    <div className="note-content" style={s.accBody} onClick={noteClickHandler}
                      dangerouslySetInnerHTML={{ __html: mod.content || '' }} />
                  )}
                </div>
              )
            })}
          </div>
        ) : editingModId && modDraft && isNewMod ? (
          <>
            <NoteAccordion modules={modules} openSet={openSet} onToggle={toggleAccordion}
              canEdit={false} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <ModuleEditor mod={modDraft}
                onChange={setModDraft}
                onDelete={cancelModEdit}
                editorRef={el => { if (el) editorRefsMap.current.set(modDraft.id, el); }}
              />
              {saveError && <div style={s.errorMsg}>{saveError}</div>}
              <div style={s.editBtnRow}>
                <button onClick={cancelModEdit} disabled={saving} style={s.cancelBtn}>取消</button>
                <button onClick={handleSaveNotes} disabled={saving}
                  style={{ ...s.saveBtn, ...(saving ? { opacity: 0.5 } : {}) }}>
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <NoteAccordion modules={modules} openSet={openSet} onToggle={toggleAccordion}
            onEdit={enterModEdit} canEdit={hasToken && isPinned} />
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
            ? <MovementEditForm formData={formData} onChange={setFormData} allMovements={movements} allArtists={artists} selfId={data?.id} />
            : <ArtistEditForm formData={formData} onChange={setFormData} allMovements={movements} allArtists={artists} selfId={data?.id} />}
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
        {!isHover && !(usePrivate && data && isPinned) && <button onClick={onClose} style={s.closeBtn} aria-label="关闭">×</button>}

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
