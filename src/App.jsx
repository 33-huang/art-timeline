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
  const [addingType, setAddingType] = useState(null)

  useEffect(() => {
    Promise.all([loadData('movements.json'), loadData('artists.json')])
      .then(([mvs, arts]) => {
        setMovements(mvs)
        setArtists(arts)
      })
      .catch(err => setError(err.message))
  }, [])

  async function handleSave(type, updatedItem) {
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const list = type === 'movement' ? movements : artists
    const updatedList = list.map(item => item.id === updatedItem.id ? updatedItem : item)
    await saveData(filename, updatedList)
    if (type === 'movement') setMovements(updatedList)
    else setArtists(updatedList)
    setSelected({ type, data: updatedItem })
  }

  async function handleAdd(type, formData) {
    const list = type === 'movement' ? movements : artists
    const prefix = type === 'movement' ? 'mv' : 'ar'
    const maxNum = list.reduce((max, item) => {
      const n = parseInt(item.id.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    const newId = prefix + String(maxNum + 1).padStart(2, '0')
    const newItem = { id: newId, ...formData }

    if (type === 'movement') {
      if (!newItem.region) delete newItem.region
      if (!newItem.isEvent) delete newItem.isEvent
      if (!newItem.sub) delete newItem.sub
    } else {
      if (!newItem.sub) delete newItem.sub
      if (!newItem.url) delete newItem.url
      if (!newItem.works?.length) delete newItem.works
    }

    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const newList = [...list, newItem]
    await saveData(filename, newList)
    if (type === 'movement') setMovements(newList)
    else setArtists(newList)
    setAddingType(null)
    setSelected({ type, data: newItem })
  }

  async function handleDelete(type, id) {
    const filename = type === 'movement' ? 'movements.json' : 'artists.json'
    const list = type === 'movement' ? movements : artists
    const newList = list.filter(item => item.id !== id)

    await saveData(filename, newList)
    if (type === 'movement') {
      setMovements(newList)
      const needsCleanup = artists.some(a => a.movements.includes(id))
      if (needsCleanup) {
        const updatedArtists = artists.map(a =>
          a.movements.includes(id)
            ? { ...a, movements: a.movements.filter(mid => mid !== id) }
            : a
        )
        await saveData('artists.json', updatedArtists)
        setArtists(updatedArtists)
      }
    } else {
      setArtists(newList)
    }
    setSelected(null)
  }

  function handleCloseCard() {
    setSelected(null)
    setAddingType(null)
  }

  function startAdd(type) {
    setSelected(null)
    setAddingType(type)
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasToken && (
            <>
              <button className="add-btn" onClick={() => startAdd('movement')}>＋ 流派</button>
              <button className="add-btn" onClick={() => startAdd('artist')}>＋ 艺术家</button>
            </>
          )}
          <TokenSettings hasToken={hasToken} onTokenChange={setHasToken} />
        </div>
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
        onClose={handleCloseCard}
        hasToken={hasToken}
        onSave={handleSave}
        adding={addingType}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
    </>
  )
}
