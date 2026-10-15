import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, ChevronRight, Minus, Plus, ShoppingBag, Truck, Image as ImageIcon } from 'lucide-react'
import PriceTag from '../components/PriceTag'
import { PageLoader, EmptyState } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_LABELS, CATEGORY_SINGULAR, GENDER_LABELS, getCategoryName, resolveMediaUrl } from '../lib/format'
import { useCart } from '../context/CartContext'
import WhatsAppIcon from '../components/icons/WhatsAppIcon'
import './ProductDetail.css'

const getColorClass = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('أسود') || n.includes('black')) return 'color-swatch-black'
  if (n.includes('بني') || n.includes('brown')) return 'color-swatch-brown'
  if (n.includes('بيج') || n.includes('beige')) return 'color-swatch-beige'
  if (n.includes('أبيض') || n.includes('white')) return 'color-swatch-white'
  if (n.includes('كحلي') || n.includes('أزرق') || n.includes('navy') || n.includes('blue')) return 'color-swatch-navy'
  if (n.includes('أحمر') || n.includes('red')) return 'color-swatch-red'
  if (n.includes('رمادي') || n.includes('رصاصي') || n.includes('gray')) return 'color-swatch-gray'
  return 'color-swatch-default'
}


const defaultShoeSizes = [
  { size: 39, stock: 5 },
  { size: 40, stock: 8 },
  { size: 41, stock: 10 },
  { size: 42, stock: 12 },
  { size: 43, stock: 8 },
  { size: 44, stock: 5 },
]

const defaultColors = [
  { name: 'أسود', code: '#111827' },
  { name: 'بني', code: '#78350f' },
  { name: 'بيج', code: '#d4b996' },
]

function getProductSizes(prod) {
  if (!prod) return []
  const allCatNames = [
    typeof prod.category === 'object' ? (prod.category?.name || '') : String(prod.category || ''),
    ...(Array.isArray(prod.categories) ? prod.categories.map((c) => c.name || '') : []),
  ].map((s) => s.toLowerCase())

  const allCatIds = [
    prod.category_id,
    prod.category?.id,
    ...(Array.isArray(prod.categories) ? prod.categories.map((c) => c.id) : []),
  ].filter(Boolean)

  const isShoes =
    allCatIds.includes(1) ||
    allCatNames.some((name) => name === 'shoes' || name.includes('shoe') || name === 'الأحذية' || name.includes('أحذية'))

  const hasExplicitSizes = Array.isArray(prod.sizes) && prod.sizes.length > 0
  if (hasExplicitSizes) return prod.sizes
  if (isShoes) return defaultShoeSizes
  return []
}

function getProductColors(prod) {
  if (!prod) return []
  const allCatNames = [
    typeof prod.category === 'object' ? (prod.category?.name || '') : String(prod.category || ''),
    ...(Array.isArray(prod.categories) ? prod.categories.map((c) => c.name || '') : []),
  ].map((s) => s.toLowerCase())

  const allCatIds = [
    prod.category_id,
    prod.category?.id,
    ...(Array.isArray(prod.categories) ? prod.categories.map((c) => c.id) : []),
  ].filter(Boolean)

  const isShoes =
    allCatIds.includes(1) ||
    allCatNames.some((name) => name === 'shoes' || name.includes('shoe') || name === 'الأحذية' || name.includes('أحذية'))

  const isBags =
    allCatIds.includes(2) ||
    allCatNames.some((name) => name === 'bags' || name.includes('bag') || name === 'الشنط' || name.includes('شنط'))

  const hasExplicitColors = Array.isArray(prod.colors) && prod.colors.length > 0
  if (hasExplicitColors) return prod.colors
  if (isShoes || isBags) return defaultColors
  return []
}

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
  const [validationAttempted, setValidationAttempted] = useState(false)

  useEffect(() => {
    let mounted = true
    setProduct(null)
    setError('')
    setActive(0)
    setSelectedSize(null)
    setSelectedColor(null)
    setValidationAttempted(false)

    async function fetchProduct() {
      try {
        const p = await api.product(id)
        if (mounted && p) {
          setProduct(p)
          document.title = `${p.name} | متجر YSN`

          // Auto-select size if single option available
          const pSizes = getProductSizes(p)
          const pAvailSizes = pSizes.filter((s) => typeof s.stock !== 'number' || s.stock > 0)
          if (pAvailSizes.length === 1) {
            setSelectedSize(pAvailSizes[0].size)
          }

          // Auto-select color if single option available
          const pColors = getProductColors(p)
          if (pColors.length === 1) {
            const singleColor = typeof pColors[0] === 'string' ? pColors[0] : pColors[0].name
            setSelectedColor(singleColor)
          }
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

  // Derive sizes and colors
  const sizes = product ? getProductSizes(product) : []
  const colors = product ? getProductColors(product) : []

  const availableSizes = sizes.filter((s) => typeof s.stock !== 'number' || s.stock > 0)
  const availableColors = colors

  const needsSize = sizes.length > 0
  const needsColor = colors.length > 0

  const hasSizes = needsSize && sizes.length > 0
  const hasColors = needsColor && colors.length > 0

  const sizeMissing = needsSize && !selectedSize
  const colorMissing = needsColor && !selectedColor
  const inStock = Boolean(product?.in_stock || (typeof product?.stock === 'number' && product?.stock > 0))
  const canAddToCart = inStock && !sizeMissing && !colorMissing

  // 1. Auto-Selection Logic Hook:
  // Automatically select size and/or color if only one option is available
  useEffect(() => {
    if (!product) return

    if (availableSizes.length === 1 && selectedSize !== availableSizes[0].size) {
      setSelectedSize(availableSizes[0].size)
    }

    if (availableColors.length === 1) {
      const singleColor = typeof availableColors[0] === 'string' ? availableColors[0] : availableColors[0].name
      if (selectedColor !== singleColor) {
        setSelectedColor(singleColor)
      }
    }
  }, [product, availableSizes, availableColors, selectedSize, selectedColor])

  const handleSelectSize = (sz) => {
    setSelectedSize(sz)
    setValidationAttempted(false)
  }

  const handleSelectColor = (colName) => {
    setSelectedColor(colName)
    setValidationAttempted(false)
  }

  const handleAdd = (buyNow) => {
    if (!canAddToCart) {
      setValidationAttempted(true)
      return
    }
    setValidationAttempted(false)
    add(product, qty, {
      size: selectedSize ? Number(selectedSize) : null,
      color: selectedColor || null,
    })
    if (buyNow) return navigate('/cart')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

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
  const current = media[active] || media[0]

  const whatsappUrl = `https://wa.me/201035707186?text=${encodeURIComponent('مرحباً، أريد الاستفسار عن المنتج: ' + (product?.name || ''))}`

  return (
    <div className="container-x py-4 sm:py-10">
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted">
        <Link to="/" className="hover:text-ink">
          الرئيسية
        </Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <Link to={`/category/${product.category_id || product.category?.id || product.category}`} className="hover:text-ink">
          {getCategoryName(product.category)}
        </Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <span className="line-clamp-1 text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        {/* Media Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-cream-100">
            {current.media_type === 'video' ? (
              <video src={resolveMediaUrl(current.url)} controls playsInline className="h-full w-full object-cover" />
            ) : current.url ? (
              <>
                <img
                  src={resolveMediaUrl(current.url)}
                  alt={product.name}
                  className="h-full w-full object-cover animate-fade-up"
                  key={current.url}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList?.remove('hidden')
                  }}
                />
                <div className="hidden grid h-full w-full place-items-center bg-sand-subtle text-ink-muted text-sm p-4 text-center">
                  <ImageIcon className="h-16 w-16 stroke-1 text-ink-muted/50 mb-2" />
                  <span>تعذر تحميل الصورة</span>
                </div>
              </>
            ) : (
              <div className="grid h-full w-full place-items-center bg-sand-subtle text-ink-muted text-sm p-4 text-center">
                <ImageIcon className="h-16 w-16 stroke-1 text-ink-muted/50 mb-2" />
                <span>لا توجد صورة للمنتج</span>
              </div>
            )}
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
                    <video src={resolveMediaUrl(m.url)} muted className="h-full w-full object-cover" />
                  ) : (
                    <img
                      src={resolveMediaUrl(m.url)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList?.remove('hidden')
                      }}
                    />
                  )}
                  <div className="hidden grid h-full w-full place-items-center bg-sand-subtle text-ink-muted">
                    <ImageIcon className="h-5 w-5 stroke-1 text-ink-muted/50" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Variant Selectors */}
        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(product.categories) && product.categories.length > 0 ? (
              product.categories.map((c) => (
                <span key={c.id || c.name} className="chip bg-cream">
                  {c.name}
                </span>
              ))
            ) : (
              <span className="chip bg-cream">{getCategoryName(product.category)}</span>
            )}
            {product.gender && (
              <span className="chip bg-cream-100">
                {GENDER_LABELS[product.gender] || (product.gender === 'unisex' ? 'للجنسين' : product.gender)}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-4">
            <PriceTag product={product} size="lg" />
          </div>
          {product.description && <p className="mt-5 leading-8 text-ink/80">{product.description}</p>}

          {/* 1. Shoe Sizes Selector (Required for Shoes) */}
          {hasSizes && (
            <div className={`variant-selector-box ${validationAttempted && sizeMissing ? 'has-error' : ''}`}>
              <div className="variant-header">
                <div className="variant-title-group">
                  <span className="variant-label">اختر المقاس (مطلوب):</span>
                  {selectedSize && (
                    <span className="variant-selected-badge">
                      مقاس {selectedSize}
                    </span>
                  )}
                </div>
                {sizeMissing && (
                  <span className="variant-warning-badge">يرجى تحديد المقاس</span>
                )}
              </div>
              <div className="sizes-grid">
                {sizes.map((s) => {
                  const outOfStock = typeof s.stock === 'number' && s.stock <= 0
                  const isSelected = selectedSize === s.size
                  return (
                    <button
                      key={s.size}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => handleSelectSize(s.size)}
                      className={`size-option-btn ${isSelected ? 'selected' : ''}`}
                    >
                      <span>{s.size}</span>
                      {!outOfStock && s.stock <= 3 && (
                        <span className="size-stock-badge">متبقي {s.stock}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Colors Selector (Required for Shoes & Bags) */}
          {hasColors && (
            <div className={`variant-selector-box ${validationAttempted && colorMissing ? 'has-error' : ''}`}>
              <div className="variant-header">
                <div className="variant-title-group">
                  <span className="variant-label">اختر اللون (مطلوب):</span>
                  {selectedColor && (
                    <span className="variant-selected-badge">
                      {selectedColor}
                    </span>
                  )}
                </div>
                {colorMissing && (
                  <span className="variant-warning-badge">يرجى تحديد اللون</span>
                )}
              </div>
              <div className="colors-list">
                {colors.map((c) => {
                  const isSelected = selectedColor === c.name
                  const colorClass = getColorClass(c.name)
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectColor(c.name)}
                      className={`color-option-btn ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`color-swatch-circle ${colorClass}`} />
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
                type="button"
                onClick={() => setQty((q) => Math.min(q + 1, 50))}
                className="grid h-11 w-11 place-items-center hover:bg-cream-100"
                aria-label="زيادة"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(q - 1, 1))}
                className="grid h-11 w-11 place-items-center hover:bg-cream-100"
                aria-label="تقليل"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <span className={`text-sm font-bold ${inStock ? 'text-emerald-600' : 'text-sale'}`}>
              {inStock ? 'متوفر' : 'نفدت الكمية'}
            </span>
          </div>

          {/* Validation helper messages if variants are missing */}
          {(sizeMissing || colorMissing) && (
            <div className="variant-validation-message">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {sizeMissing && colorMissing
                  ? 'يرجى تحديد المقاس واللون المطلوبين لتفعيل خيار الإضافة إلى السلة'
                  : sizeMissing
                  ? 'يرجى تحديد المقاس المطلوب لتفعيل خيار الإضافة إلى السلة'
                  : 'يرجى تحديد اللون المطلوب لتفعيل خيار الإضافة إلى السلة'}
              </span>
            </div>
          )}

          {/* Unified Action Buttons Container */}
          <div className="product-actions-container">
            <div className="whatsapp-button-container">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-button"
              >
                <WhatsAppIcon className="whatsapp-icon" />
                <span> لشراء   او الاستفسار عن المنتج عبر الواتساب</span>
              </a>
            </div>

            <div className="product-cart-buttons">
              <button
                id="add-to-cart"
                type="button"
                disabled={!canAddToCart}
                onClick={() => handleAdd(false)}
                className={`btn-add-cart ${added ? 'added-success' : ''}`}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> تمت الإضافة للسلة
                  </>
                ) : (
                  'أضف إلى السلة'
                )}
              </button>
              <button
                id="buy-now"
                type="button"
                disabled={!canAddToCart}
                onClick={() => handleAdd(true)}
                className="btn-buy-now"
              >
                اشترِ الآن
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm ring-1 ring-cream">
            <Truck className="h-5 w-5 shrink-0" />
            <span>توصيل سريع لجميع محافظات مصر · الدفع عند الاستلام (ج.م)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
