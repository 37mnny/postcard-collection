import { useState } from 'react'
import { supabase, POSTCARD_TABLE } from '../supabase'

export default function PostcardCard({ postcard, onUpdated, onSelect, onFilter }) {
  const [pending, setPending] = useState(false)

  const toggleOwned = async (e) => {
    e.stopPropagation()
    if (pending) return
    setPending(true)
    const nextOwned = !postcard.owned
    onUpdated({ ...postcard, owned: nextOwned })
    const { error } = await supabase.from(POSTCARD_TABLE).update({ owned: nextOwned }).eq('id', postcard.id)
    if (error) onUpdated(postcard)
    setPending(false)
  }

  const releaseLabel = postcard.release_date
    ? new Date(postcard.release_date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const isPhotocard = postcard.kind === 'photocard'
  const title = postcard.name || postcard.album_name || postcard.idol_name
  const showIdol = postcard.idol_name && postcard.idol_name !== title
  const showAlbum = postcard.album_name && postcard.album_name !== title

  const frameClass = [
    'postcard-card__photo-frame',
    isPhotocard ? 'postcard-card__photo-frame--photocard' : 'postcard-card__photo-frame--postcard',
    isPhotocard && postcard.rounded ? 'is-rounded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const [ratioW, ratioH] = (postcard.photocard_size || '55x85').split('x').map(Number)
  const frameStyle = isPhotocard ? { aspectRatio: `${ratioW} / ${ratioH}` } : undefined

  const handleChipClick = (value) => (e) => {
    e.stopPropagation()
    onFilter(value)
  }

  return (
    <div className="postcard-card">
      <button
        type="button"
        className={`postcard-card__heart${postcard.owned ? ' is-owned' : ''}`}
        onClick={toggleOwned}
        disabled={pending}
        aria-pressed={postcard.owned}
        aria-label={postcard.owned ? '持っている(タップで解除)' : '持っていない(タップで持っている登録)'}
      >
        {postcard.owned ? '💗' : '🤍'}
      </button>
      <button type="button" className="postcard-card__body" onClick={() => onSelect(postcard)}>
        <div className={frameClass} style={frameStyle}>
          <img src={postcard.image_url} alt={title} loading="lazy" />
        </div>
        <div className="postcard-card__caption">
          <p className="postcard-card__title">{title}</p>
          {showIdol && (
            <p className="postcard-card__idol postcard-card__chip" onClick={handleChipClick(postcard.idol_name)}>
              {postcard.idol_name}
            </p>
          )}
          {showAlbum && (
            <p className="postcard-card__album postcard-card__chip" onClick={handleChipClick(postcard.album_name)}>
              💿 {postcard.album_name}
            </p>
          )}
          {releaseLabel && <p className="postcard-card__date">{releaseLabel}</p>}
        </div>
      </button>
    </div>
  )
}
