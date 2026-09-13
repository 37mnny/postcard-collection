import { useState } from 'react'

const SOURCE_TYPE_LABELS = { album: '💿', book: '📖', other: '🎁' }

export default function PostcardDetail({ postcard, onClose, onEdit, onFilter }) {
  const [flipped, setFlipped] = useState(false)
  const hasBack = Boolean(postcard.back_image_url)
  const isPhotocard = postcard.kind === 'photocard'
  const [ratioW, ratioH] = (postcard.photocard_size || '55x85').split('x').map(Number)
  const frameStyle = { aspectRatio: isPhotocard ? `${ratioW} / ${ratioH}` : '3 / 4' }

  const releaseLabel = postcard.release_date
    ? new Date(postcard.release_date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const filter = (value) => (e) => {
    e.stopPropagation()
    onFilter(value)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>

        <div className="detail">
          {hasBack ? (
            <div
              className={`detail__flip-card${flipped ? ' is-flipped' : ''}`}
              style={frameStyle}
              onClick={() => setFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              aria-label="タップでめくる"
            >
              <div className="detail__flip-inner">
                <div className="detail__flip-face detail__flip-face--front">
                  <img src={postcard.image_url} alt="表面" />
                </div>
                <div className="detail__flip-face detail__flip-face--back">
                  <img src={postcard.back_image_url} alt="裏面" />
                </div>
              </div>
            </div>
          ) : (
            <div className="detail__photo-frame" style={frameStyle}>
              <img src={postcard.image_url} alt="表面" />
            </div>
          )}

          {hasBack && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setFlipped((f) => !f)}>
              🔄 {flipped ? '表面を見る' : '裏面を見る'}
            </button>
          )}

          <div className="detail__info">
            {postcard.group_name && (
              <p className="detail__group detail__chip" onClick={filter(postcard.group_name)}>
                {postcard.group_name}
              </p>
            )}
            <p className="detail__idol detail__chip" onClick={filter(postcard.idol_name)}>
              {postcard.idol_name} {postcard.owned ? '💗' : '🤍'}
            </p>
            {postcard.name && <p className="detail__name">{postcard.name}</p>}
            {postcard.album_name && (
              <p className="detail__album detail__chip" onClick={filter(postcard.album_name)}>
                {SOURCE_TYPE_LABELS[postcard.source_type] || '💿'} {postcard.album_name}
              </p>
            )}
            {releaseLabel && <p className="detail__date">{releaseLabel}</p>}
            {postcard.tags?.length > 0 && (
              <div className="detail__tags">
                {postcard.tags.map((tag) => (
                  <span key={tag} className="detail__tag" onClick={filter(tag)}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="btn btn--secondary btn--block" onClick={onEdit}>
            ✏️ 編集する
          </button>
        </div>
      </div>
    </div>
  )
}
