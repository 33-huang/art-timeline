import { s } from './styles'

// ── 公开卡：只读流派 ──────────────────────────────────
export function MovementView({ data, artists }) {
  const reps = artists.filter(a => a.movements.includes(data.id))
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      <div style={s.meta}>
        {data.start}–{data.end}{data.region ? ` · ${data.region}` : ''}
        {reps.length > 0 && <><br />代表艺术家：{reps.map(a => a.zh).join('、')}</>}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {data.url && (
        <div style={{ marginTop: 6 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>
        </div>
      )}
    </>
  )
}

// ── 公开卡：只读艺术家 ────────────────────────────────
export function ArtistView({ data, movements }) {
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvNames = data.movements.map(id => mvMap.get(id)?.zh).filter(Boolean)
  return (
    <>
      <div style={s.title}>{data.zh}</div>
      {data.sub && <div style={s.sub}>{data.sub}</div>}
      <div style={s.meta}>
        {data.birth}–{data.death}
        {mvNames.length > 0 && <><br />所属流派：{mvNames.join('、')}</>}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {data.url && (
        <div style={{ marginTop: 6 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>
        </div>
      )}
      {data.works?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>代表作</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 10px' }}>
            {data.works.map((w, i) => (
              <span key={i} style={s.workLink}>
                {w.url
                  ? <a href={w.url} target="_blank" rel="noreferrer" style={s.workLinkA}>{w.title} ↗</a>
                  : w.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
