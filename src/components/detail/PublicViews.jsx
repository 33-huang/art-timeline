import { useState } from 'react'
import { s } from './styles'
import { pickRepWork } from './helpers'

// 肖像/配图版权标注：只有非公共领域来源（如 CC BY-SA 需署名）才会填这两个字段
function ImageCredit({ data }) {
  if (!data.imageCredit) return null
  return (
    <div style={s.imageCredit}>
      图片来源：{data.imageCreditUrl
        ? <a href={data.imageCreditUrl} target="_blank" rel="noreferrer" style={s.imageCreditA}>{data.imageCredit}</a>
        : data.imageCredit}
    </div>
  )
}

// 流派代表作单条：纯展示，不可点击/不跳转，加载失败自动整格隐藏
function MovementWorkItem({ artist, work }) {
  const [imgError, setImgError] = useState(false)
  if (imgError) return null
  return (
    <div style={s.workCard}>
      <img src={work.imageUrl} alt={work.title} style={s.workThumbStatic} onError={() => setImgError(true)} />
      <div style={s.workTitleQuote}>《{work.title}》</div>
      <div style={s.workArtistName}>{artist.zh}</div>
    </div>
  )
}

// ── 公开卡：只读流派 ──────────────────────────────────
export function MovementView({ data, artists }) {
  const [imgError, setImgError] = useState(false)
  const reps = artists.filter(a => a.movements.includes(data.id))
  const repWorks = reps
    .map(artist => ({ artist, work: pickRepWork(artist) }))
    .filter(x => x.work)
  return (
    <>
      <div style={s.titleRow}>
        <div style={s.titleCol}>
          <div style={s.title}>{data.zh}</div>
          <div style={s.meta}>
            {data.start === data.end ? data.start : `${data.start}–${data.end}`}{data.region ? ` · ${data.region}` : ''}
            {reps.length > 0 && <><br />代表艺术家：{reps.map(a => a.zh).join('、')}</>}
          </div>
        </div>
        {data.imageUrl && !imgError && (
          <img src={data.imageUrl} alt="" style={s.thumb} onError={() => setImgError(true)} />
        )}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      {(data.url || data.workUrl) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
          {data.url && <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>}
          {data.workUrl && <a href={data.workUrl} target="_blank" rel="noreferrer" style={s.link}>↗ 代表作</a>}
        </div>
      )}
      {repWorks.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>流派代表作</div>
          <div style={s.worksGrid}>
            {repWorks.map(({ artist, work }) => <MovementWorkItem key={artist.id} artist={artist} work={work} />)}
          </div>
        </div>
      )}
      <ImageCredit data={data} />
    </>
  )
}

// 代表作单条：有配图显示小缩略图(点图放模态大图，点名字跳转作品链接)，没配图保持纯文字/文字链接
function WorkItem({ work }) {
  const [imgError, setImgError] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  if (work.imageUrl && !imgError) {
    return (
      <>
        <div style={s.workCard}>
          <img src={work.imageUrl} alt={work.title} style={s.workThumb}
            onClick={() => setZoomed(true)} onError={() => setImgError(true)} />
          {work.url
            ? <a href={work.url} target="_blank" rel="noreferrer" style={s.workCaptionA}>{work.title} ↗</a>
            : <div style={s.workCaption}>{work.title}</div>}
        </div>
        {zoomed && (
          <>
            <div onClick={() => setZoomed(false)} style={s.zoomOverlay} />
            <div style={s.zoomBox}>
              <button onClick={() => setZoomed(false)} style={s.zoomClose} aria-label="关闭">×</button>
              <img src={work.imageUrl} alt={work.title} style={s.zoomImg} />
            </div>
          </>
        )}
      </>
    )
  }
  return (
    <span style={s.workLink}>
      {work.url
        ? <a href={work.url} target="_blank" rel="noreferrer" style={s.workLinkA}>{work.title} ↗</a>
        : work.title}
    </span>
  )
}

// ── 公开卡：只读艺术家 ────────────────────────────────
export function ArtistView({ data, movements }) {
  const [imgError, setImgError] = useState(false)
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvNames = data.movements.map(id => mvMap.get(id)?.zh).filter(Boolean)
  return (
    <>
      <div style={s.titleRow}>
        <div style={s.titleCol}>
          <div style={s.title}>{data.zh}</div>
          {data.sub && <div style={s.sub}>{data.sub}</div>}
          <div style={s.meta}>
            {data.birth}–{data.death}
            {mvNames.length > 0 && <><br />所属流派：{mvNames.join('、')}</>}
          </div>
        </div>
        {data.imageUrl && !imgError && (
          <img src={data.imageUrl} alt="" style={s.thumb} onError={() => setImgError(true)} />
        )}
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
          <div style={s.worksGrid}>
            {data.works.map((w, i) => <WorkItem key={i} work={w} />)}
          </div>
        </div>
      )}
      <ImageCredit data={data} />
    </>
  )
}
