export default function FilterBar({ keyword, onKeyword, sortOrder, onSortOrder, ownedOnly, onOwnedOnly }) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="アイドル名・名前・アルバム名で検索"
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
        />
      </div>
      <label className="filter-bar__toggle">
        <input type="checkbox" checked={ownedOnly} onChange={(e) => onOwnedOnly(e.target.checked)} />
        <span>💗持ってるだけ</span>
      </label>
      <select className="filter-bar__sort" value={sortOrder} onChange={(e) => onSortOrder(e.target.value)}>
        <option value="release_desc">リリース日が新しい順</option>
        <option value="release_asc">リリース日が古い順</option>
        <option value="created_desc">追加した順(新しい)</option>
      </select>
    </div>
  )
}
