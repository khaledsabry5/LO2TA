import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Tag, Trash2, Edit3, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { CATEGORY_LABELS, GENDER_LABELS, money } from '../../lib/format'
import { PageLoader, EmptyState } from '../../components/ui'
import PriceTag from '../../components/PriceTag'

export default function ProductsAdmin() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [gender, setGender] = useState('')
  const [discountModal, setDiscountModal] = useState(null) // product object
  const [discountVal, setDiscountVal] = useState('')
  const [savingDiscount, setSavingDiscount] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await api.manageProducts({
        q: search || undefined,
        category: category || undefined,
        gender: gender || undefined,
        limit: 100,
      })
      setProducts(Array.isArray(data?.items) ? data.items : [])
      setTotal(data?.total || 0)
    } catch (err) {
      console.error(err)
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [category, gender])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadProducts()
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف المنتج "${name}"؟`)) return
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
      setTotal((t) => t - 1)
    } catch (err) {
      alert(err.message || 'فشل حذف المنتج')
    }
  }

  const handleApplyDiscount = async (e) => {
    e.preventDefault()
    if (!discountModal) return
    setSavingDiscount(true)
    try {
      const val = parseInt(discountVal, 10)
      if (val > 0) {
        await api.setDiscount(discountModal.id, val)
      } else {
        await api.removeDiscount(discountModal.id)
      }
      setDiscountModal(null)
      loadProducts()
    } catch (err) {
      alert(err.message || 'فشل تحديث الخصم')
    } finally {
      setSavingDiscount(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">إدارة المنتجات</h1>
          <p className="text-xs text-ink-muted sm:text-sm">إجمالي {total} منتج في المتجر</p>
        </div>
        <Link
          to="/dashboard/products/new"
          id="btn-add-product"
          className="btn-dark inline-flex items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة منتج جديد</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="card grid gap-3 p-4 sm:grid-cols-4 sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الوصف..."
            className="input pe-4 ps-9 text-sm"
          />
        </form>

        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input text-sm"
          >
            <option value="">جميع التصنيفات</option>
            <option value="shoes">الأحذية</option>
            <option value="bags">الشنط</option>
            <option value="watches">الساعات</option>
          </select>
        </div>

        <div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="input text-sm"
          >
            <option value="">جميع الأقسام</option>
            <option value="men">قسم الرجال</option>
            <option value="women">قسم النساء</option>
          </select>
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <PageLoader />
      ) : products.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="لا توجد منتجات مطابقة"
          text="جرّب تعديل معايير البحث أو الفلترة"
          action={
            <Link to="/dashboard/products/new" className="btn-dark text-sm">
              إضافة منتج الآن
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/40 text-xs font-bold text-ink">
                <tr>
                  <th className="p-3 text-start sm:p-4">المنتج</th>
                  <th className="p-3 text-start sm:p-4">التصنيف والنوع</th>
                  <th className="p-3 text-start sm:p-4">السعر والخصم</th>
                  <th className="p-3 text-start sm:p-4">المخزون</th>
                  <th className="p-3 text-start sm:p-4">الحالة</th>
                  <th className="p-3 text-end sm:p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {products.map((p) => {
                  const img = p.media?.find((m) => m.media_type === 'image')?.url
                  return (
                    <tr key={p.id} className="transition hover:bg-cream-50/60">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream-100 ring-1 ring-black/5">
                            {img ? (
                              <img src={img} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-ink-muted">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-ink line-clamp-1">{p.name}</p>
                            <p className="text-xs text-ink-muted">#{p.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-ink">{CATEGORY_LABELS[p.category]}</span>
                          <span className="text-xs text-ink-muted">{GENDER_LABELS[p.gender]}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <PriceTag product={p} size="sm" />
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`chip ${
                            p.stock === 0
                              ? 'bg-sale/10 text-sale font-extrabold'
                              : p.stock <= 5
                              ? 'bg-amber-100 text-amber-800 font-bold'
                              : 'bg-emerald-100 text-emerald-800 font-bold'
                          }`}
                        >
                          {p.stock} قطعة
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`chip ${
                            p.is_active ? 'bg-cream text-ink' : 'bg-black/10 text-ink-muted'
                          }`}
                        >
                          {p.is_active ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="p-3 text-end sm:p-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Discount button */}
                          <button
                            type="button"
                            title="تعديل الخصم"
                            onClick={() => {
                              setDiscountModal(p)
                              setDiscountVal(p.discount_percent || '')
                            }}
                            className={`rounded-lg p-2 transition ${
                              p.has_discount
                                ? 'bg-sale text-white hover:bg-sale-dark'
                                : 'bg-cream-100 text-ink hover:bg-cream'
                            }`}
                          >
                            <Tag className="h-4 w-4" />
                          </button>

                          {/* Edit button */}
                          <Link
                            to={`/dashboard/products/${p.id}`}
                            title="تعديل المنتج"
                            className="rounded-lg bg-cream-100 p-2 text-ink hover:bg-cream transition"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>

                          {/* Delete button */}
                          <button
                            type="button"
                            title="حذف المنتج"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="rounded-lg bg-sale/10 p-2 text-sale hover:bg-sale hover:text-white transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Discount Modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm space-y-4 p-5 animate-fade-up">
            <h3 className="text-base font-extrabold text-ink">
              إدارة الخصم: {discountModal.name}
            </h3>
            <p className="text-xs text-ink-muted">
              السعر الأصلي: {money(discountModal.price)}
            </p>

            <form onSubmit={handleApplyDiscount} className="space-y-4">
              <div>
                <label className="label">نسبة الخصم (%)</label>
                <div className="flex items-center gap-2">
                  <div className="grid h-11 w-12 shrink-0 place-items-center rounded-xl bg-sale text-white font-extrabold text-xs">
                    %{discountVal || 0}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    placeholder="مثال: 20 (أو 0 لإلغاء الخصم)"
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  أدخل 0 أو احفظ فارغاً لإلغاء الخصم كلياً
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDiscountModal(null)}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingDiscount}
                  className="btn-dark px-4 py-2 text-sm"
                >
                  {savingDiscount ? 'جاري الحفظ...' : 'حفظ الخصم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
