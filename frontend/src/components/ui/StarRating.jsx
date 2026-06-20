import { useState } from 'react'
export default function StarRating({ value = 0, onChange, readonly = false }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onClick={() => !readonly && onChange?.(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-2xl transition-transform ${!readonly && 'hover:scale-110 cursor-pointer'} ${s <= (hover||value) ? 'text-yellow-400' : 'text-gray-300'}`}
        >★</button>
      ))}
    </div>
  )
}
