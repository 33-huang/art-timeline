const DOT_R = 5

export default function ArtistDot({ artist, color, minYear, pxPerYear, top }) {
  // posStart 覆盖：若存在则用 posStart 定位，否则用 birth（亨利·卢梭等用此字段）
  const xYear = artist.posStart ?? artist.birth
  const left = (xYear - minYear) * pxPerYear

  return (
    <div
      style={{
        position: 'absolute',
        left: left - DOT_R,
        top,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <div
        style={{
          width: DOT_R * 2,
          height: DOT_R * 2,
          borderRadius: '50%',
          background: color,
          border: '1.5px solid rgba(255,255,255,0.45)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 9,
          color: '#bbb',
          whiteSpace: 'nowrap',
          transformOrigin: 'top left',
          transform: 'rotate(-50deg) translateX(2px)',
          lineHeight: 1,
        }}
      >
        {artist.zh}
      </span>
    </div>
  )
}
