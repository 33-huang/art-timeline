import { useRef, useEffect } from 'react'
import { s } from './styles'
import { noteClickHandler } from './helpers'

// ── 私密卡参照行 ──────────────────────────────────────
export function NoteSummary({ data, type, movements, actions }) {
  const summary = type === 'movement'
    ? `${data.zh}　${data.start}–${data.end}`
    : `${data.zh}　${data.birth}–${data.death}` +
      (data.movements?.length
        ? `　${data.movements.map(id => movements.find(m => m.id === id)?.zh).filter(Boolean).join('、')}`
        : '')
  return (
    <div style={s.noteHeader}>
      <span>{summary}</span>
      {actions && <span style={s.noteHeaderActions}>{actions}</span>}
    </div>
  )
}

// ── 私密卡：手风琴浏览 ────────────────────────────────
export function NoteAccordion({ modules, openSet, onToggle, onEdit, canEdit }) {
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
              <span style={{ flex: 1 }}>{mod.title || '无标题'}</span>
              {canEdit && (
                <span style={s.accEditIcon} onClick={e => { e.stopPropagation(); onEdit(mod) }} title="编辑">✎</span>
              )}
            </div>
            {open && (
              <>
                <div className="note-content" style={s.accBody} onClick={noteClickHandler}
                  dangerouslySetInnerHTML={{ __html: mod.content || '' }} />
                {canEdit && (
                  <div style={{ textAlign: 'right', padding: '0 0 4px 17px' }}>
                    <span style={s.accEditIcon} onClick={() => onEdit(mod)}>编辑当前笔记</span>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── 单个模块的富文本编辑器 ────────────────────────────
export function ModuleEditor({ mod, onChange, onDelete, editorRef }) {
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
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); execWithPrompt('createLink', '输入链接 URL：') }} title="链接">🔗</button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); execWithPrompt('insertHTML', '输入图片 URL：', u => `<img src="${u}" style="max-width:100%;border-radius:4px;margin:4px 0" />`) }} title="图片URL">🖼</button>
        <button style={s.noteToolBtn} onMouseDown={e => { e.preventDefault(); exec('removeFormat'); exec('unlink') }} title="清除格式"><span style={{ textDecoration: 'line-through' }}>T</span></button>
      </div>
      <div ref={setRef} contentEditable suppressContentEditableWarning
        style={s.noteEditable} />
    </div>
  )
}
