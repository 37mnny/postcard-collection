import { useState } from 'react'
import { supabase, POSTCARD_TABLE } from '../supabase'

export default function PostcardCard({ postcard, onUpdated, onSelect }) {
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
        <div className="postcard-card__photo-frame">
          <img src={postcard.image_url} alt={postcard.name || postcard.idol_name} loading="lazy" />
        </div>
        <div className="postcard-card__caption">
          <p className="postcard-card__idol">{postcard.idol_name}</p>
          {postcard.name && <p className="postcard-card__name">{postcard.name}</p>}
          {postcard.album_name && <p className="postcard-card__album">💿 {postcard.album_name}</p>}
          {releaseLabel && <p className="postcard-card__date">{releaseLabel}</p>}
        </div>
      </button>
    </div>
  )
}
