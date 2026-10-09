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

  useEffect(() => {
    setProduct(null)
    setActive(0)
    api.product(id).then((p) => {
      setProduct(p)
      document.title = `${p.name} | لقطة للإكسسوارات`
    }).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="container-x py-10"><EmptyState icon={ShoppingBag} title="المنتج غير موجود" text={error} /></div>
  if (!product) return <PageLoader />

  const media = product.media.length ? product.media : [{ id: 0, url: '', media_type: 'image' }]
  const current = media[active]

  const handleAdd = (buyNow) => {
    add(product, qty)
    if (buyNow) return navigate('/cart')
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="container-x py-4 sm:py-10">
      <nav className="mb-4 flex items-center gap-1 text-xs text-ink-muted">
        <Link to="/" className="hover:text-ink">الرئيسية</Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <Link to={`/shop?category=${product.category}`} className="hover:text-ink">{CATEGORY_LABELS[product.category]}</Link>
        <ChevronRight className="h-3 w-3 rotate-180" />
        <span className="line-clamp-1 text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-cream-100">
            {current.media_type === 'video' ? (
              <video src={current.url} controls playsInline className="h-full w-full object-cover" />
            ) : current.url ? (
              <img src={current.url} alt={product.name} className="h-full w-full object-cover animate-fade-up" key={current.url} />
            ) : null}
            {product.has_discount && (
              <span className="absolute end-4 top-4 rounded-full bg-sale px-3 py-1 text-sm font-extrabold text-white">-{product.discount_percent}%</span>
            )}
          </div>
          {media.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setActive(i)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === active ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'}`}
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

        <div className="flex flex-col">
          <div className="flex gap-2">
            <span className="chip bg-cream">{CATEGORY_SINGULAR[product.category]}</span>
            <span className="chip bg-cream-100">{GENDER_LABELS[product.gender]}</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-4"><PriceTag product={product} size="lg" /></div>
          {product.description && <p className="mt-5 leading-8 text-ink/80">{product.description}</p>}

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-bold">الكمية</span>
            <div className="flex items-center rounded-xl ring-1 ring-black/10">
              <button onClick={() => setQty((q) => Math.min(q + 1, 50))} className="grid h-11 w-11 place-items-center hover:bg-cream-100" aria-label="زيادة"><Plus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.max(q - 1, 1))} className="grid h-11 w-11 place-items-center hover:bg-cream-100" aria-label="تقليل"><Minus className="h-4 w-4" /></button>
            </div>
            <span className={`text-sm font-bold ${product.in_stock ? 'text-emerald-600' : 'text-sale'}`}>
              {product.in_stock ? 'متوفر' : 'نفدت الكمية'}
            </span>
          </div>

          {/* Sticky action bar on mobile */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-black/5 bg-white/95 p-3 pb-safe backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
            <button id="add-to-cart" disabled={!product.in_stock} onClick={() => handleAdd(false)} className={`flex-1 ${added ? 'btn bg-azure text-white' : 'btn-cream'}`}>
              {added ? <><Check className="h-4 w-4" /> تمت الإضافة</> : 'أضف إلى السلة'}
            </button>
            <button id="buy-now" disabled={!product.in_stock} onClick={() => handleAdd(true)} className="btn-dark flex-1">
              اشترِ الآن
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-cream-50 p-4 text-sm ring-1 ring-cream">
            <Truck className="h-5 w-5 shrink-0" />
            <span>توصيل خلال 2-5 أيام عمل · الدفع عند الاستلام</span>
          </div>
          <div className="h-20 lg:hidden" />
        </div>
      </div>
    </div>
  )
}
