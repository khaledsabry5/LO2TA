import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageOpen, RefreshCw } from 'lucide-react'
import ProductCard from '../ProductCard'
import { EmptyState, ProductSkeleton } from '../ui'
import { api } from '../../lib/api'

/** Latest 20 products (mixed categories) – served by GET /api/products/latest */
export default function LatestArrivals() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.latest()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'تعذر الاتصال بالخادم لتحميل أحدث المنتجات')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section aria-labelledby="latest-heading" className="container-x mt-10 sm:mt-14">
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <div>
          <h2 id="latest-heading" className="section-title">وصل حديثاً</h2>
          <p className="mt-1 text-sm text-ink-muted">أحدث 20 منتج من جميع التصنيفات</p>
        </div>
        <Link to="/shop" className="text-sm font-bold text-ink-muted hover:text-ink">عرض الكل</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title="تعذر تحميل المنتجات"
          text={error}
          action={<button type="button" onClick={load} className="btn-dark">إعادة المحاولة</button>}
        />
      ) : items.length === 0 ? (
        <EmptyState icon={PackageOpen} title="لا توجد منتجات بعد" text="سيتم عرض أحدث المنتجات هنا فور إضافتها." />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}
