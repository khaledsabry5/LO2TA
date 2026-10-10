import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Banknote, Clock, Package, ShoppingBag, Tag, TrendingUp, Users } from 'lucide-react'
import { PageLoader } from '../../components/ui'
import { api } from '../../lib/api'
import { CATEGORY_LABELS, ORDER_STATUS, money, num } from '../../lib/format'

function Kpi({ icon: Icon, label, value, tone = 'cream' }) {
  const tones = { cream: 'bg-cream', ink: 'bg-ink text-white', azure: 'bg-azure/10 text-azure-dark', sale: 'bg-sale/10 text-sale' }
  return (
    <div className="card flex items-center gap-3 p-4 animate-fade-up">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <p className="truncate text-lg font-extrabold sm:text-xl">{value}</p>
      </div>
    </div>
  )
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export default function Overview() {
  const [d, setD] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function fetchAnalytics() {
      try {
        const data = await api.analytics()
        if (mounted) setD(data)
      } catch (e) {
        if (mounted) setError(e?.message || 'تعذر تحميل بيانات لوحة التحكم')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchAnalytics()
    return () => { mounted = false }
  }, [])

  if (loading) return <PageLoader />
  if (error) return <div className="card p-6 text-sale font-bold">{error}</div>
  if (!d) return null

  const monthly = (d.revenue_by_month || []).map((m) => ({ ...m, name: MONTHS[Number(m.month.slice(5)) - 1] }))
  const cats = (d.sales_by_category || []).map((c) => ({ ...c, name: CATEGORY_LABELS[c.category] }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold sm:text-2xl">نظرة عامة على المبيعات</h1>
        <Link to="/dashboard/staff" className="btn-dark px-4 py-2.5">+ إضافة مدير أو مشرف</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Banknote} label="إجمالي المبيعات" value={money(d.revenue)} tone="ink" />
        <Kpi icon={ShoppingBag} label="عدد الطلبات" value={num(d.orders_count)} />
        <Kpi icon={TrendingUp} label="متوسط قيمة الطلب" value={money(d.avg_order_value)} tone="azure" />
        <Kpi icon={Users} label="عدد العملاء" value={num(d.customers_count)} />
        <Kpi icon={Clock} label="طلبات قيد المراجعة" value={num(d.pending_orders)} />
        <Kpi icon={Package} label="عدد المنتجات" value={num(d.products_count)} />
        <Kpi icon={Tag} label="إجمالي الخصومات" value={money(d.discount_given)} tone="sale" />
        <Kpi icon={AlertTriangle} label="منتجات منخفضة المخزون" value={num(d.low_stock.length)} tone="sale" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card p-4 sm:p-5 xl:col-span-2">
          <h2 className="mb-4 font-extrabold">المبيعات الشهرية</h2>
          <div className="h-64" dir="ltr">
            {monthly.length ? (
              <ResponsiveContainer>
                <AreaChart data={monthly} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#faedcd" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#0a0a0a" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink-muted">لا توجد مبيعات بعد</div>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="mb-4 font-extrabold">المبيعات حسب التصنيف</h2>
          <div className="h-64" dir="ltr">
            {cats.length ? (
              <ResponsiveContainer>
                <BarChart data={cats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="revenue" fill="#e8c787" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink-muted">لا توجد بيانات</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 font-extrabold">الأكثر مبيعاً</h2>
          {d.top_products.length ? (
            <ol className="space-y-2 text-sm">
              {d.top_products.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-cream text-xs font-bold">{i + 1}</span>{p.name}</span>
                  <span className="text-ink-muted">{p.units} قطعة</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-muted">لا توجد بيانات</p>}
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 font-extrabold">حالة الطلبات</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(ORDER_STATUS).map(([k, s]) => (
              <li key={k} className="flex items-center justify-between">
                <span className={`chip ${s.cls}`}>{s.label}</span>
                <span className="font-bold">{d.orders_by_status[k] || 0}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 font-extrabold">تنبيه المخزون</h2>
          {d.low_stock.length ? (
            <ul className="space-y-2 text-sm">
              {d.low_stock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <Link to={`/dashboard/products/${p.id}`} className="line-clamp-1 hover:underline">{p.name}</Link>
                  <span className={`chip ${p.stock === 0 ? 'bg-sale text-white' : 'bg-sale/10 text-sale'}`}>{p.stock}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">المخزون بحالة جيدة</p>}
        </div>
      </div>
    </div>
  )
}
