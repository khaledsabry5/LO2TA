import { money } from '../lib/format'

/**
 * Pricing block.
 *  - No discount: single bold price.
 *  - Active discount: official price struck-through, and DIRECTLY BELOW it a
 *    #ef233c rectangle containing the discount percentage + the final price.
 */
export default function PriceTag({ product, size = 'sm' }) {
  const big = size === 'lg'

  if (!product.has_discount) {
    return <p className={`font-extrabold text-ink ${big ? 'text-2xl' : 'text-base'}`}>{money(product.price)}</p>
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className={`font-medium text-ink-muted line-through decoration-sale/70 ${big ? 'text-base' : 'text-xs'}`}>
        {money(product.price)}
      </span>
      <div
        className={`inline-flex items-center overflow-hidden rounded-lg bg-sale text-white shadow-sm shadow-sale/30 ${
          big ? 'text-base' : 'text-[0.72rem] sm:text-xs'
        }`}
        aria-label={`خصم ${product.discount_percent}% السعر بعد الخصم ${money(product.final_price)}`}
      >
        <span className={`bg-black/15 font-extrabold ${big ? 'px-3 py-2' : 'px-2 py-1'}`}>
          خصم {product.discount_percent}%
        </span>
        <span className={`font-extrabold ${big ? 'px-3 py-2 text-lg' : 'px-2 py-1'}`}>{money(product.final_price)}</span>
      </div>
    </div>
  )
}
