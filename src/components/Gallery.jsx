import PostcardCard from './PostcardCard'

export default function Gallery({ postcards, onUpdated, onSelect, onFilter }) {
  if (postcards.length === 0) {
    return (
      <div className="empty-state">
        <p>まだポストカードがないよ。右上の「＋追加」からはじめよう！</p>
      </div>
    )
  }

  return (
    <div className="gallery">
      {postcards.map((p) => (
        <PostcardCard key={p.id} postcard={p} onUpdated={onUpdated} onSelect={onSelect} onFilter={onFilter} />
      ))}
    </div>
  )
}
