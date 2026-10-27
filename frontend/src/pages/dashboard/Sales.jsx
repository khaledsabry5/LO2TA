import { useEffect, useState } from 'react'
import { Receipt, Search, Download, Filter, Package, User, CheckCircle2, ArrowLeft, Coins } from 'lucide-react'
import { api } from '../../lib/api'
import { ORDER_STATUS, formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'
import ExpensesAdmin from './ExpensesAdmin'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [totalInventoryCost, setTotalInventoryCost] = useState(0)
  const [totalInventoryPieces, setTotalInventoryPieces] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [showExpensesModal, setShowExpensesModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadSales = async () => {
    setLoading(true)
    try {
      // Strictly fetch only DELIVERED orders as the final archive for completed sales, inventory cost, and expenses
      const [salesData, costData, expData] = await Promise.all([
        api.sales({
          status: 'DELIVERED',
          limit: 100,
        }),
        api.inventoryCost().catch(() => ({ total_cost: 0, total_pieces: 0 })),
        api.getExpensesSummary().catch(() => ({ total_amount: 0 })),
      ])
      const deliveredList = Array.isArray(salesData)
        ? salesData.filter((s) => String(s.status || '').toUpperCase() === 'DELIVERED')
        : []
      setSales(deliveredList)
      setTotalInventoryCost(costData?.total_cost || 0)
      setTotalInventoryPieces(costData?.total_pieces || 0)
      setTotalExpenses(expData?.total_amount || 0)
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
          {/* Other Expenses & Discounts Button */}
          <button
            type="button"
            onClick={() => setShowExpensesModal(true)}
            className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 border-amber-300 bg-amber-50/70 hover:bg-amber-100 transition"
            title="إدارة المصروفات والخصومات الأخرى"
          >
            <Coins className="h-4 w-4 text-amber-700" />
            <span>المصروفات والخصومات الأخرى</span>
          </button>

          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالرقم أو اسم العميل..."
              className="input pr-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي المبيعات المكتملة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalSum)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي التكلفة (المخزون)</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalInventoryCost)}</p>
          <p className="mt-0.5 text-[0.65rem] text-ink-muted">
            تكلفة كافة القطع والمقاسات بالمخزون{totalInventoryPieces > 0 ? ` (${totalInventoryPieces} قطعة)` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowExpensesModal(true)}
          className="card p-4 text-start transition-all hover:border-amber-400 hover:shadow-md cursor-pointer group bg-gradient-to-br from-amber-50/70 via-white to-amber-100/40 border border-amber-300/80"
          title="انقر لفتح إدارة المصروفات والخصومات"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-900">المصروفات والخصومات الأخرى</p>
            <span className="text-[0.65rem] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-amber-300 transition">
              إدارة
              <ArrowLeft className="h-2.5 w-2.5" />
            </span>
          </div>
          <p className="mt-1 text-xl font-extrabold text-amber-900 sm:text-2xl">{money(totalExpenses)}</p>
          <p className="mt-0.5 text-[0.65rem] text-amber-800/80">انقر لفتح نافذة إدارة النفقات والخصومات</p>
        </button>
        <div className="card p-4">
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

      {/* Expenses & Discounts Management Modal */}
      {showExpensesModal && (
        <ExpensesAdmin
          isModal
          onClose={() => setShowExpensesModal(false)}
          onExpensesUpdated={(newTotal) => setTotalExpenses(newTotal)}
        />
      )}
    </div>
  )
}
