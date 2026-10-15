import { money } from '../lib/format'

/**
 * Pricing block:
 *  - No discount: single bold price.
 *  - Active discount:
 *    1. Original price displayed above with a gray color and strikethrough.
 *    2. Final price in plain, bold text without any red background.
 *    3. Red discount badge exclusively for the discount percentage text.
 *    4. Final price and red discount badge aligned using flexbox.
 */
export default function PriceTag({ product, size = 'sm' }) {
  const big = size === 'lg'

  if (!product.has_discount) {
    return (
      <p className={`font-extrabold text-gray-900 ${big ? 'text-2xl sm:text-3xl' : 'text-base'}`}>
        {money(product.price)}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Original price (gray color + line-through) */}
      <span className={`font-medium text-gray-400 line-through ${big ? 'text-sm sm:text-base' : 'text-xs'}`}>
        {money(product.price)}
      </span>

      {/* Final price (plain bold text) and red discount badge aligned with flexbox */}
      <div className={`flex items-center ${big ? 'gap-2.5' : 'gap-2'}`}>
        <span className={`font-extrabold text-gray-900 ${big ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'}`}>
          {money(product.final_price)}
        </span>
        <span
          className={`inline-flex items-center rounded bg-red-600 font-bold text-white shadow-xs ${
            big ? 'px-2.5 py-1 text-xs sm:text-sm rounded-md' : 'px-2 py-0.5 text-xs'
          }`}
        >
          خصم {product.discount_percent}%
        </span>
      </div>
    </div>
  )
}
