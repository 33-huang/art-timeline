import { useState, useEffect } from 'react'

const COLOR_PALETTE = ['#9B7DC8','#5B9FD4','#D4924A','#4EAA72','#D45878','#C8A832','#B89020','#7A6DC8','#C44868','#4A8FC4','#C46848','#C48030','#8A6DC8','#4878B8']

// ── 只读：流派 ──────────────────────────────────────────
function MovementView({ data, artists }) {
  const reps = artists.filter(a => a.movements.includes(data.id))
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      <div style={s.meta}>
        {data.start}–{data.end}{data.region ? `　${data.region}` : ''}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {reps.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>代表艺术家</div>
          <div style={s.tagList}>
            {reps.map(a => <span key={a.id} style={s.tag}>{a.zh}</span>)}
          </div>
        </div>
      )}
    </>
  )
}

// ── 只读：艺术家 ────────────────────────────────────────
function ArtistView({ data, movements }) {
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvNames = data.movements.map(id => mvMap.get(id)?.zh).filter(Boolean)
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      {data.sub && <div style={s.sub}>{data.sub}</div>}
      <div style={s.meta}>{data.birth}–{data.death}</div>
      {mvNames.length > 0 && (
        <div style={s.tagList}>
          {mvNames.map(name => <span key={name} style={s.tag}>{name}</span>)}
        </div>
      )}
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {data.works?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>代表作</div>
          <ul style={s.worksList}>
            {data.works.map((w, i) => (
              <li key={i}>
                {w.url
                  ? <a href={w.url} target="_blank" rel="noreferrer" style={s.link}>{w.title}</a>
                  : w.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.url && (
        <div style={{ marginTop: 8 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 外部链接</a>
        </div>
      )}
    </>
  )
}

// ── 编辑表单：流派 ──────────────────────────────────────
function MovementEditForm({ formData, onChange }) {
  return (
    <div style={s.form}>
      <label style={s.label}>名称</label>
      <input style={s.input} value={formData.zh}
        onChange={e => onChange({ ...formData, zh: e.target.value })} />

      <label style={s.label}>副标题</label>
      <input style={s.input} value={formData.sub}
        onChange={e => onChange({ ...formData, sub: e.target.value })} placeholder="可选，标签下的小字" />

      <div style={s.row}>
        <div style={s.half}>
          <label style={s.label}>起始年</label>
          <input style={s.input} type="number" value={formData.start}
            onChange={e => onChange({ ...formData, start: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div style={s.half}>
          <label style={s.label}>结束年</label>
          <input style={s.input} type="number" value={formData.end}
            onChange={e => onChange({ ...formData, end: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </div>

      <label style={s.label}>地区</label>
      <input style={s.input} value={formData.region}
        onChange={e => onChange({ ...formData, region: e.target.value })} />

      <div style={s.row}>
        <div style={{ ...s.half, flex: 'none', width: 60 }}>
          <label style={s.label}>颜色</label>
          <input type="color" value={formData.color}
            onChange={e => onChange({ ...formData, color: e.target.value })}
            style={{ ...s.input, height: 32, padding: 2, cursor: 'pointer' }} />
        </div>
        <div style={{ ...s.half, justifyContent: 'flex-end', paddingBottom: 4 }}>
          <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 6, marginTop: 0, cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.isEvent}
              onChange={e => onChange({ ...formData, isEvent: e.target.checked })} />
            大事件（半透明窄条）
          </label>
        </div>
      </div>

      <label style={s.label}>描述（支持 HTML）</label>
      <textarea style={s.textarea} rows={8} value={formData.description}
        onChange={e => onChange({ ...formData, description: e.target.value })} />
    </div>
  )
}

// ── 编辑表单：艺术家 ────────────────────────────────────
function ArtistEditForm({ formData, onChange, allMovements }) {
  function updateWork(i, field, value) {
    const works = formData.works.map((w, idx) =>
      idx === i ? { ...w, [field]: value } : w
    )
    onChange({ ...formData, works })
  }
  function addWork() {
    onChange({ ...formData, works: [...formData.works, { title: '', url: '' }] })
  }
  function removeWork(i) {
    onChange({ ...formData, works: formData.works.filter((_, idx) => idx !== i) })
  }
  function toggleMv(mvId) {
    const mvs = formData.movements.includes(mvId)
      ? formData.movements.filter(id => id !== mvId)
      : [...formData.movements, mvId]
    onChange({ ...formData, movements: mvs })
  }

  return (
    <div style={s.form}>
      <label style={s.label}>名称</label>
      <input style={s.input} value={formData.zh}
        onChange={e => onChange({ ...formData, zh: e.target.value })} />

      <label style={s.label}>副标题</label>
      <input style={s.input} value={formData.sub}
        onChange={e => onChange({ ...formData, sub: e.target.value })} placeholder="可选" />

      <div style={s.row}>
        <div style={s.half}>
          <label style={s.label}>出生年</label>
          <input style={s.input} type="number" value={formData.birth}
            onChange={e => onChange({ ...formData, birth: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
        <div style={s.half}>
          <label style={s.label}>逝世年</label>
          <input style={s.input} type="number" value={formData.death}
            onChange={e => onChange({ ...formData, death: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </div>

      <label style={s.label}>所属流派</label>
      <div style={s.mvSelector}>
        {allMovements.filter(m => !m.isEvent).map(m => {
          const checked = formData.movements.includes(m.id)
          return (
            <span key={m.id} onClick={() => toggleMv(m.id)} style={{
              ...s.mvChip,
              background: checked ? hexRgba(m.color, 0.25) : '#2a2a4a',
              borderColor: checked ? m.color : '#3a3a5a',
              color: checked ? '#eee' : '#888',
            }}>
              {m.zh}
            </span>
          )
        })}
      </div>

      <label style={s.label}>描述（支持 HTML）</label>
      <textarea style={s.textarea} rows={6} value={formData.description}
        onChange={e => onChange({ ...formData, description: e.target.value })} />

      <label style={s.label}>链接</label>
      <input style={s.input} value={formData.url}
        onChange={e => onChange({ ...formData, url: e.target.value })} placeholder="https://..." />

      <label style={s.label}>代表作</label>
      {formData.works.map((w, i) => (
        <div key={i} style={s.workRow}>
          <input
            style={{ ...s.input, flex: 1, marginBottom: 0 }}
            placeholder="作品名"
            value={w.title}
            onChange={e => updateWork(i, 'title', e.target.value)}
          />
          <input
            style={{ ...s.input, flex: 2, marginBottom: 0 }}
            placeholder="链接（可选）"
            value={w.url}
            onChange={e => updateWork(i, 'url', e.target.value)}
          />
          <button onClick={() => removeWork(i)} style={s.removeBtn}>×</button>
        </div>
      ))}
      <button onClick={addWork} style={s.addWorkBtn}>+ 添加代表作</button>
    </div>
  )
}

function hexRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ── 主组件 ──────────────────────────────────────────────
export default function DetailCard({
  selected, movements, artists, onClose, hasToken, onSave,
  adding, onAdd, onDelete,
}) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const selectedId = selected?.data?.id

  useEffect(() => {
    setEditing(false)
    setSaveError(null)
    setFormData(null)
    setConfirming(false)
  }, [selectedId])

  useEffect(() => {
    if (adding === 'movement') {
      const color = COLOR_PALETTE[movements.length % COLOR_PALETTE.length]
      setFormData({ zh: '', sub: '', start: '', end: '', region: '', description: '', color, isEvent: false })
      setSaveError(null)
      setConfirming(false)
    } else if (adding === 'artist') {
      setFormData({ zh: '', sub: '', birth: '', death: '', description: '', works: [], movements: [], url: '' })
      setSaveError(null)
      setConfirming(false)
    }
  }, [adding, movements?.length])

  if (!selected && !adding) return null

  const isAdding = !!adding
  const type = isAdding ? adding : selected?.type
  const data = selected?.data

  function enterEdit() {
    if (type === 'movement') {
      setFormData({
        zh: data.zh ?? '',
        sub: data.sub ?? '',
        start: data.start,
        end: data.end,
        region: data.region ?? '',
        description: data.description ?? '',
        color: data.color ?? '#888888',
        isEvent: !!data.isEvent,
      })
    } else {
      setFormData({
        zh: data.zh ?? '',
        sub: data.sub ?? '',
        birth: data.birth,
        death: data.death,
        description: data.description ?? '',
        works: data.works ? JSON.parse(JSON.stringify(data.works)) : [],
        movements: data.movements ?? [],
        url: data.url ?? '',
      })
    }
    setSaveError(null)
    setEditing(true)
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

    setSaving(true)
    setSaveError(null)
    try {
      if (isAdding) {
        await onAdd(type, formData)
      } else {
        const updatedItem = { ...data, ...formData }
        await onSave(type, updatedItem)
        setEditing(false)
      }
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    setSaving(true)
    setSaveError(null)
    try {
      await onDelete(type, data.id)
    } catch (err) {
      setSaveError(err.message)
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (isAdding) {
      onClose()
    } else {
      setEditing(false)
      setSaveError(null)
      setConfirming(false)
    }
  }

  const showForm = isAdding || editing

  return (
    <>
      <div onClick={onClose} style={s.backdrop} />
      <div style={s.card}>
        <button onClick={onClose} style={s.closeBtn} aria-label="关闭">×</button>

        {showForm ? (
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
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...s.btn, ...(saving ? s.btnDisabled : s.btnSave) }}
              >
                {saving ? '保存中…' : (isAdding ? '添加' : '保存')}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                style={{ ...s.btn, ...s.btnCancel }}
              >
                取消
              </button>
            </div>

            {/* 删除按钮：仅编辑已有条目时显示（新增时不显示）*/}
            {!isAdding && hasToken && (
              <button
                onClick={() => setConfirming(true)}
                disabled={saving}
                style={s.deleteBtn}
              >
                删除此条目
              </button>
            )}
          </>
        ) : (
          <>
            {type === 'movement'
              ? <MovementView data={data} artists={artists} />
              : <ArtistView data={data} movements={movements} />}

            {hasToken && (
              <button onClick={enterEdit} style={s.editEntryBtn}>编辑</button>
            )}
          </>
        )}
      </div>

      {/* 确认删除弹窗 */}
      {confirming && (
        <>
          <div onClick={() => setConfirming(false)} style={s.confirmOverlay} />
          <div style={s.confirmBox}>
            <div style={s.confirmMsg}>
              确定删除「{data.zh}」？此操作无法撤销。
            </div>
            <div style={s.confirmBtns}>
              <button
                onClick={() => setConfirming(false)}
                style={s.confirmCancelBtn}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={saving}
                style={{ ...s.confirmOkBtn, ...(saving ? { opacity: 0.5 } : {}) }}
              >
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
    position: 'fixed', right: 24, top: 24,
    width: 360, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
    background: '#1e1e3a', border: '1px solid #3a3a5a', borderRadius: 10,
    padding: '20px 20px 16px', zIndex: 11,
    color: '#ddd', fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 14,
    background: 'none', border: 'none', color: '#888',
    fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
  },
  title:       { fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 4, paddingRight: 24 },
  sub:         { fontSize: 11, color: '#aaa', marginBottom: 4 },
  meta:        { fontSize: 12, color: '#999', marginBottom: 10 },
  description: { fontSize: 13, lineHeight: 1.7, color: '#ccc', marginBottom: 10 },
  section:     { marginTop: 12 },
  sectionTitle:{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tagList:     { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag:         { background: '#2a2a4a', border: '1px solid #3a3a5a', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#bbb' },
  worksList:   { margin: '0 0 0 16px', padding: 0, lineHeight: 1.9, color: '#bbb' },
  link:        { color: '#7ab', textDecoration: 'none' },
  editEntryBtn:{
    marginTop: 16, padding: '6px 16px', width: '100%',
    background: '#2a3a5a', border: '1px solid #4a6a9a',
    borderRadius: 5, color: '#acd', fontSize: 12, cursor: 'pointer',
  },
  // 编辑表单
  editTitle:  { fontSize: 15, fontWeight: 600, color: '#eee', marginBottom: 12, paddingRight: 24 },
  form:       { display: 'flex', flexDirection: 'column', gap: 0 },
  label:      { fontSize: 11, color: '#888', marginBottom: 3, marginTop: 8 },
  input:      {
    background: '#111128', border: '1px solid #3a3a5a', borderRadius: 4,
    color: '#eee', padding: '5px 8px', fontSize: 12, marginBottom: 2,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea:   {
    background: '#111128', border: '1px solid #3a3a5a', borderRadius: 4,
    color: '#eee', padding: '5px 8px', fontSize: 12, marginBottom: 2,
    outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical',
    fontFamily: 'inherit',
  },
  row:        { display: 'flex', gap: 8 },
  half:       { flex: 1, display: 'flex', flexDirection: 'column' },
  workRow:    { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 },
  removeBtn:  {
    background: '#3a2a2a', border: '1px solid #6a3a3a', borderRadius: 3,
    color: '#c99', fontSize: 14, cursor: 'pointer', padding: '2px 6px', flexShrink: 0,
  },
  addWorkBtn: {
    marginTop: 4, padding: '4px 10px',
    background: '#1a2a3a', border: '1px solid #3a5a7a',
    borderRadius: 4, color: '#7ab', fontSize: 11, cursor: 'pointer',
  },
  errorMsg:   { color: '#f88', fontSize: 12, marginTop: 8, lineHeight: 1.5 },
  editBtnRow: { display: 'flex', gap: 8, marginTop: 14 },
  btn:        { flex: 1, padding: '6px 0', borderRadius: 5, fontSize: 12, cursor: 'pointer', border: '1px solid transparent' },
  btnSave:    { background: '#2a5a4a', borderColor: '#3a8a6a', color: '#cec' },
  btnCancel:  { background: '#2a2a4a', borderColor: '#3a3a5a', color: '#aaa' },
  btnDisabled:{ background: '#1a1a2a', borderColor: '#2a2a3a', color: '#555', cursor: 'not-allowed' },
  // 流派选择器（艺术家编辑用）
  mvSelector: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  mvChip:     {
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    border: '1px solid', fontSize: 11, cursor: 'pointer', userSelect: 'none',
    transition: 'all .15s',
  },
  // 删除按钮
  deleteBtn: {
    marginTop: 10, padding: '6px 0', width: '100%',
    background: 'none', border: '1px solid #6a3a3a',
    borderRadius: 5, color: '#e55', fontSize: 12, cursor: 'pointer',
  },
  // 确认弹窗
  confirmOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  confirmBox: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    zIndex: 101, background: '#1e1e3a', border: '1px solid #3a3a5a',
    borderRadius: 14, padding: '20px 20px 16px', minWidth: 220, maxWidth: 300,
    boxShadow: '0 12px 40px rgba(0,0,0,.4)',
  },
  confirmMsg:  { fontSize: 13, lineHeight: 1.6, color: '#ddd', marginBottom: 14 },
  confirmBtns: { display: 'flex', gap: 8 },
  confirmCancelBtn: {
    flex: 1, background: 'none', border: '1px solid #3a3a5a', color: '#aaa',
    borderRadius: 8, fontSize: 12, padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit',
  },
  confirmOkBtn: {
    flex: 1, background: '#e55', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 12, padding: '6px 0', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: 500,
  },
}
