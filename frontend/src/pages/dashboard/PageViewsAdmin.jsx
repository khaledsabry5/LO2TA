import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, RefreshCw, BarChart2, TrendingUp, Compass, Globe, Home, Package, ExternalLink } from 'lucide-react'
import { api } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'
import './AdminTables.css'

export default function PageViewsAdmin() {
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await api.getPageViews()
      setViews(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load page views:', err)
      setViews([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredViews = views.filter((item) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.page_path && item.page_path.toLowerCase().includes(q))
    )
  })

  const totalPageViews = views.reduce((acc, curr) => acc + (curr.view_count || 0), 0)
  const uniquePagesCount = views.length
  const topViewedPage = views.length > 0 ? views[0] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">مشاهدات الصفحات</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-0.5 text-xs font-bold text-ink">
              <Eye className="h-3.5 w-3.5 text-ink-muted" />
              تتبع العملاء
            </span>
          </div>
          <p className="text-xs text-ink-muted sm:text-sm">
            إحصائيات زيارات العملاء الفعلية للصفحة الرئيسية وصفحات تفاصيل المنتجات (مستثنى منها زيارات الإدارة)
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition"
            title="تحديث البيانات الآن"
          >
            <RefreshCw className={`h-4 w-4 text-ink-muted ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو المسار..."
              className="input pr-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink-muted">إجمالي المشاهدات</p>
            <BarChart2 className="h-4 w-4 text-ink-muted" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {totalPageViews.toLocaleString('ar-EG')}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-ink-muted">مجموع زيارات العملاء الموثقة</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink-muted">الصفحات المتتبعة</p>
            <Compass className="h-4 w-4 text-ink-muted" />
          </div>
          <p className="mt-1 text-2xl font-extrabold text-ink">
            {uniquePagesCount.toLocaleString('ar-EG')}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-ink-muted">الرئيسية وصفحات المنتجات المعروضة</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink-muted">الأكثر مشاهدة</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-sm font-extrabold text-ink truncate" title={topViewedPage?.title || topViewedPage?.page_path || '-'}>
            {topViewedPage ? (topViewedPage.title || topViewedPage.page_path) : '-'}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-emerald-700 font-bold">
            {topViewedPage ? `${topViewedPage.view_count.toLocaleString('ar-EG')} زيارة` : 'لا توجد بيانات'}
          </p>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <PageLoader />
      ) : filteredViews.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={search ? 'لا توجد نتائج مطابقة للبحث' : 'سجل المشاهدات فارغ'}
          text={
            search
              ? 'جرّب البحث باسم منتج أو مسار آخر.'
              : 'لم تسجل أي زيارات بعد. ستظهر هنا فور تصفح العملاء للصفحة الرئيسية أو المنتجات.'
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream-50 text-xs text-ink-muted">
                <tr>
                  <th className="p-3 text-start font-bold sm:p-4">الصفحة / المنتج</th>
                  <th className="p-3 text-start font-bold sm:p-4">عدد الزيارات</th>
                  <th className="p-3 text-start font-bold sm:p-4">النسبة من الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredViews.map((item, idx) => {
                  const percent = totalPageViews > 0
                    ? ((item.view_count / totalPageViews) * 100).toFixed(1)
                    : 0

                  const isHome = item.page_path === '/'
                  const resolvedImg = item.image_url ? resolveMediaUrl(item.image_url) : null

                  return (
                    <tr
                      key={item.id || item.page_path}
                      className="transition-colors hover:bg-cream-50/60"
                    >
                      {/* Rich Page / Product Info Column */}
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sand-subtle text-[0.7rem] font-bold text-ink-muted">
                            {idx + 1}
                          </span>

                          {/* Thumbnail */}
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-cream-100 flex items-center justify-center">
                            {isHome ? (
                              <Home className="h-5 w-5 text-ink-muted" />
                            ) : resolvedImg ? (
                              <img
                                src={resolvedImg}
                                alt={item.title || 'صورة المنتج'}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-ink-muted" />
                            )}
                          </div>

                          {/* Title & Link */}
                          <div className="min-w-0">
                            <p className="font-extrabold text-ink sm:text-sm line-clamp-1 flex items-center gap-1.5">
                              <span>{item.title || (isHome ? 'الصفحة الرئيسية' : item.page_path)}</span>
                            </p>
                            <Link
                              to={item.page_path}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] font-mono text-ink-muted hover:text-ink hover:underline"
                              dir="ltr"
                            >
                              <span>{item.page_path}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* View Count */}
                      <td className="p-3 sm:p-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-xs font-extrabold text-ink">
                          <Eye className="h-3.5 w-3.5 text-ink-muted" />
                          <span>{item.view_count.toLocaleString('ar-EG')}</span>
                        </span>
                      </td>

                      {/* Percent / Progress Bar */}
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-sand-subtle sm:w-36">
                            <div
                              className="h-full rounded-full bg-ink transition-all"
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-ink-muted" dir="ltr">
                            {percent}%
                          </span>
                        </div>
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
