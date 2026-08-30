import { useCallback, useRef } from 'react'

const HANDLE_LABELS = ['左上', '右上', '右下', '左下']

export default function CornerPicker({ imageSrc, corners, onChange }) {
  const containerRef = useRef(null)
  const draggingIndex = useRef(null)

  const clamp01 = (v) => Math.min(1, Math.max(0, v))

  const updateFromPointer = useCallback(
    (index, clientX, clientY) => {
      const rect = containerRef.current.getBoundingClientRect()
      const fx = clamp01((clientX - rect.left) / rect.width)
      const fy = clamp01((clientY - rect.top) / rect.height)
      onChange(corners.map((c, i) => (i === index ? { x: fx, y: fy } : c)))
    },
    [corners, onChange],
  )

  const handlePointerDown = (index) => (e) => {
    e.preventDefault()
    draggingIndex.current = index
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(index, e.clientX, e.clientY)
  }

  const handlePointerMove = (e) => {
    if (draggingIndex.current === null) return
    updateFromPointer(draggingIndex.current, e.clientX, e.clientY)
  }

  const handlePointerUp = () => {
    draggingIndex.current = null
  }

  const polygonPoints = corners.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')

  return (
    <div className="corner-picker" ref={containerRef}>
      <img src={imageSrc} alt="スキャンした写真" className="corner-picker__image" draggable={false} />
      <svg className="corner-picker__overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={polygonPoints} className="corner-picker__quad" />
      </svg>
      {corners.map((c, i) => (
        <button
          key={i}
          type="button"
          className="corner-picker__handle"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
          onPointerDown={handlePointerDown(i)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label={`${HANDLE_LABELS[i]}の角を調整`}
        />
      ))}
    </div>
  )
}
