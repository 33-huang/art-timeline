const OPTIONS = [
  { value: 'all',       label: '全部' },
  { value: 'movements', label: '仅流派' },
  { value: 'artists',   label: '仅艺术家' },
]

export default function FilterBar({ filter, onFilterChange }) {
  return (
    <div className="toolbar-left">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          className={`filter-btn${filter === opt.value ? ' active' : ''}`}
          onClick={() => onFilterChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
