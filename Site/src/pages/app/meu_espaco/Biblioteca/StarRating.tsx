import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (v: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="animes-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" className={`animes-star ${star <= value ? 'filled' : ''}`} onClick={() => onChange(star === value ? 0 : star)}>
          <Star size={18} fill={star <= value ? '#fbbf24' : 'none'} />
        </button>
      ))}
    </div>
  )
}
