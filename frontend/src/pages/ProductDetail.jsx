import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Truck } from 'lucide-react'
import PriceTag from '../components/PriceTag'
import { PageLoader, EmptyState } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_LABELS, CATEGORY_SINGULAR, GENDER_LABELS } from '../lib/format'
import { useCart } from '../context/CartContext'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  // Product variant states
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)

  useEffect(() => {
    let mounted = true
    setProduct(null)
    setError('')
    setActive(0)
    setSelectedSize(null)
    setSelectedColor(null)

    async function fetchProduct() {
      try {
        const p = await api.product(id)
        if (mounted && p) {
          setProduct(p)
          document.title = `${p.name} | لقطة للإكسسوارات`
        }
      } catch (e) {
        if (mounted) {
          setError(e?.message || 'تعذر تحميل بيانات المنتج')
        }
      }
    }

    fetchProduct()
    return () => {
      mounted = false
    }
  }, [id])

  if (error)
    return (
      <div className="container-x py-10">
        <EmptyState icon={ShoppingBag} title="المنتج غير موجود" text={error} />
      </div>
    )
  if (!product) return <PageLoader />

  const media =
    Array.isArray(product?.media) && product.media.length
      ? product.media
      : [{ id: 0, url: '', media_type: 'image' }]
  const current = media[active]

  // Variant rules
  const isShoes = product.category === 'shoes'
  const isBags = product.category === 'bags'
  const sizes = Array.isArray(product.sizes) ? product.sizes : []
  const colors = Array.isArray(product.colors) ? product.colors : []

  const hasSizes = isShoes && sizes.length > 0
  const hasColors = (isShoes || isBags) && colors.length > 0

  const sizeMissing = hasSizes && !selectedSize
  const colorMissing = hasColors && !selectedColor
  const canAddToCart = product.in_stock && !sizeMissing && !colorMissing

  const handleAdd = (buyNow) => {
    if (!canAddToCart) return
    add(product, qty, { size: selectedSize, color: selectedColor })
    if (buyNow) return navigate('/cart')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="container-x py-4 sm:py-10">
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted">
        <Link to="/" className="hover:text-ink">
          الرئيسية
        </Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <Link to={`/shop?category=${product.category}`} className="hover:text-ink">
          {CATEGORY_LABELS[product.category]}
        </Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <span className="line-clamp-1 text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        {/* Media Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-cream-100">
            {current.media_type === 'video' ? (
              <video src={current.url} controls playsInline className="h-full w-full object-cover" />
            ) : current.url ? (
              <img
                src={current.url}
                alt={product.name}
                className="h-full w-full object-cover animate-fade-up"
                key={current.url}
              />
            ) : null}
            {product.has_discount && (
              <span className="absolute end-4 top-4 rounded-full bg-sale px-3 py-1 text-sm font-extrabold text-white">
                -{product.discount_percent}%
              </span>
            )}
          </div>
          {media.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActive(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                    i === active ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {m.media_type === 'video' ? (
                    <video src={m.url} muted className="h-full w-full object-cover" />
                  ) : (
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Variant Selectors */}
        <div className="flex flex-col">
          <div className="flex gap-2">
            <span className="chip bg-cream">{CATEGORY_SINGULAR[product.category]}</span>
            <span className="chip bg-cream-100">{GENDER_LABELS[product.gender]}</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-4">
            <PriceTag product={product} size="lg" />
          </div>
          {product.description && <p className="mt-5 leading-8 text-ink/80">{product.description}</p>}

          {/* 1. Shoe Sizes Selector (Required for Shoes) */}
          {hasSizes && (
            <div className="mt-6 rounded-2xl border border-black/10 bg-cream-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-ink">
                  اختر المقاس (مطلوب):
                  {selectedSize && (
                    <span className="ms-2 rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-white">
                      مقاس {selectedSize}
                    </span>
                  )}
                </span>
                {sizeMissing && (
                  <span className="text-xs font-bold text-sale">يرجى تحديد المقاس</span>
                )}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {sizes.map((s) => {
                  const outOfStock = s.stock <= 0
                  const isSelected = selectedSize === s.size
                  return (
                    <button
                      key={s.size}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => setSelectedSize(s.size)}
                      className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-2 border text-sm font-extrabold transition ${
                        outOfStock
                          ? 'border-black/5 bg-gray-100 text-ink-muted opacity-40 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-ink bg-ink text-white ring-2 ring-ink shadow-sm'
                          : 'border-black/15 bg-white text-ink hover:bg-cream-100 hover:border-ink'
                      }`}
                    >
                      <span>{s.size}</span>
                      {!outOfStock && s.stock <= 3 && (
                        <span className="text-[0.62rem] font-bold text-sale">متبقي {s.stock}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Colors Selector (Required for Shoes & Bags) */}
          {hasColors && (
            <div className="mt-4 rounded-2xl border border-black/10 bg-cream-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-ink">
                  اختر اللون (مطلوب):
                  {selectedColor && (
                    <span className="ms-2 rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-white">
                      {selectedColor}
                    </span>
                  )}
                </span>
                {colorMissing && (
                  <span className="text-xs font-bold text-sale">يرجى تحديد اللون</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => {
                  const isSelected = selectedColor === c.name
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${
                        isSelected
                          ? 'border-ink bg-ink text-white ring-2 ring-ink shadow-sm'
                          : 'border-black/15 bg-white text-ink hover:bg-cream-100 hover:border-ink'
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full border border-black/20 bg-cream" />
                      <span>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-bold">الكمية</span>
            <div className="flex items-center rounded-xl ring-1 ring-black/10">
              <button
                onClick={() => setQty((q) => Math.min(q + 1, 50))}
                className="grid h-11 w-11 place-items-center hover:bg-cream-100"
                aria-label="زيادة"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.max(q - 1, 1))}
                className="grid h-11 w-11 place-items-center hover:bg-cream-100"
                aria-label="تقليل"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <span className={`text-sm font-bold ${product.in_stock ? 'text-emerald-600' : 'text-sale'}`}>
              {product.in_stock ? 'متوفر' : 'نفدت الكمية'}
            </span>
          </div>

          {/* Validation helper messages if buttons are disabled */}
          {(sizeMissing || colorMissing) && (
            <div className="mt-3 text-xs font-bold text-sale">
              {sizeMissing && colorMissing
                ? '⚠️ يرجى تحديد المقاس واللون المطلوبين لتفعيل زر الإضافة إلى السلة'
                : sizeMissing
                ? '⚠️ يرجى تحديد المقاس المطلوب لتفعيل زر الإضافة إلى السلة'
                : '⚠️ يرجى تحديد اللون المطلوب لتفعيل زر الإضافة إلى السلة'}
            </div>
          )}

          {/* Sticky action bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-black/5 bg-white/95 p-3 pb-safe backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
            <button
              id="add-to-cart"
              disabled={!canAddToCart}
              onClick={() => handleAdd(false)}
              className={`flex-1 transition ${
                !canAddToCart
                  ? 'btn bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                  : added
                  ? 'btn bg-azure text-white'
                  : 'btn-cream'
              }`}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> تمت الإضافة
                </>
              ) : (
                'أضف إلى السلة'
              )}
            </button>
            <button
              id="buy-now"
              disabled={!canAddToCart}
              onClick={() => handleAdd(true)}
              className={`flex-1 transition ${
                !canAddToCart
                  ? 'btn bg-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                  : 'btn-dark'
              }`}
            >
              اشترِ الآن
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm ring-1 ring-cream">
            <Truck className="h-5 w-5 shrink-0" />
            <span>توصيل سريع لجميع محافظات مصر · الدفع عند الاستلام (ج.م)</span>
          </div>
          <div className="h-20 lg:hidden" />
        </div>
      </div>
    </div>
  )
}
