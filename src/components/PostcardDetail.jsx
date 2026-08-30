import { useState } from 'react'

export default function PostcardDetail({ postcard, onClose }) {
  const [side, setSide] = useState('front')
  const hasBack = Boolean(postcard.back_image_url)
  const imageUrl = side === 'back' && hasBack ? postcard.back_image_url : postcard.image_url

  const releaseLabel = postcard.release_date
    ? new Date(postcard.release_date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>

        <div className="detail">
          <div className="detail__photo-frame">
            <img src={imageUrl} alt={`${postcard.name || postcard.idol_name}(${side === 'front' ? '表面' : '裏面'})`} />
          </div>

          {hasBack && (
            <div className="detail__side-toggle">
              <button
                type="button"
                className={`btn btn--small ${side === 'front' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setSide('front')}
              >
                表面
              </button>
              <button
                type="button"
                className={`btn btn--small ${side === 'back' ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setSide('back')}
              >
                裏面
              </button>
            </div>
          )}

          <div className="detail__info">
            <p className="detail__idol">
              {postcard.idol_name} {postcard.owned ? '💗' : '🤍'}
            </p>
            {postcard.name && <p className="detail__name">{postcard.name}</p>}
            {postcard.album_name && <p className="detail__album">💿 {postcard.album_name}</p>}
            {releaseLabel && <p className="detail__date">{releaseLabel}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
