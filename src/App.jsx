import { useState, useEffect } from 'react'
import { loadData } from './lib/dataStore'
import Timeline from './components/Timeline'
import DetailCard from './components/DetailCard'
import FilterBar from './components/FilterBar'
import TokenSettings from './components/TokenSettings'

const TOKEN_KEY = 'gh_token'

export default function App() {
  const [movements, setMovements] = useState(null)
  const [artists, setArtists] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  // 启动时从 localStorage 读 token 是否存在（不读 token 值本身进内存）
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    Promise.all([loadData('movements.json'), loadData('artists.json')])
      .then(([mvs, arts]) => {
        setMovements(mvs)
        setArtists(arts)
      })
      .catch(err => setError(err.message))
  }, [])

  if (error) return (
    <div style={{ padding: '2rem', color: '#f88', fontFamily: 'sans-serif' }}>
      加载失败：{error}
    </div>
  )
  if (!movements || !artists) return (
    <div style={{ padding: '2rem', color: '#aaa', fontFamily: 'sans-serif' }}>
      加载中…
    </div>
  )

  return (
    <>
      {/* 顶栏：过滤器（左）+ Token 设置入口（右） */}
      <div style={topBarStyle}>
        <FilterBar filter={filter} onFilterChange={setFilter} />
        <TokenSettings hasToken={hasToken} onTokenChange={setHasToken} />
      </div>

      <Timeline
        movements={movements}
        artists={artists}
        onSelect={setSelected}
        filter={filter}
      />
      <DetailCard
        selected={selected}
        movements={movements}
        artists={artists}
        onClose={() => setSelected(null)}
        hasToken={hasToken}
      />
    </>
  )
}

const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px 0 0',
  background: '#1a1a2e',
  borderBottom: '1px solid #2a2a4a',
}
