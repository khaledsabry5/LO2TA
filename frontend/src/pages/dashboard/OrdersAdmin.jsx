import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Clock, MapPin, Package, Phone, Truck, XCircle, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { ORDER_STATUS, NEXT_STATUS, formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState, Alert } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function OrdersAdmin() {
  const { isManager } = useAuth()
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [msg, setMsg] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await api.fulfillment({
        status: statusFilter || undefined,
        limit: 100,
      })
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    setMsg('')
    try {
      await api.setOrderStatus(orderId, newStatus)
      setMsg(`تم تحديث حالة الطلب #${orderId} إلى ${ORDER_STATUS[newStatus].label}`)
      loadOrders()
    } catch (err) {
      alert(err.message || 'فشل تحديث حالة الطلب')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            إدارة الطلبات والشحن
          </h1>
          <p className="text-xs text-ink-muted sm:text-sm">
            {isManager
              ? 'متابعة وتحديث جميع طلبات المتجر ومعلومات الشحن والتوصيل'
              : 'تنفيذ وشحن الطلبات النشطة فقط'}
          </p>
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">جميع الطلبات المعروضة</option>
            <option value="pending">قيد المراجعة</option>
            <option value="confirmed">مؤكد</option>
            <option value="shipped">تم الشحن</option>
            {isManager && (
              <>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغي</option>
              </>
            )}
          </select>
        </div>
      </div>

      {msg && <Alert tone="success">{msg}</Alert>}

      {/* Orders List */}
      {loading ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا توجد طلبات في هذه الحالة"
          text="ستظهر طلبات العملاء فور إتمامها"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const nextOptions = NEXT_STATUS[order.status] || []
            return (
              <div
                key={order.id}
                className="card overflow-hidden p-5 transition hover:shadow-md animate-fade-up"
              >
                {/* Top Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream font-mono font-extrabold text-ink">
                      #{order.id}
                    </span>
                    <div>
                      <p className="font-extrabold text-ink">
                        طلب العميل: {order.shipping_name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        تاريخ الطلب: {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge + Status Transition dropdown */}
                  <div className="flex items-center gap-2">
                    <span className={`chip ${ORDER_STATUS[order.status].cls}`}>
                      {ORDER_STATUS[order.status].label}
                    </span>

                    {nextOptions.length > 0 && (
                      <select
                        disabled={updatingId === order.id}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleStatusChange(order.id, e.target.value)
                          }
                        }}
                        className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-ink outline-none hover:bg-cream-100"
                      >
                        <option value="" disabled>
                          تغيير الحالة...
                        </option>
                        {nextOptions.map((st) => (
                          <option key={st} value={st}>
                            {ORDER_STATUS[st].label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Shipping Details (What Admin is specifically authorized to see) */}
                <div className="mt-4 grid gap-4 rounded-xl bg-cream-50/60 p-4 sm:grid-cols-2">
                  <div className="space-y-1.5 text-xs text-ink">
                    <p className="font-bold text-ink-muted">بيانات التواصل للشحن:</p>
                    <p className="flex items-center gap-2 font-bold">
                      <Phone className="h-3.5 w-3.5 text-azure-dark" />
                      <span dir="ltr">{order.shipping_phone}</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-sale" />
                      <span>{order.shipping_city} — {order.shipping_address}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-ink">
                    <p className="font-bold text-ink-muted">ملاحظات والتسليم:</p>
                    <p className="text-ink-muted">
                      {order.notes ? `«${order.notes}»` : 'لا توجد ملاحظات إضافية من العميل'}
                    </p>
                    <p className="font-bold text-emerald-700">طريقة الدفع: الدفع عند الاستلام</p>
                  </div>
                </div>

                {/* Items in order */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-ink-muted">المنتجات المطلوبة:</p>
                  <div className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-ink-muted" />
                          <span className="font-bold text-ink">{item.product_name}</span>
                          <span className="text-ink-muted">× {item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-ink">
                            {money(item.line_total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer total */}
                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    {order.discount_total > 0 && (
                      <span className="text-sale">
                        (خصم مطبق: {money(order.discount_total)})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted">إجمالي الطلب:</span>
                    <span className="text-base font-extrabold text-ink">
                      {money(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
