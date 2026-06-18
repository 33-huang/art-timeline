import { useState, useEffect } from 'react'
import { loadData, saveData, TOKEN_KEY } from './lib/dataStore'
import Timeline from './components/Timeline'
import DetailCard from './components/DetailCard'
import FilterBar from './components/FilterBar'
import TokenSettings from './components/TokenSettings'

export default function App() {
  const [movements, setMovements] = useState(null)
  const [artists, setArtists] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    Promise.all([loadData('movements.json'), loadData('artists.json')])
      .then(([mvs, arts]) => {
        setMovements(mvs)
        setArtists(arts)
      })
      .catch(err => setError(err.message))
  }, [])

  // 编辑保存：更新内存数组 → saveData 写整个文件 → 更新 state + selected
  async function handleSave(type, updatedItem) {
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const list = type === 'movement' ? movements : artists
    const updatedList = list.map(item => item.id === updatedItem.id ? updatedItem : item)
    await saveData(filename, updatedList)          // 写整个数组，throws on error
    if (type === 'movement') setMovements(updatedList)
    else setArtists(updatedList)
    setSelected({ type, data: updatedItem })       // 更新选中项反映最新内容
  }

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
      <div className="toolbar">
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
        onSave={handleSave}
      />
    </>
  )
}
