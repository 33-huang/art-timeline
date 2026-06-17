export default function MovementBar({ movement, row, minYear, pxPerYear, rowH, topPad }) {
  const left = (movement.start - minYear) * pxPerYear
  const width = Math.max((movement.end - movement.start) * pxPerYear, 14)
  const top = topPad + row * rowH

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height: rowH - 4,
        background: movement.color,
        borderRadius: 3,
        opacity: movement.isEvent ? 0.35 : 1,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 5,
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: 'default',
      }}
    >
      <span style={{
        fontSize: 10,
        color: '#fff',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }}>
        {movement.zh}
      </span>
    </div>
  )
}
