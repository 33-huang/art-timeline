import { useState } from 'react'
import { TOKEN_KEY } from '../lib/dataStore'

export default function TokenSettings({ hasToken, onTokenChange }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  function handleSave() {
    const trimmed = input.trim()
    if (!trimmed) return
    localStorage.setItem(TOKEN_KEY, trimmed)   // token 只写 localStorage，不进源码/URL/日志
    onTokenChange(true)
    setInput('')   // 立刻清空输入框，不在内存里留存
    setOpen(false)
  }

  function handleClear() {
    localStorage.removeItem(TOKEN_KEY)
    onTokenChange(false)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="gear-btn"
        title="Token 设置"
        aria-label="Token 设置"
      >
        ⚙
      </button>

      {open && (
        <>
          {/* 点击面板外关闭 */}
          <div onClick={() => { setOpen(false); setInput('') }} style={styles.backdrop} />

          <div style={styles.panel}>
            <div style={styles.panelTitle}>GitHub Token 设置</div>

            <div style={styles.statusRow}>
              状态：
              <span style={{ color: hasToken ? '#6c6' : '#a88' }}>
                {hasToken ? '已设置 ✓' : '未设置'}
              </span>
            </div>

            <div style={styles.hint}>
              用于编辑内容并写回仓库（读取不需要 token）。<br />
              请使用仅对 <code style={styles.code}>art-timeline</code> 仓库有
              Contents 读写权限的 fine-grained token。
            </div>

            <input
              type="password"
              placeholder="粘贴新 token..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={styles.input}
              autoComplete="new-password"
              spellCheck={false}
            />

            <div style={styles.btnRow}>
              <button
                onClick={handleSave}
                disabled={!input.trim()}
                style={{ ...styles.btn, ...(input.trim() ? styles.btnSave : styles.btnDisabled) }}
              >
                保存
              </button>
              {hasToken && (
                <button onClick={handleClear} style={{ ...styles.btn, ...styles.btnClear }}>
                  清除 token
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 20,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    width: 300,
    background: '#1e1e3a',
    border: '1px solid #3a3a5a',
    borderRadius: 8,
    padding: '14px 16px',
    zIndex: 21,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'system-ui, "PingFang SC", sans-serif',
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#eee',
    marginBottom: 8,
  },
  statusRow: {
    marginBottom: 8,
    color: '#aaa',
  },
  hint: {
    color: '#777',
    lineHeight: 1.6,
    marginBottom: 10,
  },
  code: {
    background: '#2a2a4a',
    padding: '1px 4px',
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#bbb',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#111128',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    color: '#eee',
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 10,
    outline: 'none',
  },
  btnRow: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    padding: '5px 14px',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  btnSave: {
    background: '#2a5a4a',
    borderColor: '#3a8a6a',
    color: '#cec',
  },
  btnDisabled: {
    background: '#2a2a4a',
    borderColor: '#3a3a5a',
    color: '#555',
    cursor: 'not-allowed',
  },
  btnClear: {
    background: '#3a2a2a',
    borderColor: '#6a3a3a',
    color: '#c99',
    cursor: 'pointer',
  },
}
