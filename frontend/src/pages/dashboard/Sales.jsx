import { useEffect, useState } from 'react'
import { Receipt, Search, Download, Filter, Package, User } from 'lucide-react'
import { api } from '../../lib/api'
import { ORDER_STATUS, formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const loadSales = async () => {
    setLoading(true)
    try {
      const data = await api.sales({
        status: statusFilter || undefined,
        limit: 100,
      })
      setSales(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [statusFilter])

  const totalSum = sales.reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0)
  const totalDiscounts = sales.reduce((acc, s) => acc + (parseFloat(s.discount_total) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            سجل المبيعات والعمليات المالية (حصري للمدير)
          </h1>
          <p className="text-xs text-ink-muted sm:text-sm">
            عرض جميع المعاملات المالية، الفواتير، ومشتريات العملاء التفصيلية
          </p>
        </div>

        {/* Filter */}
        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="confirmed">مؤكد</option>
            <option value="shipped">تم الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي المبيعات المعروضة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalSum)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي الخصومات الممنوحة</p>
          <p className="mt-1 text-xl font-extrabold text-sale sm:text-2xl">{money(totalDiscounts)}</p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-bold text-ink-muted">عدد العمليات</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{sales.length} معاملة</p>
        </div>
      </div>

      {/* Sales Transactions Table */}
      {loading ? (
        <PageLoader />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="لا توجد عمليات مبيعات مسجلة"
          text="ستظهر العمليات فور قيام العملاء بالطلب"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/40 text-xs font-bold text-ink">
                <tr>
                  <th className="p-3 text-start sm:p-4">رقم المعاملة</th>
                  <th className="p-3 text-start sm:p-4">حساب العميل</th>
                  <th className="p-3 text-start sm:p-4">العناصر</th>
                  <th className="p-3 text-start sm:p-4">الخصم الممنوح</th>
                  <th className="p-3 text-start sm:p-4">المبلغ الصافي</th>
                  <th className="p-3 text-start sm:p-4">الحالة</th>
                  <th className="p-3 text-end sm:p-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {sales.map((order) => (
                  <tr key={order.id} className="transition hover:bg-cream-50/60">
                    <td className="p-3 sm:p-4">
                      <span className="font-mono font-extrabold text-ink">#{order.id}</span>
                    </td>
                    <td className="p-3 sm:p-4">
                      <div>
                        <p className="font-bold text-ink">{order.shipping_name}</p>
                        {order.customer && (
                          <p className="text-xs text-ink-muted font-mono">{order.customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-xs">
                      <div className="space-y-0.5">
                        {order.items.map((it) => (
                          <p key={it.id} className="line-clamp-1">
                            {it.product_name} × {it.quantity}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      {order.discount_total > 0 ? (
                        <span className="text-sale font-bold">-{money(order.discount_total)}</span>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 font-extrabold text-ink">
                      {money(order.total)}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className={`chip ${ORDER_STATUS[order.status]?.cls}`}>
                        {ORDER_STATUS[order.status]?.label}
                      </span>
                    </td>
                    <td className="p-3 text-end sm:p-4 text-xs text-ink-muted">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
