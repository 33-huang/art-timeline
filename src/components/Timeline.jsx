import { useMemo } from 'react'
import MovementBar from './MovementBar'
import ArtistDot from './ArtistDot'

const MIN_YEAR = 1580
const MAX_YEAR = 1990
const PX_PER_YEAR = 4.5

const MV_ROW_H = 30
const MV_TOP_PAD = 20
const ARTIST_GAP = 16
const ARTIST_DOT_AREA_H = 80
const RULER_H = 28

function assignRows(movements) {
  const rowOf = new Map()
  const rowEnds = []
  const sorted = [...movements].sort((a, b) => a.start - b.start)
  for (const mv of sorted) {
    let placed = false
    for (let r = 0; r < rowEnds.length; r++) {
      if (rowEnds[r] <= mv.start) {
        rowOf.set(mv.id, r)
        rowEnds[r] = mv.end
        placed = true
        break
      }
    }
    if (!placed) {
      rowOf.set(mv.id, rowEnds.length)
      rowEnds.push(mv.end)
    }
  }
  return { rowOf, rowCount: rowEnds.length }
}

export default function Timeline({ movements, artists, onSelect, filter }) {
  const totalWidth = (MAX_YEAR - MIN_YEAR) * PX_PER_YEAR

  const { rowOf, rowCount } = useMemo(() => assignRows(movements), [movements])

  const colorByMvId = useMemo(() => {
    const map = new Map()
    for (const m of movements) map.set(m.id, m.color)
    return map
  }, [movements])

  const showMovements = filter !== 'artists'
  const showArtists   = filter !== 'movements'

  // 流派区高度（始终按完整行数算，用于定位）
  const mvAreaH = MV_TOP_PAD + rowCount * MV_ROW_H

  // 艺术家圆点的 top：
  //   有流派区时跟在流派区下方；只有艺术家时贴近顶部
  const artistTop = showMovements ? mvAreaH + ARTIST_GAP : MV_TOP_PAD

  // 年份刻度的 top：
  //   有艺术家区时跟在艺术家区下方；只有流派时跟在流派区下方
  const rulerTop = showArtists ? artistTop + ARTIST_DOT_AREA_H : mvAreaH

  const totalH = rulerTop + RULER_H

  const ticks = []
  for (let y = Math.ceil(MIN_YEAR / 50) * 50; y <= MAX_YEAR; y += 50) {
    ticks.push(y)
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', background: '#1a1a2e' }}>
      <div style={{ position: 'relative', width: totalWidth, height: totalH }}>

        {/* 流派色块：filter !== 'artists' 时显示 */}
        {showMovements && movements.map(mv => (
          <MovementBar
            key={mv.id}
            movement={mv}
            row={rowOf.get(mv.id) ?? 0}
            minYear={MIN_YEAR}
            pxPerYear={PX_PER_YEAR}
            rowH={MV_ROW_H}
            topPad={MV_TOP_PAD}
            onClick={onSelect}
          />
        ))}

        {/* 艺术家圆点：filter !== 'movements' 时显示 */}
        {showArtists && artists.map(artist => {
          const dotColor = artist.color ?? colorByMvId.get(artist.movements?.[0]) ?? '#888'
          return (
            <ArtistDot
              key={artist.id}
              artist={artist}
              color={dotColor}
              minYear={MIN_YEAR}
              pxPerYear={PX_PER_YEAR}
              top={artistTop}
              onClick={onSelect}
            />
          )
        })}

        {/* 年份刻度：始终显示 */}
        {ticks.map(y => (
          <div
            key={y}
            style={{
              position: 'absolute',
              left: (y - MIN_YEAR) * PX_PER_YEAR,
              top: rulerTop,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              userSelect: 'none',
            }}
          >
            <div style={{ width: 1, height: 6, background: '#444' }} />
            <span style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>{y}</span>
          </div>
        ))}

      </div>
    </div>
  )
}
