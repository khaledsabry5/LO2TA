import { useEffect, useState } from 'react'
import { Receipt, Search, Download, Filter, Package, User, CheckCircle2, ArrowLeft, Coins, RotateCcw, AlertTriangle, X, Wallet } from 'lucide-react'
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
  const [refundModal, setRefundModal] = useState(null)
  const [processingRefund, setProcessingRefund] = useState(false)
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

  const handleRefundSale = async () => {
    if (!refundModal) return
    const orderId = refundModal.id
    setProcessingRefund(true)
    try {
      await api.refundSale(orderId)
      // 1. Immediately deduct the refunded order from sales list & completed sales total
      setSales((prev) => prev.filter((o) => o.id !== orderId))
      setRefundModal(null)
      // 2. Automatically refresh inventory cost and total pieces to reflect the restocked items
      const costData = await api.inventoryCost().catch(() => null)
      if (costData) {
        setTotalInventoryCost(costData.total_cost || 0)
        setTotalInventoryPieces(costData.total_pieces || 0)
      }
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء معالجة استرجاع الطلب')
    } finally {
      setProcessingRefund(false)
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

  // Dynamically aggregates only currently existing sales records
  const totalSum = (searchQuery.trim() ? filteredSales : sales).reduce(
    (acc, s) => acc + (parseFloat(s.total) || 0),
    0
  )

  // Total Liquid Cash = Total Completed Sales - Total Other Expenses & Discounts
  const totalLiquidCash = totalSum - (parseFloat(totalExpenses) || 0)

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">إجمالي المبيعات المكتملة</p>
          <p className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">{money(totalSum)}</p>
        </div>

        <div className={`card p-4 border transition-all ${
          totalLiquidCash >= 0
            ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-100/40 border-emerald-300/80 shadow-sm'
            : 'bg-gradient-to-br from-sale/5 via-white to-sale/10 border-sale/30 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-700" />
              <span>إجمالي الكاش / السيولة</span>
            </p>
            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
              totalLiquidCash >= 0
                ? 'text-emerald-800 bg-emerald-200/70'
                : 'text-sale bg-sale/10'
            }`}>
              صافي السيولة
            </span>
          </div>
          <p className={`mt-1 text-xl font-extrabold sm:text-2xl ${
            totalLiquidCash >= 0 ? 'text-emerald-800' : 'text-sale'
          }`}>
            {money(totalLiquidCash)}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-emerald-900/70">
            المبيعات المكتملة − المصروفات والخصومات
          </p>
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
                  <th className="p-3 text-start sm:p-4">تاريخ التسليم</th>
                  <th className="p-3 text-end sm:p-4">الإجراءات</th>
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
                    <td className="p-3 text-start sm:p-4 text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="p-3 text-end sm:p-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setRefundModal(order)}
                        className="btn-outline inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-900 border-amber-300/80 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400 transition rounded-xl ms-auto shadow-xs"
                        title={`استرجاع الطلب #${order.id} وإعادة المنتجات للمخزون`}
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
                        <span>استرجاع للمخزون</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund & Restock Confirmation Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-black/10 text-start">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center gap-2 text-amber-800">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-ink text-base">استرجاع الطلب وإعادة المنتجات للمخزون</h3>
                  <p className="text-[0.7rem] text-ink-muted">Refund & Restock Transaction</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal(null)}
                className="text-ink-muted hover:text-ink"
                title="إلغاء"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <p className="text-ink leading-relaxed font-medium">
                هل أنت متأكد من رغبتك في استرجاع هذه المعاملة؟ سيتم خصم مبلغ الطلب فوراً من إجمالي المبيعات، وإعادة كافة المنتجات والكميات المحددة إلى المخزون النشط لتصبح متاحة للشراء مجدداً.
              </p>

              {/* Order Info */}
              <div className="rounded-xl bg-cream/40 p-3 space-y-1.5 text-xs border border-black/5">
                <div className="flex justify-between">
                  <span className="text-ink-muted">رقم المعاملة:</span>
                  <span className="font-mono font-bold text-ink">#{refundModal.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">اسم العميل:</span>
                  <span className="font-bold text-ink">{refundModal.shipping_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">مبلغ الطلب المسترجع:</span>
                  <span className="font-extrabold text-amber-800">{money(refundModal.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">تاريخ المعاملة:</span>
                  <span className="font-mono text-ink">{formatDate(refundModal.created_at)}</span>
                </div>
              </div>

              {/* Items to be returned */}
              <div>
                <p className="text-xs font-bold text-ink mb-1.5">المنتجات التي ستُعاد إلى المخزون بالمقاس واللون:</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                  {refundModal.items?.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between bg-cream/30 p-2 rounded-lg border border-black/5 text-xs"
                    >
                      <div>
                        <p className="font-bold text-ink line-clamp-1">{it.product_name}</p>
                        <p className="text-[0.7rem] text-ink-muted">
                          {it.selected_size ? `مقاس: ${it.selected_size}` : ''}
                          {it.selected_size && it.selected_color ? ' • ' : ''}
                          {it.selected_color ? `لون: ${it.selected_color}` : ''}
                          {!it.selected_size && !it.selected_color ? 'منتج عام' : ''}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 text-[0.72rem] shrink-0">
                        + {it.quantity} قطعة للمخزون
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[0.72rem] text-ink-muted font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 text-amber-900">
                ℹ️ سيتم خصم مبلغ <span className="font-extrabold text-ink">{money(refundModal.total)}</span> من «إجمالي المبيعات»، وتحديث «إجمالي التكلفة» تلقائياً لتشمل تكلفة القطع المسترجعة للمخزون.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/5">
              <button
                type="button"
                onClick={() => setRefundModal(null)}
                className="btn-outline px-4 py-2 text-xs font-bold"
                disabled={processingRefund}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRefundSale}
                disabled={processingRefund}
                className="btn-dark flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-800 hover:bg-amber-900 border-amber-900 text-white"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${processingRefund ? 'animate-spin' : ''}`} />
                <span>{processingRefund ? 'جاري الاسترجاع...' : 'تأكيد الاسترجاع وإعادة للمخزون'}</span>
              </button>
            </div>
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
