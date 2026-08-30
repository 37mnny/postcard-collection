import { useCallback, useMemo, useState } from 'react'
import ScanFlow from './ScanFlow'
import { supabase, POSTCARD_TABLE } from '../supabase'
import { uploadPostcardImage } from '../lib/cloudinary'

const EMPTY_FORM = {
  idolName: '',
  name: '',
  albumName: '',
  releaseDate: '',
  owned: true,
}

export default function UploadModal({ onClose, onCreated, idolNames = [] }) {
  const [slots, setSlots] = useState({ front: null, back: null }) // { blob, previewSrc } | null
  const [capture, setCapture] = useState({ side: 'front', mode: null }) // null while not capturing; mode: null | 'scan'
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const setSlot = useCallback((side, value) => {
    setSlots((s) => ({ ...s, [side]: value }))
  }, [])

  const startCapture = (side) => setCapture({ side, mode: null })
  const cancelCapture = () => setCapture(null)

  const handleDirectFile = useCallback(
    (side, file) => {
      if (!file) return
      setSlot(side, { blob: file, previewSrc: URL.createObjectURL(file) })
      setCapture(null)
    },
    [setSlot],
  )

  const handleScanComplete = useCallback(
    (side, blob, dataUrl) => {
      setSlot(side, { blob, previewSrc: dataUrl })
      setCapture(null)
    },
    [setSlot],
  )

  const updateField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const idolNameOptions = useMemo(() => idolNames.filter(Boolean), [idolNames])

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
      const front = await uploadPostcardImage(slots.front.blob)
      const back = slots.back ? await uploadPostcardImage(slots.back.blob) : null

      const { data, error: insertError } = await supabase
        .from(POSTCARD_TABLE)
        .insert({
          idol_name: form.idolName.trim(),
          name: form.name.trim() || null,
          album_name: form.albumName.trim() || null,
          release_date: form.releaseDate || null,
          owned: form.owned,
          image_path: front.publicId,
          image_url: front.url,
          back_image_path: back?.publicId ?? null,
          back_image_url: back?.url ?? null,
        })
        .select()
        .single()
      if (insertError) throw insertError

      onCreated(data)
    } catch (err) {
      setError(err.message ?? '投稿に失敗しちゃった…もう一度試してね')
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
        <h2 className="modal__title">ポストカードを追加</h2>

        {capture && capture.mode !== 'scan' && (
          <div className="upload-choice">
            {capture.side === 'back' && <p className="scan-flow__hint">裏面の写真を選んでね</p>}
            <label className="btn btn--primary">
              📷 写真を選んでアップロード
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleDirectFile(capture.side, e.target.files?.[0])}
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
          </div>
        )}

        {capture && capture.mode === 'scan' && (
          <ScanFlow
            onComplete={(blob, dataUrl) => handleScanComplete(capture.side, blob, dataUrl)}
            onCancel={() => setCapture((c) => ({ ...c, mode: null }))}
          />
        )}

        {!capture && slots.front && (
          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="upload-slots">
              <div className="upload-slot">
                <span className="upload-slot__label">表面</span>
                <img src={slots.front.previewSrc} alt="表面プレビュー" className="upload-form__preview" />
                <button type="button" className="btn btn--ghost btn--small" onClick={() => startCapture('front')}>
                  写真をやり直す
                </button>
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

            <label className="field">
              <span>アイドル名 *</span>
              <input
                list="upload-modal-idol-names"
                value={form.idolName}
                onChange={updateField('idolName')}
                placeholder="例: ○○ ○○"
                required
              />
              <datalist id="upload-modal-idol-names">
                {idolNameOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>名前(ポストカードのタイトル)</span>
              <input value={form.name} onChange={updateField('name')} placeholder="例: 制服ver.A" />
            </label>
            <label className="field">
              <span>アルバム名</span>
              <input value={form.albumName} onChange={updateField('albumName')} placeholder="例: 1st Album ○○" />
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
              {submitting ? '投稿中…' : 'この子を追加する'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
