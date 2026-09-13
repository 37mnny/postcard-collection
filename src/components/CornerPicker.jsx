import { useCallback, useRef, useState } from 'react'

const HANDLE_LABELS = ['左上', '右上', '右下', '左下']
const LOUPE_SIZE = 110
const LOUPE_ZOOM = 3
const LOUPE_GAP = 16 // ハンドルとルーペの間の隙間

export default function CornerPicker({ imageSrc, corners, onChange }) {
  const containerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)

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
    setActiveIndex(index)
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(index, e.clientX, e.clientY)
  }

  const handlePointerMove = (e) => {
    if (activeIndex === null) return
    updateFromPointer(activeIndex, e.clientX, e.clientY)
  }

  const handlePointerUp = () => {
    setActiveIndex(null)
  }

  const polygonPoints = corners.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')

  const active = activeIndex !== null ? corners[activeIndex] : null
  const rect = containerRef.current?.getBoundingClientRect()
  // 上に出すとはみ出す(角が画面上端に近い)ときは下に出す
  const showBelow = active ? active.y * 100 < 22 : false

  return (
    <div className="corner-picker" ref={containerRef}>
      <div className="corner-picker__frame">
        <img src={imageSrc} alt="スキャンした写真" className="corner-picker__image" draggable={false} />
        <svg className="corner-picker__overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={polygonPoints} className="corner-picker__quad" />
        </svg>
      </div>
      {corners.map((c, i) => (
        <button
          key={i}
          type="button"
          className="corner-picker__handle"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
          onPointerDown={handlePointerDown(i)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={`${HANDLE_LABELS[i]}の角を調整`}
        />
      ))}
      {active && rect && (
        <div
          className={`corner-picker__loupe${showBelow ? ' corner-picker__loupe--below' : ''}`}
          style={{
            left: `${active.x * 100}%`,
            top: `${active.y * 100}%`,
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: `${rect.width * LOUPE_ZOOM}px ${rect.height * LOUPE_ZOOM}px`,
            backgroundPosition:
              `${-(active.x * rect.width * LOUPE_ZOOM - LOUPE_SIZE / 2)}px ` +
              `${-(active.y * rect.height * LOUPE_ZOOM - LOUPE_SIZE / 2)}px`,
          }}
        >
          <div className="corner-picker__loupe-cross" />
        </div>
      )}
    </div>
  )
}
