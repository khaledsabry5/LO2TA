import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  DollarSign,
  Edit3,
  Plus,
  Receipt,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate, money } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'

export default function ExpensesAdmin({ isModal = false, onClose, onExpensesUpdated }) {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Form state
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    amount: '',
    description: '',
  })

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

  const loadExpenses = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getExpenses({ limit: 500 })
      const items = Array.isArray(res?.items) ? res.items : []
      setExpenses(items)
      const total = typeof res?.total_amount !== 'undefined' ? parseFloat(res.total_amount) : 0
      setTotalAmount(total)
      if (onExpensesUpdated) {
        onExpensesUpdated(total, items.length)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'تعذر تحميل سجل المصروفات والخصومات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm({ amount: '', description: '' })
  }

  const handleEditClick = (exp) => {
    setEditingId(exp.id)
    setForm({
      amount: String(exp.amount),
      description: exp.description || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const parsedAmount = parseFloat(form.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر')
      return
    }

    if (!form.description.trim()) {
      setError('يرجى كتابة بيان المصروف أو الغرض منه')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await api.updateExpense(editingId, {
          amount: parsedAmount,
          description: form.description.trim(),
        })
        setSuccessMsg('تم تحديث بيانات المصروف بنجاح')
      } else {
        await api.createExpense({
          amount: parsedAmount,
          description: form.description.trim(),
        })
        setSuccessMsg('تمت إضافة المصروف بنجاح')
      }
      resetForm()
      await loadExpenses()
      setTimeout(() => setSuccessMsg(null), 3500)
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ المصروف')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`هل أنت متأكد من حذف هذا السجل (#${id})؟`)) return
    try {
      await api.deleteExpense(id)
      if (editingId === id) resetForm()
      await loadExpenses()
    } catch (err) {
      alert(err.message || 'تعذر حذف المصروف')
    }
  }

  const handleClearAll = async () => {
    if (
      !window.confirm(
        'تحذير هام: هل أنت متأكد من مسح جميع سجلات المصروفات والخصومات نهائياً؟ سيتم تصفير العداد لتبدأ السجلات الجديدة من الرقم 1.'
      )
    ) {
      return
    }
    setLoading(true)
    try {
      await api.clearAllExpenses()
      resetForm()
      await loadExpenses()
    } catch (err) {
      alert(err.message || 'تعذر مسح السجل')
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      exp.description?.toLowerCase().includes(q) ||
      String(exp.id).includes(q) ||
      String(exp.amount).includes(q)
    )
  })

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!isModal && (
            <Link
              to="/dashboard/sales"
              className="btn-outline flex h-9 w-9 items-center justify-center rounded-xl p-0"
              title="العودة لسجل المبيعات"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
              المصروفات والخصومات الأخرى
            </h1>
            <p className="mt-0.5 text-xs text-ink-muted">
              إدارة وتسجيل كافة النفقات والتكاليف التشغيلية والخصومات المستقلة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="btn-danger flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
              title="مسح كافة سجلات المصروفات"
            >
              <Trash2 className="h-4 w-4" />
              <span>مسح السجل بالكامل</span>
            </button>
          )}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex h-9 w-9 items-center justify-center rounded-xl p-0"
              title="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="card p-4 bg-gradient-to-br from-amber-500/10 via-cream to-amber-100/40 border border-amber-200/80">
          <p className="text-xs font-bold text-amber-900">إجمالي المصروفات والخصومات</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-900 sm:text-3xl">
            {money(totalAmount)}
          </p>
          <p className="mt-1 text-[0.7rem] text-amber-800/80">
            مجموع كافة النفقات المسجلة حتى الآن
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-muted">عدد السجلات المقيدة</p>
          <p className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            {expenses.length} سجل
          </p>
          <p className="mt-1 text-[0.7rem] text-ink-muted">
            إجمالي العمليات الموثقة بالنظام
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="rounded-xl border border-sale/20 bg-sale/10 p-3 text-xs text-sale flex items-center gap-2 font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 flex items-center gap-2 font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Expense Form */}
      <div className="card p-4 sm:p-6 border border-black/10 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-ink sm:text-base">
                {editingId ? `تعديل المصروف #${editingId}` : 'تسجيل مصروف أو خصم جديد'}
              </h2>
              <p className="text-[0.7rem] text-ink-muted">
                أدخل المبلغ وبيان الصرف لإضافته إلى الحسابات
              </p>
            </div>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-ink-muted hover:text-ink underline"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Amount input */}
            <div>
              <label className="label" htmlFor="expense-amount">
                المبلغ (ج.م) <span className="text-sale font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="مثال: 350"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input font-mono font-bold text-base pe-10"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-bold text-ink-muted">
                  ج.م
                </span>
              </div>
            </div>

            {/* Description input */}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="expense-desc">
                بيان المصروف أو الغرض منه <span className="text-sale font-bold">*</span>
              </label>
              <input
                id="expense-desc"
                type="text"
                required
                maxLength={500}
                placeholder="مثال: رسوم شحن إضافية، تغليف كراتين، حملة إعلانات تيك توك، خصم تسوية عميل..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="input text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-outline px-4 py-2 text-xs font-bold"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn-dark px-6 py-2.5 text-xs font-bold flex items-center gap-2"
            >
              {submitting ? (
                <span>جاري الحفظ...</span>
              ) : editingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>حفظ التعديلات</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>إضافة المصروف</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Expense History Log */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-ink-muted" />
            <h2 className="text-base font-extrabold text-ink">
              سجل النفقات والخصومات ({expenses.length})
            </h2>
          </div>

          {expenses.length > 3 && (
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="بحث في البيان أو المبلغ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input py-1.5 text-xs"
              />
            </div>
          )}
        </div>

        {loading ? (
          <PageLoader />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'سجل المصروفات فارغ'}
            text={
              searchQuery
                ? 'جرّب البحث بكلمة أو مبلغ آخر.'
                : 'لم يتم تسجيل أي مصروفات أو خصومات إضافية بعد. استخدم النموذج بالأعلى لإضافة أول عملية.'
            }
          />
        ) : (
          <div className="card overflow-hidden border border-black/10">
            <div className="overflow-x-auto">
              <table className="w-full text-end text-sm">
                <thead>
                  <tr className="border-b border-black/10 bg-cream/50 text-xs font-bold text-ink-muted">
                    <th className="p-3 text-start sm:p-4">#</th>
                    <th className="p-3 text-start sm:p-4">التاريخ والوقت</th>
                    <th className="p-3 text-start sm:p-4">بيان المصروف / الغرض</th>
                    <th className="p-3 text-start sm:p-4">المبلغ</th>
                    <th className="p-3 text-end sm:p-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className={`transition ${
                        editingId === exp.id
                          ? 'bg-amber-50/80 font-medium'
                          : 'hover:bg-cream-50/60'
                      }`}
                    >
                      <td className="p-3 sm:p-4">
                        <span className="font-mono font-bold text-xs text-ink-muted">
                          #{exp.id}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-xs text-ink-muted whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-ink-muted/70" />
                          <span>{formatDate(exp.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <p className="font-bold text-ink text-sm max-w-md break-words">
                          {exp.description}
                        </p>
                      </td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">
                        <span className="font-extrabold text-amber-800 text-base">
                          {money(exp.amount)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(exp)}
                            className="btn-outline flex h-8 w-8 items-center justify-center rounded-lg p-0 text-ink hover:text-ink hover:border-black"
                            title="تعديل هذا المصروف"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(exp.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sale hover:bg-sale/10 transition"
                            title="حذف هذا المصروف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-black/10 my-auto">
          {content}
        </div>
      </div>
    )
  }

  return content
}
