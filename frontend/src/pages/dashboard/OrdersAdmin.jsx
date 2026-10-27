import { useEffect, useState } from 'react'
import { MapPin, Package, Phone, CheckCircle2, Clock, Truck, AlertOctagon, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { ACTIVE_ORDER_STATUS_LIST, ORDER_STATUS_LIST, formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState, Alert } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function OrdersAdmin() {
  const { isManager } = useAuth()
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [msg, setMsg] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await api.fulfillment({
        status: statusFilter || undefined,
        active_only: !statusFilter,
        limit: 100,
      })
      // Active Orders View strictly shows pending and processing orders
      const activeList = Array.isArray(data)
        ? data.filter((o) => {
            const s = String(o.status || '').toUpperCase()
            if (statusFilter) return s === statusFilter
            return s === 'PENDING' || s === 'PROCESSING'
          })
        : []
      setOrders(activeList)
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

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطلب #${orderId} نهائياً؟`)) return
    setDeletingId(orderId)
    setMsg('')
    try {
      await api.deleteOrder(orderId)
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      setMsg(`تم حذف الطلب #${orderId} بنجاح`)
    } catch (err) {
      alert(err.message || 'فشل حذف الطلب')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    setMsg('')
    try {
      await api.setOrderStatus(orderId, newStatus)
      const normalizedStatus = String(newStatus).toUpperCase()

      // When the admin changes an order to "تم التوصيل" or "لم يتم الاستلام":
      // Immediately filter out/remove that order from the local React state so it visually disappears from active orders page!
      if (normalizedStatus === 'DELIVERED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        setMsg(`تم تحديث الطلب #${orderId} بنجاح إلى «تم التوصيل» ونقله إلى سجل المبيعات.`)
      } else if (normalizedStatus === 'NOT_RECEIVED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        setMsg(`تم تسجيل حالة الطلب #${orderId} كـ «لم يتم الاستلام» وإرجاع المنتجات إلى المخزون بنجاح.`)
      } else {
        const matched = ORDER_STATUS_LIST.find((s) => s.value === newStatus)
        setMsg(`تم تحديث حالة الطلب #${orderId} بنجاح إلى: «${matched?.label || newStatus}»`)
        setOrders((prev) => {
          if (statusFilter && statusFilter !== normalizedStatus) {
            return prev.filter((o) => o.id !== orderId)
          }
          return prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        })
      }
    } catch (err) {
      alert(err.message || 'فشل تحديث حالة الطلب')
      loadOrders()
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusSelectClass = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'PROCESSING' || s === 'CONFIRMED' || s === 'SHIPPED') {
      return 'status-select-processing'
    }
    if (s === 'DELIVERED') {
      return 'status-select-delivered'
    }
    if (s === 'NOT_RECEIVED' || s === 'CANCELLED' || s === 'CANCELED') {
      return 'status-select-not-received'
    }
    return 'status-select-pending'
  }

  const getStatusValue = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'CONFIRMED' || s === 'SHIPPED') return 'PROCESSING'
    if (s === 'CANCELLED' || s === 'CANCELED') return 'NOT_RECEIVED'
    return s || 'PENDING'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            إدارة الطلبات النشطة والشحن
          </h1>
          <p className="text-xs text-ink-muted sm:text-sm">
            عرض الطلبات النشطة (قيد المراجعة وقيد التجهيز) وتحديث مسار التوصيل والمخزون
          </p>
        </div>

        {/* Actions & Status filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm font-bold"
              aria-label="تصفية الطلبات النشطة حسب الحالة"
            >
              <option value="">جميع الطلبات النشطة ({orders.length})</option>
              {ACTIVE_ORDER_STATUS_LIST.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {msg && <Alert tone="success">{msg}</Alert>}

      {/* Responsive Orders Table */}
      {loading ? (
        <PageLoader />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={statusFilter ? "لا توجد طلبات في هذه الحالة" : "لا توجد طلبات نشطة حالياً"}
          text={statusFilter ? "يرجى تغيير معيار التصفية لعرض الطلبات النشطة الأخرى." : "جميع الطلبات إما تم تسليمها ونقلها لسجل المبيعات، أو لم يتم تسجيل طلبات جديدة بعد."}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive admin-table-scroll-wrapper">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/40 text-xs font-bold text-ink">
                <tr>
                  <th className="p-3 text-start sm:p-4">رقم الطلب</th>
                  <th className="p-3 text-start sm:p-4">العميل وبيانات التوصيل</th>
                  <th className="p-3 text-start sm:p-4">المنتجات المطلوبة</th>
                  <th className="p-3 text-start sm:p-4">المبلغ الإجمالي</th>
                  <th className="p-3 text-start sm:p-4">تاريخ الطلب</th>
                  <th className="p-3 text-start sm:p-4">حالة الطلب</th>
                  <th className="p-3 text-center sm:p-4">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {orders.map((order) => {
                  const currentValue = getStatusValue(order.status)
                  const currentClass = getStatusSelectClass(order.status)

                  return (
                    <tr key={order.id} className="transition hover:bg-cream-50/60">
                      {/* 1. Order ID */}
                      <td className="p-3 sm:p-4 font-mono font-extrabold text-ink align-top">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream text-sm">
                          #{order.id}
                        </span>
                      </td>

                      {/* 2. Customer & Shipping details */}
                      <td className="p-3 sm:p-4 align-top">
                        <div className="space-y-1">
                          <p className="font-extrabold text-ink">{order.shipping_name}</p>
                          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                            <Phone className="h-3.5 w-3.5 text-azure-dark shrink-0" />
                            <span dir="ltr">{order.shipping_phone}</span>
                          </p>
                          <p className="flex items-start gap-1.5 text-xs text-ink-muted">
                            <MapPin className="h-3.5 w-3.5 text-sale shrink-0 mt-0.5" />
                            <span>{order.shipping_city} — {order.shipping_address}</span>
                          </p>
                          {order.notes && (
                            <p className="text-[0.7rem] text-ink-muted italic">
                              «{order.notes}»
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. Products in Order */}
                      <td className="p-3 sm:p-4 align-top">
                        <div className="space-y-1.5 text-xs">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-ink">{item.product_name}</span>
                              <span className="text-ink-muted font-mono">×{item.quantity}</span>
                              {item.selected_size && (
                                <span className="rounded bg-cream px-1.5 py-0.5 text-[0.65rem] font-extrabold text-ink">
                                  مقاس {item.selected_size}
                                </span>
                              )}
                              {item.selected_color && (
                                <span className="rounded bg-cream px-1.5 py-0.5 text-[0.65rem] font-extrabold text-ink">
                                  لون {item.selected_color}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 4. Total Amount */}
                      <td className="p-3 sm:p-4 align-top">
                        <div>
                          <p className="font-extrabold text-ink">{money(order.total)}</p>
                          {order.discount_total > 0 && (
                            <span className="text-[0.7rem] font-bold text-sale">
                              خصم: -{money(order.discount_total)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Date */}
                      <td className="p-3 sm:p-4 text-xs text-ink-muted align-top whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>

                      {/* 6. Order Status Dropdown (Strict 4 statuses with color-coding) */}
                      <td className="p-3 sm:p-4 admin-status-cell align-top">
                        <div className="admin-order-status-container">
                          <select
                            value={currentValue}
                            disabled={updatingId === order.id}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`admin-order-status-select ${currentClass}`}
                            aria-label={`تغيير حالة الطلب رقم ${order.id}`}
                          >
                            {ORDER_STATUS_LIST.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 7. Delete Action */}
                      <td className="p-3 sm:p-4 text-center align-top">
                        <button
                          type="button"
                          disabled={deletingId === order.id}
                          onClick={() => handleDeleteOrder(order.id)}
                          className="rounded-lg p-2 text-ink-muted transition hover:bg-sale/10 hover:text-sale disabled:opacity-40"
                          title="حذف الطلب نهائياً"
                          aria-label={`حذف الطلب رقم ${order.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
