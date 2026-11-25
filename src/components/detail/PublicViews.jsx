import { useState, useContext } from 'react'
import { ViewStyleContext } from './viewStyle'
import { spanText } from '../../lib/dataStore'
import ImageViewer from '../ImageViewer'

// 简介由 AI 撰写时（数据里 aiWritten: true）在简介下方加一行小字
function AiNote({ data }) {
  const s = useContext(ViewStyleContext)
  if (!data.aiWritten) return null
  return <div style={s.aiNote}>简介由 AI 撰写</div>
}
import { pickRepWork } from './helpers'

// 肖像/配图版权标注：只有非公共领域来源（如 CC BY-SA 需署名）才会填这两个字段
function ImageCredit({ data }) {
  const s = useContext(ViewStyleContext)
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
  const s = useContext(ViewStyleContext)
  const [imgError, setImgError] = useState(false)
  if (imgError) return null
  return (
    <div style={s.workCard}>
      <img src={work.thumbUrl || work.imageUrl} alt={work.title} style={s.workThumbStatic} onError={() => setImgError(true)} />
      <div style={s.workTitleQuote}>《{work.title}》</div>
      <div style={s.workArtistName}>{artist.zh}</div>
    </div>
  )
}

// ── 公开卡：只读流派 ──────────────────────────────────
export function MovementView({ data, artists, onPickArtist }) {
  const s = useContext(ViewStyleContext)
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
            {spanText(data.start, data.end, data.ongoing)}{data.region ? ` · ${data.region}` : ''}
            {reps.length > 0 && <><br />代表艺术家：{onPickArtist
              ? reps.map((a, i) => <span key={a.id}>{i > 0 && '、'}<span style={s.pickName} onClick={() => onPickArtist(a)}>{a.zh}</span></span>)
              : reps.map(a => a.zh).join('、')}</>}
          </div>
        </div>
        {data.imageUrl && !imgError && (
          <img src={data.imageUrl} alt="" style={s.thumb} onError={() => setImgError(true)} />
        )}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      <AiNote data={data} />
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
  const s = useContext(ViewStyleContext)
  const [imgError, setImgError] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  if (work.imageUrl && !imgError) {
    return (
      <>
        <div style={s.workCard}>
          <img src={work.thumbUrl || work.imageUrl} alt={work.title} style={s.workThumb}
            onClick={() => setZoomed(true)} onError={() => setImgError(true)} />
          {work.url
            ? <a href={work.url} target="_blank" rel="noreferrer" style={s.workCaptionA}>{work.title} ↗</a>
            : <div style={s.workCaption}>{work.title}</div>}
        </div>
        {zoomed && <ImageViewer src={work.imageUrl} title={work.title} page={work.imageSource} onClose={() => setZoomed(false)} />}
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
export function ArtistView({ data, movements, onPickMovement }) {
  const s = useContext(ViewStyleContext)
  const [imgError, setImgError] = useState(false)
  const mvMap = new Map(movements.map(m => [m.id, m]))
  const mvList = data.movements.map(id => mvMap.get(id)).filter(Boolean)
  const mvNames = mvList.map(m => m.zh)
  return (
    <>
      <div style={s.titleRow}>
        <div style={s.titleCol}>
          <div style={s.title}>{data.zh}</div>
          {data.sub && <div style={s.sub}>{data.sub}</div>}
          <div style={s.meta}>
            {spanText(data.birth, data.death, data.alive)}
            {mvNames.length > 0 && <><br />所属流派：{onPickMovement
              ? mvList.map((m, i) => <span key={m.id}>{i > 0 && '、'}<span style={s.pickName} onClick={() => onPickMovement(m)}>{m.zh}</span></span>)
              : mvNames.join('、')}</>}
          </div>
        </div>
        {data.imageUrl && !imgError && (
          <img src={data.imageUrl} alt="" style={s.thumb} onError={() => setImgError(true)} />
        )}
      </div>
      {data.description && (
        <div style={s.description} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}
      <AiNote data={data} />
      {data.url && (
        <div style={{ marginTop: 6 }}>
          <a href={data.url} target="_blank" rel="noreferrer" style={s.link}>↗ 维基百科</a>
        </div>
      )}
      {data.works?.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>代表作</div>
          {/* 有图的排成缩略图，没图的另起一列文字链接，避免混排时下划线拉得很长 */}
          {data.works.some(w => w.imageUrl) && (
            <div style={s.worksGrid}>
              {data.works.map((w, i) => w.imageUrl ? <WorkItem key={i} work={w} /> : null)}
            </div>
          )}
          {data.works.some(w => !w.imageUrl) && (
            <ul style={s.workTextList}>
              {data.works.map((w, i) => w.imageUrl ? null : (
                <li key={i} style={s.workTextItem}>
                  {w.url ? <a href={w.url} target="_blank" rel="noreferrer" style={s.workTextA}>{w.title.trim()} ↗&#xFE0E;</a> : w.title.trim()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ImageCredit data={data} />
    </>
  )
}
