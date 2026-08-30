import { useCallback, useState } from 'react'
import CornerPicker from './CornerPicker'
import { loadImageOntoCanvas, canvasToImageData, imageDataToCanvas, canvasToBlob } from '../lib/image'
import { warpPerspective, estimateOutputSize } from '../lib/perspective'

const DEFAULT_CORNERS = [
  { x: 0.12, y: 0.12 },
  { x: 0.88, y: 0.12 },
  { x: 0.88, y: 0.88 },
  { x: 0.12, y: 0.88 },
]

export default function ScanFlow({ onComplete, onCancel }) {
  const [step, setStep] = useState('pick') // pick | adjust | preview
  const [sourceCanvas, setSourceCanvas] = useState(null)
  const [sourceImageSrc, setSourceImageSrc] = useState(null)
  const [corners, setCorners] = useState(DEFAULT_CORNERS)
  const [resultDataUrl, setResultDataUrl] = useState(null)
  const [resultCanvas, setResultCanvas] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const canvas = await loadImageOntoCanvas(file)
      setSourceCanvas(canvas)
      setSourceImageSrc(canvas.toDataURL('image/jpeg', 0.9))
      setCorners(DEFAULT_CORNERS)
      setStep('adjust')
    } finally {
      setBusy(false)
    }
  }, [])

  const handleCorrect = useCallback(() => {
    if (!sourceCanvas) return
    setBusy(true)
    // Let the "補正中…" state paint before the synchronous, CPU-heavy warp runs.
    requestAnimationFrame(() => {
      const srcImageData = canvasToImageData(sourceCanvas)
      const pixelCorners = corners.map((c) => ({
        x: c.x * sourceCanvas.width,
        y: c.y * sourceCanvas.height,
      }))
      const { width, height } = estimateOutputSize(pixelCorners)
      const warped = warpPerspective(srcImageData, pixelCorners, width, height)
      const canvas = imageDataToCanvas(warped)
      setResultCanvas(canvas)
      setResultDataUrl(canvas.toDataURL('image/jpeg', 0.9))
      setStep('preview')
      setBusy(false)
    })
  }, [sourceCanvas, corners])

  const handleUse = useCallback(async () => {
    if (!resultCanvas) return
    const blob = await canvasToBlob(resultCanvas)
    onComplete(blob, resultDataUrl)
  }, [resultCanvas, resultDataUrl, onComplete])

  return (
    <div className="scan-flow">
      {step === 'pick' && (
        <div className="scan-flow__pick">
          <p className="scan-flow__hint">
            ポストカードをまっすぐ撮影してね📷 あとで角を微調整して台形補正するよ
          </p>
          <label className="btn btn--primary">
            写真を撮る/選ぶ
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            やめる
          </button>
        </div>
      )}

      {step === 'adjust' && sourceImageSrc && (
        <div className="scan-flow__adjust">
          <p className="scan-flow__hint">はがきの4すみに丸を合わせてね</p>
          <CornerPicker imageSrc={sourceImageSrc} corners={corners} onChange={setCorners} />
          <div className="scan-flow__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('pick')}>
              撮り直す
            </button>
            <button type="button" className="btn btn--primary" onClick={handleCorrect} disabled={busy}>
              {busy ? '補正中…' : '✨ 台形補正する'}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && resultDataUrl && (
        <div className="scan-flow__preview">
          <img src={resultDataUrl} alt="補正結果" className="scan-flow__result-image" />
          <div className="scan-flow__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('adjust')}>
              やり直す
            </button>
            <button type="button" className="btn btn--primary" onClick={handleUse}>
              この写真を使う
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
