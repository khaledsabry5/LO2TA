import { useEffect, useState } from 'react'
import { Receipt, Search, Download, Filter, Package, User, Trash2, CheckCircle2 } from 'lucide-react'
import { api } from '../../lib/api'
import { ORDER_STATUS, formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [totalInventoryCost, setTotalInventoryCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadSales = async () => {
    setLoading(true)
    try {
      // Strictly fetch only DELIVERED orders as the final archive for completed sales & total inventory cost
      const [salesData, costData] = await Promise.all([
        api.sales({
          status: 'DELIVERED',
          limit: 100,
        }),
        api.inventoryCost().catch(() => ({ total_cost: 0 })),
      ])
      const deliveredList = Array.isArray(salesData)
        ? salesData.filter((s) => String(s.status || '').toUpperCase() === 'DELIVERED')
        : []
      setSales(deliveredList)
      setTotalInventoryCost(costData?.total_cost || 0)
    } catch (err) {
      console.error(err)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [])

  const handleClearSales = async () => {
    if (!window.confirm('تحذير: هل أنت متأكد من مسح جميع بيانات سجل المبيعات والطلبات بالكامل؟ سيتم إعادة ترقيم المعاملات لتبدأ من رقم 1.')) return
    setLoading(true)
    try {
      await api.clearAllOrders()
      setSales([])
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء مسح سجل المبيعات')
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter((order) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      String(order.id).includes(q) ||
      (order.shipping_name && order.shipping_name.toLowerCase().includes(q)) ||
      (order.shipping_phone && order.shipping_phone.includes(q)) ||
      (order.customer?.email && order.customer.email.toLowerCase().includes(q))
    )
  })

  const totalSum = filteredSales.reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
              سجل المبيعات والعمليات المالية
            </h1>
            <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-emerald-700 sm:inline-flex">
              <CheckCircle2 className="h-3 w-3" /> تم التوصيل فقط
            </span>
          </div>
          <p className="text-xs text-ink-muted sm:text-sm">
            أرشيف المبيعات والعمليات المكتملة والمسلمة فقط (تم التوصيل)
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالرقم أو اسم العميل..."
              className="input pr-9 text-xs"
            />
          </div>

          {sales.length > 0 && (
            <button
              type="button"
              onClick={handleClearSales}
              className="btn-danger flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
              title="مسح سجل المبيعات والطلبات"
            >
              <Trash2 className="h-4 w-4" />
              <span>مسح السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي المبيعات المكتملة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalSum)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي التكلفة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalInventoryCost)}</p>
          <p className="mt-0.5 text-[0.65rem] text-ink-muted">تكلفة جميع المنتجات المرفوعة بالمتجر</p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-bold text-ink-muted">عدد المبيعات المسلمة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{filteredSales.length} عملية مكتملة</p>
        </div>
      </div>

      {/* Sales Transactions Table */}
      {loading ? (
        <PageLoader />
      ) : filteredSales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={searchQuery ? "لا توجد نتائج مطابقة للبحث" : "سجل المبيعات فارغ"}
          text={
            searchQuery
              ? "جرّب البحث بكلمة أو رقم طلب آخر."
              : "لا توجد مبيعات مكتملة بحالة «تم التوصيل» بعد. ستظهر العمليات هنا تلقائياً فور تسليم الطلبات للعملاء."
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive admin-table-scroll-wrapper">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/40 text-xs font-bold text-ink">
                <tr>
                  <th className="p-3 text-start sm:p-4">رقم المعاملة</th>
                  <th className="p-3 text-start sm:p-4">العميل وبيانات التوصيل</th>
                  <th className="p-3 text-start sm:p-4">العناصر</th>
                  <th className="p-3 text-start sm:p-4">تكلفة المنتجات</th>
                  <th className="p-3 text-start sm:p-4">المبلغ الصافي</th>
                  <th className="p-3 text-start sm:p-4">الحالة</th>
                  <th className="p-3 text-end sm:p-4">تاريخ التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredSales.map((order) => (
                  <tr key={order.id} className="transition hover:bg-cream-50/60">
                    <td className="p-3 sm:p-4">
                      <span className="font-mono font-extrabold text-ink">#{order.id}</span>
                    </td>
                    <td className="p-3 sm:p-4">
                      <div>
                        <p className="font-bold text-ink">{order.shipping_name}</p>
                        <p className="text-xs text-ink-muted" dir="ltr">{order.shipping_phone}</p>
                        {order.customer && (
                          <p className="text-xs text-ink-muted font-mono">{order.customer.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-xs">
                      <div className="space-y-0.5">
                        {order.items?.map((it) => (
                          <p key={it.id} className="line-clamp-1">
                            {it.product_name} × {it.quantity}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="font-bold text-ink">
                        {money(order.cost_total ?? 0)}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 font-extrabold text-ink">
                      {money(order.total)}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="chip status-badge-delivered">
                        تم التوصيل
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
