import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured, POSTCARD_TABLE } from './supabase'
import { isCloudinaryConfigured } from './lib/cloudinary'
import FilterBar from './components/FilterBar'
import Gallery from './components/Gallery'
import UploadModal from './components/UploadModal'
import PostcardDetail from './components/PostcardDetail'
import './App.css'

const isFullyConfigured = isSupabaseConfigured && isCloudinaryConfigured

function App() {
  const [postcards, setPostcards] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [sortOrder, setSortOrder] = useState('release_desc')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedPostcard, setSelectedPostcard] = useState(null)
  const [editingPostcard, setEditingPostcard] = useState(null)

  const fetchPostcards = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from(POSTCARD_TABLE).select('*')
    if (error) setLoadError(error.message)
    else setPostcards(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isFullyConfigured) {
      setLoading(false)
      return
    }
    fetchPostcards()
  }, [fetchPostcards])

  const handleCreated = (row) => {
    setPostcards((prev) => [row, ...prev])
    setShowUpload(false)
  }

  const handleUpdated = (row) => {
    setPostcards((prev) => prev.map((p) => (p.id === row.id ? row : p)))
  }

  const visiblePostcards = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const filtered = postcards.filter((p) => {
      if (ownedOnly && !p.owned) return false
      if (!kw) return true
      const haystack = [p.group_name, p.idol_name, p.name, p.album_name, ...(p.tags || [])]
      return haystack.filter(Boolean).some((v) => v.toLowerCase().includes(kw))
    })

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'created_desc') return new Date(b.created_at) - new Date(a.created_at)
      const da = a.release_date ? new Date(a.release_date).getTime() : null
      const db = b.release_date ? new Date(b.release_date).getTime() : null
      if (da === null && db === null) return 0
      if (da === null) return 1
      if (db === null) return -1
      return sortOrder === 'release_asc' ? da - db : db - da
    })
  }, [postcards, keyword, ownedOnly, sortOrder])

  const idolNames = useMemo(() => {
    const set = new Set(postcards.map((p) => p.idol_name).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [postcards])

  const groupNames = useMemo(() => {
    const set = new Set(postcards.map((p) => p.group_name).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [postcards])

  const handleFilter = useCallback((value) => {
    setKeyword(value)
    setSelectedPostcard(null)
  }, [])

  if (!isFullyConfigured) {
    return (
      <div className="setup-notice">
        <h1>ポストカードのへや 🎀</h1>
        <p>まだ接続情報が設定されていないよ。</p>
        <p>
          プロジェクト直下に <code>.env</code> を作って、次の4つを設定してね(<code>.env.example</code> 参照)。
        </p>
        <pre>
          {
            'VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...\nVITE_CLOUDINARY_CLOUD_NAME=...\nVITE_CLOUDINARY_UPLOAD_PRESET=...'
          }
        </pre>
        <p>
          Supabase 側は <code>supabase/schema.sql</code> を SQL Editor で実行してテーブルを作成、
          Cloudinary 側は unsigned な Upload preset を1つ作成してね(画像はそちらに保存されます)。
        </p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__title">
          <span className="app__title-emoji" aria-hidden="true">
            🎀
          </span>
          <div>
            <h1>ポストカードのへや</h1>
            <p>お気に入りのポストカードをかわいく記録しよう</p>
          </div>
        </div>
        <button type="button" className="btn btn--primary app__add-btn" onClick={() => setShowUpload(true)}>
          ＋追加
        </button>
      </header>

      <FilterBar
        keyword={keyword}
        onKeyword={setKeyword}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        ownedOnly={ownedOnly}
        onOwnedOnly={setOwnedOnly}
      />

      {loading && <p className="app__status">読みこみ中…</p>}
      {loadError && <p className="app__status app__status--error">読み込みエラー: {loadError}</p>}
      {!loading && !loadError && (
        <Gallery postcards={visiblePostcards} onUpdated={handleUpdated} onSelect={setSelectedPostcard} onFilter={handleFilter} />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={handleCreated}
          idolNames={idolNames}
          groupNames={groupNames}
        />
      )}

      {editingPostcard && (
        <UploadModal
          postcard={editingPostcard}
          onClose={() => setEditingPostcard(null)}
          onSaved={(row) => {
            handleUpdated(row)
            setEditingPostcard(null)
          }}
          idolNames={idolNames}
          groupNames={groupNames}
        />
      )}

      {selectedPostcard && (
        <PostcardDetail
          postcard={selectedPostcard}
          onClose={() => setSelectedPostcard(null)}
          onEdit={() => {
            setEditingPostcard(selectedPostcard)
            setSelectedPostcard(null)
          }}
          onFilter={handleFilter}
        />
      )}
    </div>
  )
}

export default App
