import { useState } from 'react'

// 全屏看大图：半透明背景，× 贴在图片右上角，图片下方深色栏写作品名和来源。
// 手机视图里简介的带图链接、两端的「代表作」缩略图都用它。
export default function ImageViewer({ src, title, page, onClose }) {
  const [state, setState] = useState('loading')
  return (
    <div className="m-viewer" onClick={onClose} role="dialog" aria-label={title}>
      <div className="m-viewer-box">
        {state !== 'error' && (
          <img src={src} alt={title} className={state === 'ok' ? 'on' : ''}
            onLoad={() => setState('ok')} onError={() => setState('error')} />
        )}
        {state === 'ok' && <button className="m-viewer-close" aria-label="关闭">×</button>}
        <div className="m-viewer-cap" onClick={e => e.stopPropagation()}>
          <span>{title}</span>
          {page && <a href={page} target="_blank" rel="noreferrer">来源 ↗&#xFE0E;</a>}
        </div>
      </div>
      {state === 'loading' && <div className="m-viewer-msg">加载中…</div>}
      {state === 'error' && <div className="m-viewer-msg">图片打不开</div>}
    </div>
  )
}
