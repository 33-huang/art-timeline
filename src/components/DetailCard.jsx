import { useState, useEffect } from 'react'

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

      <div style={s.row}>
        <div style={s.half}>
          <label style={s.label}>起始年</label>
          <input style={s.input} type="number" value={formData.start}
            onChange={e => onChange({ ...formData, start: Number(e.target.value) })} />
        </div>
        <div style={s.half}>
          <label style={s.label}>结束年</label>
          <input style={s.input} type="number" value={formData.end}
            onChange={e => onChange({ ...formData, end: Number(e.target.value) })} />
        </div>
      </div>

      <label style={s.label}>地区</label>
      <input style={s.input} value={formData.region}
        onChange={e => onChange({ ...formData, region: e.target.value })} />

      <label style={s.label}>描述（支持 HTML）</label>
      <textarea style={s.textarea} rows={8} value={formData.description}
        onChange={e => onChange({ ...formData, description: e.target.value })} />
    </div>
  )
}

// ── 编辑表单：艺术家 ────────────────────────────────────
function ArtistEditForm({ formData, onChange }) {
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

  return (
    <div style={s.form}>
      <label style={s.label}>名称</label>
      <input style={s.input} value={formData.zh}
        onChange={e => onChange({ ...formData, zh: e.target.value })} />

      <div style={s.row}>
        <div style={s.half}>
          <label style={s.label}>出生年</label>
          <input style={s.input} type="number" value={formData.birth}
            onChange={e => onChange({ ...formData, birth: Number(e.target.value) })} />
        </div>
        <div style={s.half}>
          <label style={s.label}>逝世年</label>
          <input style={s.input} type="number" value={formData.death}
            onChange={e => onChange({ ...formData, death: Number(e.target.value) })} />
        </div>
      </div>

      <label style={s.label}>描述（支持 HTML）</label>
      <textarea style={s.textarea} rows={6} value={formData.description}
        onChange={e => onChange({ ...formData, description: e.target.value })} />

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

// ── 主组件 ──────────────────────────────────────────────
export default function DetailCard({ selected, movements, artists, onClose, hasToken, onSave }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // 切换到不同条目时重置编辑状态
  const selectedId = selected?.data?.id
  useEffect(() => {
    setEditing(false)
    setSaveError(null)
    setFormData(null)
  }, [selectedId])

  if (!selected) return null
  const { type, data } = selected

  function enterEdit() {
    if (type === 'movement') {
      setFormData({
        zh: data.zh ?? '',
        start: data.start,
        end: data.end,
        region: data.region ?? '',
        description: data.description ?? '',
      })
    } else {
      setFormData({
        zh: data.zh ?? '',
        birth: data.birth,
        death: data.death,
        description: data.description ?? '',
        works: data.works ? JSON.parse(JSON.stringify(data.works)) : [],
      })
    }
    setSaveError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!formData) return
    setSaving(true)
    setSaveError(null)
    // 保留原始数据里其他字段（id、color、movements 引用等），只覆盖表单涉及的字段
    const updatedItem = { ...data, ...formData }
    try {
      await onSave(type, updatedItem)   // App 负责调 saveData + 更新 state
      setEditing(false)
    } catch (err) {
      setSaveError(err.message)         // 失败保留表单内容，不丢用户改动
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={s.backdrop} />
      <div style={s.card}>
        <button onClick={onClose} style={s.closeBtn} aria-label="关闭">×</button>

        {editing ? (
          <>
            <div style={s.editTitle}>编辑：{data.zh}</div>
            {type === 'movement'
              ? <MovementEditForm formData={formData} onChange={setFormData} />
              : <ArtistEditForm   formData={formData} onChange={setFormData} />}

            {saveError && <div style={s.errorMsg}>{saveError}</div>}

            <div style={s.editBtnRow}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ ...s.btn, ...(saving ? s.btnDisabled : s.btnSave) }}
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button
                onClick={() => { setEditing(false); setSaveError(null) }}
                disabled={saving}
                style={{ ...s.btn, ...s.btnCancel }}
              >
                取消
              </button>
            </div>
          </>
        ) : (
          <>
            {type === 'movement'
              ? <MovementView data={data} artists={artists} />
              : <ArtistView   data={data} movements={movements} />}

            {hasToken && (
              <button onClick={enterEdit} style={s.editEntryBtn}>编辑</button>
            )}
          </>
        )}
      </div>
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
}
