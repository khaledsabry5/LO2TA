import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import PriceTag from './PriceTag'
import { CATEGORY_SINGULAR, GENDER_LABELS, firstImage } from '../lib/format'

export default function ProductCard({ product, index = 0 }) {
  const [liked, setLiked] = useState(false)
  const img = firstImage(product)

  return (
    <Link
      to={`/product/${product.id}`}
      id={`product-card-${product.id}`}
      className="product-card group"
    >
      {/* Media container */}
      <div className="product-card-media">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-muted text-xs">لا توجد صورة</div>
        )}

        {product.has_discount && (
          <span className="absolute end-2 top-2 rounded-full bg-sale px-2 py-0.5 text-[0.65rem] font-extrabold text-white shadow-sm">
            -{product.discount_percent}%
          </span>
        )}

        {!product.in_stock && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 py-1 text-center text-xs font-bold backdrop-blur">
            نفدت الكمية
          </span>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setLiked((v) => !v)
          }}
          aria-label="أضف للمفضلة"
          className="absolute start-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
        >
          <Heart className={`h-4 w-4 transition ${liked ? 'fill-sale text-sale animate-pop' : 'text-ink'}`} />
        </button>
      </div>

      {/* Info & balanced price container */}
      <div className="product-card-info">
        <p className="product-card-meta">
          {Array.isArray(product.categories) && product.categories.length > 0
            ? product.categories.map((c) => CATEGORY_SINGULAR[c.name] || c.name).join(' · ')
            : (CATEGORY_SINGULAR[product.category] || product.category || '')}
          {product.gender && ` · ${GENDER_LABELS[product.gender] || (product.gender === 'unisex' ? 'للجنسين' : product.gender)}`}
        </p>

        <h3 className="product-card-title">
          {product.name}
        </h3>

        <div className="product-card-pricing">
          <PriceTag product={product} />
        </div>
      </div>
    </Link>
  )
}
