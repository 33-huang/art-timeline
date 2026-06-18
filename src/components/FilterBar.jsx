const OPTIONS = [
  { value: 'all',       label: '全部' },
  { value: 'movements', label: '仅流派' },
  { value: 'artists',   label: '仅艺术家' },
]

export default function FilterBar({ filter, onFilterChange }) {
  return (
    <div style={styles.bar}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onFilterChange(opt.value)}
          style={{
            ...styles.btn,
            ...(filter === opt.value ? styles.btnActive : {}),
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    gap: 6,
    padding: '10px 16px',
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a4a',
  },
  btn: {
    padding: '4px 14px',
    borderRadius: 5,
    border: '1px solid #3a3a5a',
    background: 'transparent',
    color: '#888',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnActive: {
    background: '#2a2a5a',
    border: '1px solid #5a5a9a',
    color: '#ddd',
  },
}
