import { useEffect, useRef, useState } from 'react'

export default function Combobox({ value, onChange, options, placeholder, required }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  const trimmed = value.trim().toLowerCase()
  const filtered = (trimmed ? options.filter((o) => o.toLowerCase().includes(trimmed) && o !== value) : options).slice(
    0,
    8,
  )

  return (
    <div className="combobox" ref={containerRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="combobox__list">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className="combobox__option"
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
