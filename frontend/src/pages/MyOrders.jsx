import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, Truck, CheckCircle2, AlertOctagon, MapPin, Phone } from 'lucide-react'
import { EmptyState, PageLoader } from '../components/ui'
import { api } from '../lib/api'
import { getOrderStatusInfo, formatDate, money } from '../lib/format'
import './CustomerOrders.css'

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

  useEffect(() => {
    load()
  }, [])

  const cancel = async (id) => {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return
    try {
      await api.cancelMyOrder(id)
      load()
    } catch (err) {
      alert(err?.message || 'فشل إلغاء الطلب')
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'PROCESSING' || s === 'CONFIRMED' || s === 'SHIPPED') {
      return (
        <span className="order-status-badge status-processing">
          <Truck className="h-3.5 w-3.5" /> قيد التجهيز والشحن
        </span>
      )
    }
    if (s === 'DELIVERED') {
      return (
        <span className="order-status-badge status-delivered">
          <CheckCircle2 className="h-3.5 w-3.5" /> تم التوصيل
        </span>
      )
    }
    if (s === 'NOT_RECEIVED' || s === 'CANCELLED' || s === 'CANCELED') {
      return (
        <span className="order-status-badge status-not-received">
          <AlertOctagon className="h-3.5 w-3.5" /> لم يتم الاستلام
        </span>
      )
    }
    return (
      <span className="order-status-badge status-pending">
        <Clock className="h-3.5 w-3.5" /> قيد المراجعة
      </span>
    )
  }

  if (loading) return <PageLoader />
  if (error) {
    return (
      <div className="customer-orders-container">
        <EmptyState icon={Package} title="خطأ" text={error} />
      </div>
    )
  }

  return (
    <div className="customer-orders-container">
      <div className="customer-orders-header">
        <h1 className="customer-orders-title">طلباتي</h1>
        <p className="customer-orders-subtitle">
          متابعة وتتبع مسار طلباتك السابقة والحالية في متجر YSN
        </p>
      </div>

      <div className="customer-orders-list">
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="لا توجد طلبات سابقة"
            text="لم تقم بإجراء أي طلبات بعد. تصفح أحدث التشكيلات وتسوق الآن!"
            action={
              <Link to="/shop" className="btn-dark">
                ابدأ التسوق الآن
              </Link>
            }
          />
        ) : (
          orders.map((o) => {
            const rawStatus = String(o.status || '').toUpperCase()
            const isPending = rawStatus === 'PENDING'
            const isProcessing = rawStatus === 'PROCESSING' || rawStatus === 'CONFIRMED' || rawStatus === 'SHIPPED'
            const isDelivered = rawStatus === 'DELIVERED'
            const isNotReceived = rawStatus === 'NOT_RECEIVED' || rawStatus === 'CANCELLED'

            return (
              <div key={o.id} className="customer-order-card">
                {/* Header with Order # and Status Badge */}
                <div className="customer-order-header">
                  <div className="customer-order-meta">
                    <span className="customer-order-number-badge">#{o.id}</span>
                    <div>
                      <p className="customer-order-id">طلب رقم #{o.id}</p>
                      <p className="customer-order-date">
                        تاريخ الطلب: {formatDate(o.created_at)}
                      </p>
                    </div>
                  </div>

                  {getStatusBadge(o.status)}
                </div>

                {/* Tracking Progress Steps */}
                {!isNotReceived ? (
                  <div className="customer-order-timeline" aria-label="مراحل تتبع الطلب">
                    <div className={`customer-order-timeline-step ${isPending ? 'active' : 'completed'}`}>
                      <div className="customer-order-timeline-dot">1</div>
                      <span className="customer-order-timeline-label">قيد المراجعة</span>
                    </div>

                    <div className={`customer-order-timeline-step ${isProcessing ? 'active' : isDelivered ? 'completed' : ''}`}>
                      <div className="customer-order-timeline-dot">2</div>
                      <span className="customer-order-timeline-label">قيد التجهيز والشحن</span>
                    </div>

                    <div className={`customer-order-timeline-step ${isDelivered ? 'completed' : ''}`}>
                      <div className="customer-order-timeline-dot">3</div>
                      <span className="customer-order-timeline-label">تم التوصيل</span>
                    </div>
                  </div>
                ) : (
                  <div className="customer-order-timeline" aria-label="حالة الطلب">
                    <div className="customer-order-timeline-step failed">
                      <div className="customer-order-timeline-dot">✕</div>
                      <span className="customer-order-timeline-label">لم يتم الاستلام</span>
                    </div>
                  </div>
                )}

                {/* Items in order */}
                <div className="customer-order-items">
                  {o.items.map((i) => (
                    <div key={i.id} className="customer-order-item-row">
                      <div className="customer-order-item-info">
                        <span className="customer-order-item-name">{i.product_name}</span>
                        <span className="customer-order-item-qty">× {i.quantity}</span>
                        {i.selected_size && (
                          <span className="customer-order-item-variant">
                            مقاس {i.selected_size}
                          </span>
                        )}
                        {i.selected_color && (
                          <span className="customer-order-item-variant">
                            لون {i.selected_color}
                          </span>
                        )}
                      </div>
                      <span className="customer-order-item-price">{money(i.line_total)}</span>
                    </div>
                  ))}
                </div>

                {/* Shipping summary */}
                <div className="customer-order-shipping">
                  <div className="customer-order-shipping-address">
                    <MapPin className="h-3.5 w-3.5 text-sale" />
                    <span>عنوان الشحن: {o.shipping_city} — {o.shipping_address}</span>
                  </div>
                  <div className="customer-order-shipping-address">
                    <Phone className="h-3.5 w-3.5 text-azure-dark" />
                    <span dir="ltr">{o.shipping_phone}</span>
                  </div>
                </div>

                {/* Footer with total and cancel button */}
                <div className="customer-order-footer">
                  <div>
                    <span className="customer-order-total-label">إجمالي الطلب: </span>
                    <span className="customer-order-total-amount">{money(o.total)}</span>
                  </div>

                  {isPending && (
                    <button
                      type="button"
                      onClick={() => cancel(o.id)}
                      className="customer-order-cancel-btn"
                    >
                      إلغاء الطلب
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
