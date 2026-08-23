import { useState, useRef, useEffect } from 'react'
import { s, COLOR_PALETTE, COLOR_NAMES } from './styles'
import { computePosAfter, handleEditorPaste } from './helpers'

// ── 颜色下拉选择器 ──────────────────────────────────────
export function ColorPicker({ value, onChange, showAuto }) {
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

// ── 富文本简介编辑器 ─────────────────────────────────
export function RichTextArea({ value, onChange }) {
  const ref = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = value || ''
      initialized.current = true
    }
  }, [value])

  useEffect(() => () => { initialized.current = false }, [])

  function exec(cmd) {
    ref.current?.focus()
    document.execCommand(cmd, false, null)
  }

  function flush() {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div>
      <div style={s.noteToolbar}>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); exec('bold') }} title="加粗"><b>B</b></button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); exec('removeFormat'); exec('unlink') }} title="清除格式"><span style={{ textDecoration: 'line-through' }}>T</span></button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={flush} onBlur={flush} onPaste={handleEditorPaste}
        style={s.descEditable} />
    </div>
  )
}

// 图片链接预览：加载失败自动隐藏，不显示破图标
function ImagePreview({ src }) {
  const [error, setError] = useState(false)
  if (!src || error) return null
  return <img src={src} alt="" style={s.thumbPreview} onError={() => setError(true)} />
}

// 单选搜索下拉：输一个字弹关联选项，选中即"排在其后"；留空按年份
export function PosAfterSelector({ value, options, onPick, onClear }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  const filtered = options.filter(o => !search.trim() || o.zh.includes(search.trim()))
  return (
    <div style={s.mvWrap}>
      {selected && (
        <div style={s.mvTags}>
          <span style={s.mvTag}>
            排在「{selected.zh}」之后
            <span style={s.mvTagRm} onMouseDown={e => { e.preventDefault(); onClear() }}>×</span>
          </span>
        </div>
      )}
      <input style={s.mvSearch}
        placeholder={selected ? '改为排在其他条目之后…' : '输入名字排在其后；留空按年份'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <div style={s.mvDropdown}>
          {filtered.length > 0 ? filtered.map(o => (
            <div key={o.id}
              onMouseDown={e => { e.preventDefault(); onPick(o.id); setSearch(''); setOpen(false) }}
              style={{ ...s.mvOption, ...(o.id === value ? { color: 'var(--text)', fontWeight: 500 } : {}) }}>
              {o.zh}{o.id === value ? ' ✓' : ''}
            </div>
          )) : (
            <div style={{ padding: '4px 7px', fontSize: 11, color: 'var(--text-faint)' }}>无匹配</div>
          )}
        </div>
      )}
    </div>
  )
}

export function MovementEditForm({ formData, onChange, allMovements, allArtists, selfId }) {
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
          <input style={{ ...s.input, flex: 1 }} type="number" value={formData.end}
            placeholder={formData.isEvent ? '结束(留空=单年)' : '结束'}
            onChange={e => onChange({ ...formData, end: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>国别</label>
        <input style={s.input} value={formData.region}
          onChange={e => onChange({ ...formData, region: e.target.value })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>位置</label>
        <div style={{ flex: 1 }}>
          <PosAfterSelector
            value={formData.posAfter || ''}
            options={allMovements.filter(m => !m.isEvent && m.id !== selfId)}
            onPick={id => onChange({ ...formData, posAfter: id, posStart: computePosAfter(id, allMovements, allArtists, selfId) })}
            onClear={() => onChange({ ...formData, posAfter: '', posStart: '' })} />
        </div>
      </div>
      <div style={s.fieldBlock}>
        <label style={s.blockLabel}>简介</label>
        <RichTextArea value={formData.description}
          onChange={v => onChange({ ...formData, description: v })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>链接</label>
        <input style={s.input} value={formData.url}
          onChange={e => onChange({ ...formData, url: e.target.value })} placeholder="https://..." />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>代表作</label>
        <input style={s.input} value={formData.workUrl || ''}
          onChange={e => onChange({ ...formData, workUrl: e.target.value })} placeholder="代表作详情页 https://..." />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>配图</label>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <input style={s.input} value={formData.imageUrl || ''}
            onChange={e => onChange({ ...formData, imageUrl: e.target.value })} placeholder="代表画缩略图 https://..." />
          <ImagePreview key={formData.imageUrl} src={formData.imageUrl} />
        </div>
      </div>
      <div style={{ ...s.field, marginTop: 2 }}>
        <label style={s.fieldLabel}>颜色</label>
        <ColorPicker value={formData.color} onChange={c => onChange({ ...formData, color: c })} />
        <label style={{ ...s.fieldLabel, cursor: 'pointer', marginLeft: 12, width: 'auto' }}>
          <input type="checkbox" checked={formData.isEvent} style={{ marginRight: 4 }}
            onChange={e => onChange({ ...formData, isEvent: e.target.checked })} />
          大事件
        </label>
      </div>
    </div>
  )
}

export function MvSelector({ selected, allMovements, onChange }) {
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

export function ArtistEditForm({ formData, onChange, allMovements, allArtists, selfId }) {
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
      <div style={s.field}>
        <label style={s.fieldLabel}>位置</label>
        <div style={{ flex: 1 }}>
          <PosAfterSelector
            value={formData.posAfter || ''}
            options={mvIds.length === 0
              ? allArtists.filter(a => a.id !== selfId)
              : allArtists.filter(a => a.id !== selfId && a.movements?.some(id => mvIds.includes(id)))}
            onPick={id => onChange(mvIds.length === 0
              ? { ...formData, posAfter: id, posStart: computePosAfter(id, allMovements, allArtists, selfId) }
              : { ...formData, posAfter: id })}
            onClear={() => onChange(mvIds.length === 0
              ? { ...formData, posAfter: '', posStart: '' }
              : { ...formData, posAfter: '' })} />
        </div>
      </div>
      <div style={s.fieldBlock}>
        <label style={s.blockLabel}>简介</label>
        <RichTextArea value={formData.description}
          onChange={v => onChange({ ...formData, description: v })} />
      </div>
      <div style={s.field}>
        <label style={s.fieldLabel}>链接</label>
        <input style={s.input} value={formData.url}
          onChange={e => onChange({ ...formData, url: e.target.value })} placeholder="https://..." />
      </div>
      {mvIds.length === 0 && (
        <div style={s.field}>
          <label style={s.fieldLabel}>颜色</label>
          <ColorPicker value={formData.color || ''} showAuto
            onChange={c => onChange({ ...formData, color: c })} />
        </div>
      )}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <input style={s.workUrlInp} placeholder="配图链接 https://..." value={w.imageUrl || ''}
                onChange={e => updateWork(i, 'imageUrl', e.target.value)} />
              <ImagePreview key={w.imageUrl} src={w.imageUrl} />
            </div>
          </div>
        ))}
        <button onClick={addWork} style={s.workAddBtn}>＋ 新增作品</button>
      </div>
    </div>
  )
}
