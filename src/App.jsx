import { useState, useEffect } from 'react'
import { loadData } from './lib/dataStore'
import Timeline from './components/Timeline'
import DetailCard from './components/DetailCard'

export default function App() {
  const [movements, setMovements] = useState(null)
  const [artists, setArtists] = useState(null)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null) // { type: 'movement'|'artist', data: {...} }

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
      <Timeline
        movements={movements}
        artists={artists}
        onSelect={setSelected}
      />
      <DetailCard
        selected={selected}
        movements={movements}
        artists={artists}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
