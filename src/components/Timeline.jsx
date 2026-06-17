import { useMemo } from 'react'
import MovementBar from './MovementBar'
import ArtistDot from './ArtistDot'

const MIN_YEAR = 1580
const MAX_YEAR = 1990
const PX_PER_YEAR = 4.5

const MV_ROW_H = 30       // px per movement row
const MV_TOP_PAD = 20     // top padding before first movement row
const ARTIST_GAP = 16     // gap between movement area and artist dots
const ARTIST_DOT_AREA_H = 80  // vertical space for dots + rotated labels
const RULER_H = 28        // space for year ruler

// Greedy row-packing: sort by start, assign to the first row where last item ended
function assignRows(movements) {
  const rowOf = new Map()
  const rowEnds = [] // end year of last item in each row

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

export default function Timeline({ movements, artists }) {
  const totalWidth = (MAX_YEAR - MIN_YEAR) * PX_PER_YEAR  // 1845px

  const { rowOf, rowCount } = useMemo(() => assignRows(movements), [movements])

  // movement id → color lookup for artist dots
  const colorByMvId = useMemo(() => {
    const map = new Map()
    for (const m of movements) map.set(m.id, m.color)
    return map
  }, [movements])

  const mvAreaH = MV_TOP_PAD + rowCount * MV_ROW_H
  const artistTop = mvAreaH + ARTIST_GAP
  const totalH = artistTop + ARTIST_DOT_AREA_H + RULER_H

  // Year ruler ticks every 50 years
  const ticks = []
  for (let y = Math.ceil(MIN_YEAR / 50) * 50; y <= MAX_YEAR; y += 50) {
    ticks.push(y)
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', background: '#1a1a2e' }}>
      <div style={{ position: 'relative', width: totalWidth, height: totalH }}>

        {/* Movement bars */}
        {movements.map(mv => (
          <MovementBar
            key={mv.id}
            movement={mv}
            row={rowOf.get(mv.id) ?? 0}
            minYear={MIN_YEAR}
            pxPerYear={PX_PER_YEAR}
            rowH={MV_ROW_H}
            topPad={MV_TOP_PAD}
          />
        ))}

        {/* Artist dots */}
        {artists.map(artist => {
          // artist.color 覆盖优先，否则用第一个所属流派的颜色
          const dotColor = artist.color ?? colorByMvId.get(artist.movements?.[0]) ?? '#888'
          return (
            <ArtistDot
              key={artist.id}
              artist={artist}
              color={dotColor}
              minYear={MIN_YEAR}
              pxPerYear={PX_PER_YEAR}
              top={artistTop}
            />
          )
        })}

        {/* Year ruler */}
        {ticks.map(y => (
          <div
            key={y}
            style={{
              position: 'absolute',
              left: (y - MIN_YEAR) * PX_PER_YEAR,
              top: artistTop + ARTIST_DOT_AREA_H,
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
