import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { EmptyState, PageLoader } from '../components/ui'
import { api } from '../lib/api'
import { ORDER_STATUS, formatDate, money } from '../lib/format'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.myOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'تعذر تحميل قائمة الطلبات')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cancel = async (id) => {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return
    try {
      await api.cancelMyOrder(id)
      load()
    } catch (err) {
      alert(err?.message || 'فشل إلغاء الطلب')
    }
  }

  if (loading) return <PageLoader />
  if (error) return <div className="container-x py-10"><EmptyState icon={Package} title="خطأ" text={error} /></div>
  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold sm:text-3xl">طلباتي</h1>
      <div className="mt-6 space-y-4">
        {orders.length === 0 ? (
          <EmptyState icon={Package} title="لا توجد طلبات" action={<Link to="/shop" className="btn-dark">تسوق الآن</Link>} />
        ) : (
          orders.map((o) => (
            <div key={o.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">طلب #{o.id}</p>
                  <p className="text-xs text-ink-muted">{formatDate(o.created_at)}</p>
                </div>
                <span className={`chip ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>{money(i.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                <span className="font-extrabold">{money(o.total)}</span>
                {o.status === 'pending' && <button onClick={() => cancel(o.id)} className="text-sm font-bold text-sale">إلغاء الطلب</button>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
