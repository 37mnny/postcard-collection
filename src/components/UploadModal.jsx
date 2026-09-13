import { useCallback, useMemo, useState } from 'react'
import ScanFlow from './ScanFlow'
import PhotocardCropper from './PhotocardCropper'
import Combobox from './Combobox'
import { loadImageOntoCanvas } from '../lib/image'
import { supabase, POSTCARD_TABLE } from '../supabase'
import { uploadPostcardImage } from '../lib/cloudinary'

const EMPTY_FORM = {
  kind: null, // must choose first: 'postcard' | 'photocard'
  rounded: false,
  photocardSize: '55x85', // '55x85' | '63x88'
  groupName: '',
  idolName: '',
  name: '',
  sourceType: 'album', // 'album' | 'book' | 'other'
  albumName: '',
  tags: '',
  releaseDate: '',
  owned: true,
}

const PHOTOCARD_SIZES = {
  '55x85': { w: 55, h: 85, label: '55×85' },
  '63x88': { w: 63, h: 88, label: '63×88(トレカ)' },
}

const SOURCE_TYPES = {
  album: { label: 'アルバム', fieldLabel: 'アルバム名', placeholder: '例: 1st Album ○○' },
  book: { label: '雑誌・書籍', fieldLabel: '書籍名', placeholder: '例: ○○ 2026年3月号' },
  other: { label: 'その他', fieldLabel: '特典・その他の情報源', placeholder: '例: 会場限定特典' },
}

function formFromPostcard(postcard) {
  return {
    kind: postcard.kind,
    rounded: postcard.rounded,
    photocardSize: postcard.photocard_size || '55x85',
    groupName: postcard.group_name || '',
    idolName: postcard.idol_name || '',
    name: postcard.name || '',
    sourceType: postcard.source_type || 'album',
    albumName: postcard.album_name || '',
    tags: (postcard.tags || []).join(', '),
    releaseDate: postcard.release_date || '',
    owned: postcard.owned,
  }
}

function slotsFromPostcard(postcard) {
  return {
    front: { blob: null, previewSrc: postcard.image_url, path: postcard.image_path, url: postcard.image_url },
    back: postcard.back_image_url
      ? { blob: null, previewSrc: postcard.back_image_url, path: postcard.back_image_path, url: postcard.back_image_url }
      : null,
  }
}

function parseTags(raw) {
  return [...new Set(raw.split(/[,、\s]+/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean))]
}

export default function UploadModal({ postcard = null, onClose, onSaved, idolNames = [], groupNames = [] }) {
  const isEditing = Boolean(postcard)

  const [slots, setSlots] = useState(() => (isEditing ? slotsFromPostcard(postcard) : { front: null, back: null }))
  const [capture, setCapture] = useState(() => (isEditing ? null : { side: 'front', mode: null })) // null while not capturing
  const [cropSource, setCropSource] = useState(null) // { side, canvas } | null
  const [form, setForm] = useState(() => (isEditing ? formFromPostcard(postcard) : EMPTY_FORM))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const setSlot = useCallback((side, value) => {
    setSlots((s) => ({ ...s, [side]: value }))
  }, [])

  const startCapture = (side) => setCapture({ side, mode: null })
  const cancelCapture = () => setCapture(null)

  const startPerspectiveCorrect = useCallback(async (side) => {
    const slot = slots[side]
    if (!slot) return
    const source = slot.blob ?? (await fetch(slot.url).then((r) => r.blob()))
    setCapture({ side, mode: 'scan', initialFile: source, postHoc: true })
  }, [slots])

  const openCropper = useCallback(async (side, source) => {
    const canvas = await loadImageOntoCanvas(source)
    setCropSource({ side, canvas })
    setCapture(null)
  }, [])

  const handleFileSelected = useCallback(
    async (side, file) => {
      if (!file) return
      if (form.kind === 'photocard') {
        await openCropper(side, file)
      } else {
        setSlot(side, { blob: file, previewSrc: URL.createObjectURL(file) })
        setCapture(null)
      }
    },
    [form.kind, setSlot, openCropper],
  )

  const handleScanComplete = useCallback(
    async (side, blob, dataUrl) => {
      if (form.kind === 'photocard') {
        await openCropper(side, blob)
      } else {
        setSlot(side, { blob, previewSrc: dataUrl })
        setCapture(null)
      }
    },
    [form.kind, setSlot, openCropper],
  )

  const handleCropConfirm = useCallback(
    (blob, dataUrl) => {
      if (!cropSource) return
      setSlot(cropSource.side, { blob, previewSrc: dataUrl })
      setCropSource(null)
    },
    [cropSource, setSlot],
  )

  const handleCropCancel = () => setCropSource(null)

  const updateField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const idolNameOptions = useMemo(() => idolNames.filter(Boolean), [idolNames])
  const groupNameOptions = useMemo(() => groupNames.filter(Boolean), [groupNames])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!slots.front) return
    if (!form.idolName.trim()) {
      setError('アイドル名は入力してね')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const front = slots.front.blob ? await uploadPostcardImage(slots.front.blob) : { publicId: slots.front.path, url: slots.front.url }
      const back = slots.back
        ? slots.back.blob
          ? await uploadPostcardImage(slots.back.blob)
          : { publicId: slots.back.path, url: slots.back.url }
        : null

      const payload = {
        group_name: form.groupName.trim() || null,
        idol_name: form.idolName.trim(),
        name: form.name.trim() || null,
        source_type: form.sourceType,
        album_name: form.albumName.trim() || null,
        tags: parseTags(form.tags),
        release_date: form.releaseDate || null,
        owned: form.owned,
        kind: form.kind,
        rounded: form.kind === 'photocard' ? form.rounded : false,
        photocard_size: form.kind === 'photocard' ? form.photocardSize : '55x85',
        image_path: front.publicId,
        image_url: front.url,
        back_image_path: back?.publicId ?? null,
        back_image_url: back?.url ?? null,
      }

      const query = isEditing
        ? supabase.from(POSTCARD_TABLE).update(payload).eq('id', postcard.id)
        : supabase.from(POSTCARD_TABLE).insert(payload)

      const { data, error: dbError } = await query.select().single()
      if (dbError) throw dbError

      onSaved(data)
    } catch (err) {
      setError(err.message ?? (isEditing ? '保存に失敗しちゃった…もう一度試してね' : '投稿に失敗しちゃった…もう一度試してね'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <h2 className="modal__title">{isEditing ? 'ポストカードを編集' : 'ポストカードを追加'}</h2>

        {!form.kind && (
          <div className="upload-choice">
            <p className="scan-flow__hint">追加するカードの種類を選んでね</p>
            <button type="button" className="btn btn--primary" onClick={() => setForm((f) => ({ ...f, kind: 'postcard' }))}>
              🖼️ ポストカード
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setForm((f) => ({ ...f, kind: 'photocard' }))}
            >
              🎴 フォトカード
            </button>
          </div>
        )}

        {form.kind && cropSource && (
          <PhotocardCropper
            sourceCanvas={cropSource.canvas}
            ratioW={PHOTOCARD_SIZES[form.photocardSize].w}
            ratioH={PHOTOCARD_SIZES[form.photocardSize].h}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}

        {form.kind && !cropSource && capture && capture.mode !== 'scan' && (
          <div className="upload-choice">
            {capture.side === 'back' && <p className="scan-flow__hint">裏面の写真を選んでね</p>}
            {form.kind === 'photocard' && (
              <div className="kind-toggle">
                {Object.entries(PHOTOCARD_SIZES).map(([key, size]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn--small ${form.photocardSize === key ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setForm((f) => ({ ...f, photocardSize: key }))}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            )}
            <label className="btn btn--primary">
              📷 写真を選んでアップロード
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFileSelected(capture.side, e.target.files?.[0])}
              />
            </label>
            <button type="button" className="btn btn--secondary" onClick={() => setCapture((c) => ({ ...c, mode: 'scan' }))}>
              📐 スキャンして台形補正する
            </button>
            {slots.front && (
              <button type="button" className="btn btn--ghost btn--small" onClick={cancelCapture}>
                やめる
              </button>
            )}
            {!slots.front && !isEditing && (
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setForm((f) => ({ ...f, kind: null }))}>
                種類を変える
              </button>
            )}
          </div>
        )}

        {form.kind && !cropSource && capture && capture.mode === 'scan' && (
          <ScanFlow
            initialFile={capture.initialFile ?? null}
            onComplete={(blob, dataUrl) => handleScanComplete(capture.side, blob, dataUrl)}
            onCancel={() => setCapture(capture.postHoc ? null : (c) => ({ ...c, mode: null }))}
          />
        )}

        {form.kind && !cropSource && !capture && slots.front && (
          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="upload-slots">
              <div className="upload-slot">
                <span className="upload-slot__label">表面</span>
                <img src={slots.front.previewSrc} alt="表面プレビュー" className="upload-form__preview" />
                <div className="upload-slot__actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => startCapture('front')}>
                    写真をやり直す
                  </button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => startPerspectiveCorrect('front')}>
                    📐 台形補正する
                  </button>
                </div>
              </div>

              <div className="upload-slot">
                <span className="upload-slot__label">裏面(任意)</span>
                {slots.back ? (
                  <>
                    <img src={slots.back.previewSrc} alt="裏面プレビュー" className="upload-form__preview" />
                    <div className="upload-slot__actions">
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => startCapture('back')}>
                        やり直す
                      </button>
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => startPerspectiveCorrect('back')}>
                        📐 台形補正
                      </button>
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => setSlot('back', null)}>
                        削除
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => startCapture('back')}>
                    ＋裏面を追加
                  </button>
                )}
              </div>
            </div>

            {form.kind === 'photocard' && (
              <label className="field field--checkbox">
                <input
                  type="checkbox"
                  checked={form.rounded}
                  onChange={(e) => setForm((f) => ({ ...f, rounded: e.target.checked }))}
                />
                <span>角丸にする</span>
              </label>
            )}

            <label className="field">
              <span>グループ名</span>
              <Combobox
                value={form.groupName}
                onChange={(v) => setForm((f) => ({ ...f, groupName: v }))}
                options={groupNameOptions}
                placeholder="例: ○○○○"
              />
            </label>
            <label className="field">
              <span>アイドル名(メンバー) *</span>
              <Combobox
                value={form.idolName}
                onChange={(v) => setForm((f) => ({ ...f, idolName: v }))}
                options={idolNameOptions}
                placeholder="例: ○○ ○○"
                required
              />
            </label>
            <label className="field">
              <span>名前(ポストカードのタイトル)</span>
              <input value={form.name} onChange={updateField('name')} placeholder="例: 制服ver.A" />
            </label>

            <div className="field">
              <span>収録元の種類</span>
              <div className="kind-toggle">
                {Object.entries(SOURCE_TYPES).map(([key, s]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn--small ${form.sourceType === key ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setForm((f) => ({ ...f, sourceType: key }))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>{SOURCE_TYPES[form.sourceType].fieldLabel}</span>
              <input
                value={form.albumName}
                onChange={updateField('albumName')}
                placeholder={SOURCE_TYPES[form.sourceType].placeholder}
              />
            </label>

            <label className="field">
              <span>ハッシュタグ(スペース区切り)</span>
              <input value={form.tags} onChange={updateField('tags')} placeholder="例: お気に入り 会場限定" />
            </label>

            <label className="field">
              <span>リリース日</span>
              <input type="date" value={form.releaseDate} onChange={updateField('releaseDate')} />
            </label>
            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={form.owned}
                onChange={(e) => setForm((f) => ({ ...f, owned: e.target.checked }))}
              />
              <span>持ってる 💗</span>
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? (isEditing ? '保存中…' : '投稿中…') : isEditing ? '保存する' : 'この子を追加する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
