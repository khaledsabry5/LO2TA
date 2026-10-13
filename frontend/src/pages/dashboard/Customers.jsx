import { useEffect, useState } from 'react'
import { Search, Users, Mail, Phone, ShoppingBag, Eye, Calendar, Package, Trash2, AlertTriangle } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState, Alert, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Customers() {
  const { isManager, isAdmin } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [success, setSuccess] = useState('')

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await api.customers({ q: search || undefined, limit: 100 })
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadCustomers()
  }

  const openCustomerDetail = async (userId) => {
    setLoadingDetail(true)
    try {
      const detail = await api.customer(userId)
      setSelectedUser(detail)
    } catch (err) {
      alert(err.message || 'فشل جلب تفاصيل العميل')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!deleteModal) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.deleteUser(deleteModal.id)
      setCustomers((prev) => prev.filter((c) => c.id !== deleteModal.id))
      setSuccess(`تم حذف حساب العميل "${deleteModal.full_name}" بنجاح`)
      setDeleteModal(null)
    } catch (err) {
      setDeleteError(err.message || 'فشل حذف العميل')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
          بيانات العملاء (حصري للمدير)
        </h1>
        <p className="text-xs text-ink-muted sm:text-sm">
          عرض بيانات العملاء الشخصية، المشتريات، وإجمالي الإنفاق
        </p>
      </div>

      {success && <Alert tone="success">{success}</Alert>}

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="card max-w-md p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، البريد أو رقم الجوال..."
            className="input pe-4 ps-9 text-sm"
          />
        </div>
      </form>

      {/* Customers List */}
      {loading ? (
        <PageLoader />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء مسجلون بعد"
          text="عندما يقوم العملاء بإنشاء حسابات أو الشراء، ستظهر بياناتهم هنا"
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive admin-table-scroll-wrapper">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/40 text-xs font-bold text-ink">
                <tr>
                  <th className="p-3 text-start sm:p-4">العميل</th>
                  <th className="p-3 text-start sm:p-4">بيانات الاتصال</th>
                  <th className="p-3 text-start sm:p-4">عدد الطلبات</th>
                  <th className="p-3 text-start sm:p-4">إجمالي الإنفاق</th>
                  <th className="p-3 text-start sm:p-4">تاريخ التسجيل</th>
                  <th className="p-3 text-end sm:p-4">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {customers.map((c) => (
                  <tr key={c.id} className="transition hover:bg-cream-50/60">
                    <td className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream font-extrabold text-ink">
                          {c.full_name[0]}
                        </span>
                        <div>
                          <p className="font-extrabold text-ink">{c.full_name}</p>
                          <p className="text-xs text-ink-muted">معرف: #{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 sm:p-4 text-xs">
                      <p className="flex items-center gap-1.5 text-ink">
                        <Mail className="h-3.5 w-3.5 text-ink-muted" />
                        <span dir="ltr">{c.email}</span>
                      </p>
                      {c.phone && (
                        <p className="mt-1 flex items-center gap-1.5 text-ink-muted">
                          <Phone className="h-3.5 w-3.5" />
                          <span dir="ltr">{c.phone}</span>
                        </p>
                      )}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className="chip bg-cream text-ink font-bold">
                        {c.orders_count} طلبات
                      </span>
                    </td>
                    <td className="p-3 sm:p-4 font-extrabold text-ink">
                      {money(c.total_spent)}
                    </td>
                    <td className="p-3 sm:p-4 text-xs text-ink-muted">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="p-3 text-end sm:p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openCustomerDetail(c.id)}
                          className="table-action-btn bg-cream-100 text-ink hover:bg-cream transition"
                          title="عرض الملف وسجل الطلبات"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(isManager || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModal(c)
                              setDeleteError('')
                            }}
                            className="table-action-btn bg-sale/10 text-sale hover:bg-sale hover:text-white transition"
                            title={`حذف حساب ${c.full_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 space-y-5 animate-fade-up">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-ink">
                  ملف العميل: {selectedUser.full_name}
                </h2>
                <p className="text-xs text-ink-muted">
                  مسجل منذ {formatDate(selectedUser.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-ink-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl bg-cream-50 p-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-ink-muted">البريد الإلكتروني:</span>
                <p className="font-bold text-ink mt-0.5" dir="ltr">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-ink-muted">رقم الهاتف:</span>
                <p className="font-bold text-ink mt-0.5" dir="ltr">{selectedUser.phone || 'غير مسجل'}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-extrabold text-ink">
                سجل طلبات العميل ({selectedUser.orders?.length || 0})
              </h3>
              {selectedUser.orders?.length === 0 ? (
                <p className="rounded-xl border border-dashed border-black/10 p-4 text-center text-xs text-ink-muted">
                  لا توجد طلبات سابقة لهذا العميل
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedUser.orders.map((ord) => (
                    <div key={ord.id} className="rounded-xl border border-black/5 bg-white p-3 text-xs">
                      <div className="flex items-center justify-between font-bold border-b border-black/5 pb-2">
                        <span>طلب #{ord.id} ({formatDate(ord.created_at)})</span>
                        <span className="font-extrabold">{money(ord.total)}</span>
                      </div>
                      <p className="mt-2 text-ink-muted">
                        العنوان: {ord.shipping_city} — {ord.shipping_address}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {ord.items.map((it) => (
                          <li key={it.id} className="flex justify-between text-ink-muted">
                            <span>• {it.product_name} × {it.quantity}</span>
                            <span>{money(it.line_total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="btn-dark px-6 py-2 text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md space-y-4 p-6 animate-fade-up shadow-2xl border-sale/20">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sale/10 text-sale">
                <Trash2 className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold text-ink">
                  تأكيد حذف حساب العميل
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  هل أنت متأكد من رغبتك في حذف هذا الحساب وجميع البيانات المرتبطة به؟
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setDeleteModal(null)
                    setDeleteError('')
                  }
                }}
                disabled={deleting}
                className="text-ink-muted hover:text-ink text-sm font-bold p-1"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-black/10 bg-cream/30 p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">الاسم:</span>
                <span className="font-extrabold text-ink">{deleteModal.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">البريد الإلكتروني:</span>
                <span className="font-mono text-ink">{deleteModal.email}</span>
              </div>
              {deleteModal.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted">رقم الهاتف:</span>
                  <span className="font-mono text-ink" dir="ltr">{deleteModal.phone}</span>
                </div>
              )}
            </div>

            {deleteError && <Alert>{deleteError}</Alert>}

            <div className="rounded-xl bg-sale/5 border border-sale/20 p-3 text-xs text-sale font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-sale" />
              <span>تحذير: سيتم حذف بيانات تسجيل دخول العميل وفصل حساباته نهائياً.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={() => {
                  setDeleteModal(null)
                  setDeleteError('')
                }}
                disabled={deleting}
                className="btn-outline px-4 py-2 text-sm"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={deleting}
                className="btn bg-sale text-white hover:bg-sale-dark px-5 py-2 text-sm font-bold flex items-center gap-2 shadow-sm"
              >
                {deleting ? (
                  <Spinner />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
