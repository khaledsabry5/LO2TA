import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import PriceTag from './PriceTag'
import { CATEGORY_SINGULAR, GENDER_LABELS, firstImage } from '../lib/format'

export default function ProductCard({ product, index = 0 }) {
  const [liked, setLiked] = useState(false)
  const img = firstImage(product)

  return (
    <article className="group relative flex flex-col animate-fade-up">
      <Link
        to={`/product/${product.id}`}
        id={`product-card-${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-cream-100"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted">لا توجد صورة</div>
        )}

        {product.has_discount && (
          <span className="absolute end-2 top-2 rounded-full bg-sale px-2 py-0.5 text-[0.65rem] font-extrabold text-white">
            -{product.discount_percent}%
          </span>
        )}
        {!product.in_stock && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 py-1 text-center text-xs font-bold backdrop-blur">
            نفدت الكمية
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setLiked((v) => !v)
          }}
          aria-label="أضف للمفضلة"
          className="absolute start-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
        >
          <Heart className={`h-4 w-4 transition ${liked ? 'fill-sale text-sale animate-pop' : 'text-ink'}`} />
        </button>
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-[0.7rem] font-medium text-ink-muted">
          {CATEGORY_SINGULAR[product.category]} · {GENDER_LABELS[product.gender]}
        </p>
        <Link
          to={`/product/${product.id}`}
          className="line-clamp-1 text-sm font-bold text-ink hover:underline sm:text-[0.95rem]"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <PriceTag product={product} />
          <Link
            to={`/product/${product.id}`}
            id={`view-details-${product.id}`}
            className="product-card-details-btn"
          >
            التفاصيل
          </Link>
        </div>
      </div>
    </article>
  )
}
