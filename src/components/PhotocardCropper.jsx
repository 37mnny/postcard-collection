import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/image'

const SCALE = 10 // mm -> output px

export default function PhotocardCropper({ sourceCanvas, ratioW = 55, ratioH = 85, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const [rotation, setRotation] = useState(0) // 0 | 90 | 180 | 270
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const outputW = ratioW * SCALE
  const outputH = ratioH * SCALE

  const rotatedDims = useCallback(() => {
    const swap = rotation % 180 !== 0
    return swap ? { w: sourceCanvas.height, h: sourceCanvas.width } : { w: sourceCanvas.width, h: sourceCanvas.height }
  }, [sourceCanvas, rotation])

  const fitScale = useCallback(() => {
    const { w, h } = rotatedDims()
    return Math.max(outputW / w, outputH / h)
  }, [rotatedDims, outputW, outputH])

  const clampOffset = useCallback(
    (off, scale) => {
      const { w, h } = rotatedDims()
      const maxX = Math.max(0, (w * scale - outputW) / 2)
      const maxY = Math.max(0, (h * scale - outputH) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, off.x)),
        y: Math.min(maxY, Math.max(-maxY, off.y)),
      }
    },
    [rotatedDims, outputW, outputH],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const scale = fitScale() * zoom
    ctx.clearRect(0, 0, outputW, outputH)
    ctx.save()
    ctx.translate(outputW / 2 + offset.x, outputH / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2)
    ctx.restore()
  }, [fitScale, zoom, offset, rotation, sourceCanvas, outputW, outputH])

  useEffect(() => {
    draw()
  }, [draw])

  // Re-fit whenever the target ratio changes (e.g. user switches 55x85 <-> 63x88).
  useEffect(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioW, ratioH])

  const rotate = (dir) => {
    setRotation((r) => (r + dir + 360) % 360)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleZoom = (e) => {
    const nextZoom = Number(e.target.value)
    setZoom(nextZoom)
    setOffset((o) => clampOffset(o, fitScale() * nextZoom))
  }

  const toCanvasPoint = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * outputW,
      y: ((clientY - rect.top) / rect.height) * outputH,
    }
  }

  const handlePointerDown = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    const p = toCanvasPoint(e.clientX, e.clientY)
    dragRef.current = { startX: p.x, startY: p.y, offset }
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    const p = toCanvasPoint(e.clientX, e.clientY)
    const next = {
      x: dragRef.current.offset.x + (p.x - dragRef.current.startX),
      y: dragRef.current.offset.y + (p.y - dragRef.current.startY),
    }
    setOffset(clampOffset(next, fitScale() * zoom))
  }

  const handlePointerUp = () => {
    dragRef.current = null
  }

  const handleConfirm = async () => {
    const blob = await canvasToBlob(canvasRef.current)
    onConfirm(blob, canvasRef.current.toDataURL('image/jpeg', 0.92))
  }

  return (
    <div className="photocard-cropper">
      <p className="scan-flow__hint">ドラッグで位置調整、スライダーで拡大できるよ</p>
      <div className="photocard-cropper__frame" style={{ aspectRatio: `${ratioW} / ${ratioH}` }}>
        <canvas
          ref={canvasRef}
          width={outputW}
          height={outputH}
          className="photocard-cropper__canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <input
        type="range"
        min="1"
        max="3"
        step="0.01"
        value={zoom}
        onChange={handleZoom}
        className="photocard-cropper__zoom"
        aria-label="拡大"
      />
      <div className="scan-flow__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => rotate(-90)}>
          ↺ 左回転
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => rotate(90)}>
          ↻ 右回転
        </button>
      </div>
      <div className="scan-flow__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          やめる
        </button>
        <button type="button" className="btn btn--primary" onClick={handleConfirm}>
          この写真を使う
        </button>
      </div>
    </div>
  )
}
