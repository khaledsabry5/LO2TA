import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import { EmptyState, ProductSkeleton } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_LABELS, GENDER_LABELS } from '../lib/format'

const PAGE = 24

function Chip({ active, onClick, children, tone }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? (tone === 'sale' ? 'bg-sale text-white' : 'bg-ink text-white') : 'bg-cream-100 text-ink hover:bg-cream'
      }`}
    >
      {children}
    </button>
  )
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const gender = params.get('gender') || ''
  const category = params.get('category') || ''
  const discounted = params.get('discounted') === 'true'
  const q = params.get('q') || ''

  const [data, setData] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || next.get(key) === String(value)) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setOffset(0)

    async function fetchProducts() {
      try {
        const res = await api.products({ gender, category, q, discounted: discounted || undefined, limit: PAGE, offset: 0 })
        if (mounted) {
          setData(res && Array.isArray(res.items) ? res : { total: 0, items: [] })
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'تعذر تحميل المنتجات')
          setData({ total: 0, items: [] })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()
    return () => { mounted = false }
  }, [gender, category, q, discounted])

  const loadMore = async () => {
    const nextOffset = offset + PAGE
    try {
      const res = await api.products({ gender, category, q, discounted: discounted || undefined, limit: PAGE, offset: nextOffset })
      if (res && Array.isArray(res.items)) {
        setData((d) => ({ total: res.total, items: [...(d.items || []), ...res.items] }))
        setOffset(nextOffset)
      }
    } catch (err) {
      console.error('Failed to load more products:', err)
    }
  }

  const title = q
    ? `نتائج البحث عن «${q}»`
    : [gender && `قسم ${gender === 'men' ? 'الرجال' : 'النساء'}`, category && CATEGORY_LABELS[category], discounted && 'العروض']
        .filter(Boolean)
        .join(' · ') || 'جميع المنتجات'

  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{loading ? '...' : `${data.total} منتج`}</p>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {Object.entries(GENDER_LABELS).map(([k, v]) => (
          <Chip key={k} active={gender === k} onClick={() => update('gender', k)}>{v}</Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-black/10" />
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <Chip key={k} active={category === k} onClick={() => update('category', k)}>{v}</Chip>
        ))}
        <span className="mx-1 w-px shrink-0 bg-black/10" />
        <Chip active={discounted} tone="sale" onClick={() => update('discounted', 'true')}>العروض</Chip>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={SearchX} title="لا توجد نتائج" text="جرّب تغيير الفلاتر أو كلمة البحث." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {data.items.map((p, i) => <ProductCard key={p.id} product={p} index={i % PAGE} />)}
            </div>
            {data.items.length < data.total && (
              <div className="mt-10 text-center">
                <button onClick={loadMore} className="btn-outline">عرض المزيد</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
