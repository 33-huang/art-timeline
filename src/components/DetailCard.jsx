// 流派卡片
function MovementCard({ data, artists }) {
  const reps = artists.filter(a => a.movements.includes(data.id))

  return (
    <>
      <div style={styles.title}>{data.zh}</div>
      <div style={styles.meta}>
        {data.start}–{data.end}
        {data.region ? `　${data.region}` : ''}
      </div>

      {data.description && (
        <div
          style={styles.description}
          dangerouslySetInnerHTML={{ __html: data.description }}
        />
      )}

      {reps.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>代表艺术家</div>
          <div style={styles.tagList}>
            {reps.map(a => (
              <span key={a.id} style={styles.tag}>{a.zh}</span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// 艺术家卡片
function ArtistCard({ data, movements }) {
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvNames = data.movements.map(id => mvMap.get(id)?.zh).filter(Boolean)

  return (
    <>
      <div style={styles.title}>{data.zh}</div>
      {data.sub && <div style={styles.sub}>{data.sub}</div>}
      <div style={styles.meta}>{data.birth}–{data.death}</div>

      {mvNames.length > 0 && (
        <div style={styles.tagList}>
          {mvNames.map(name => (
            <span key={name} style={styles.tag}>{name}</span>
          ))}
        </div>
      )}

      {data.description && (
        <div
          style={styles.description}
          dangerouslySetInnerHTML={{ __html: data.description }}
        />
      )}

      {data.works && data.works.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>代表作</div>
          <ul style={styles.worksList}>
            {data.works.map((w, i) => (
              <li key={i}>
                {w.url
                  ? <a href={w.url} target="_blank" rel="noreferrer" style={styles.link}>{w.title}</a>
                  : w.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.url && (
        <div style={{ marginTop: 8 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={styles.link}>
            ↗ 外部链接
          </a>
        </div>
      )}
    </>
  )
}

// 主组件
export default function DetailCard({ selected, movements, artists, onClose }) {
  if (!selected) return null
  const { type, data } = selected

  return (
    <>
      {/* 背景蒙层：点击关闭卡片 */}
      <div onClick={onClose} style={styles.backdrop} />

      {/* 卡片面板 */}
      <div style={styles.card}>
        {/* 关闭按钮 */}
        <button onClick={onClose} style={styles.closeBtn} aria-label="关闭">×</button>

        {type === 'movement'
          ? <MovementCard data={data} artists={artists} />
          : <ArtistCard data={data} movements={movements} />}

        {/* 编辑占位按钮 — Step 9 实现 */}
        <button
          disabled
          style={styles.editBtn}
          // TODO Step 9: 连接 token / GitHub Contents API 写回逻辑
        >
          编辑
        </button>
      </div>
    </>
  )
}

// ── 样式 ───────────────────────────────────────────────
const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
  },
  card: {
    position: 'fixed',
    right: 24,
    top: 24,
    width: 340,
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    background: '#1e1e3a',
    border: '1px solid #3a3a5a',
    borderRadius: 10,
    padding: '20px 20px 16px',
    zIndex: 11,
    color: '#ddd',
    fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 13,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 14,
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 4,
    paddingRight: 24,
  },
  sub: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    lineHeight: 1.7,
    color: '#ccc',
    marginBottom: 10,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    background: '#2a2a4a',
    border: '1px solid #3a3a5a',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
    color: '#bbb',
  },
  worksList: {
    margin: '0 0 0 16px',
    padding: 0,
    lineHeight: 1.9,
    color: '#bbb',
  },
  link: {
    color: '#7ab',
    textDecoration: 'none',
  },
  editBtn: {
    marginTop: 16,
    padding: '6px 16px',
    background: '#2a2a4a',
    border: '1px solid #3a3a5a',
    borderRadius: 5,
    color: '#666',
    fontSize: 12,
    cursor: 'not-allowed',
    width: '100%',
  },
}
