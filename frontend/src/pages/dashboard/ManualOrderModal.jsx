import { useEffect, useState } from 'react'
import {
  X,
  Search,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Building,
  FileText,
} from 'lucide-react'
import WhatsAppIcon from '../../components/icons/WhatsAppIcon'
import { api } from '../../lib/api'
import { money, resolveMediaUrl } from '../../lib/format'
import { Spinner } from '../../components/ui'

export default function ManualOrderModal({ isOpen, onClose, onSuccess }) {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Order Items
  const [items, setItems] = useState([])

  // Shipping details (NO EMAIL FIELD per strict constraint)
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load active products on open
  useEffect(() => {
    if (!isOpen) return
    setError('')
    setItems([])
    setShippingName('')
    setShippingPhone('')
    setShippingCity('')
    setShippingAddress('')
    setNotes('')
    setProductSearch('')

    let active = true
    setLoadingProducts(true)
    api
      .products({ limit: 100 })
      .then((res) => {
        if (!active) return
        const list = res?.items || (Array.isArray(res) ? res : [])
        setProducts(list.filter((p) => p.is_active))
      })
      .catch((err) => {
        console.error('Failed to load products for manual order modal:', err)
      })
      .finally(() => {
        if (active) setLoadingProducts(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filtered products list for dropdown/selector
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true
    const q = productSearch.trim().toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q))
    )
  })

  // Add a product item to the order
  const handleAddProduct = (prod) => {
    // Determine default size and color if available
    const defaultSize = prod.sizes && prod.sizes.length > 0 ? prod.sizes[0].size : null
    const defaultColor = prod.colors && prod.colors.length > 0 ? prod.colors[0].name : null

    setItems((prev) => [
      ...prev,
      {
        product: prod,
        product_id: prod.id,
        quantity: 1,
        selected_size: defaultSize,
        selected_color: defaultColor,
      },
    ])
  }

  // Remove an item row
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Update item field (quantity, size, color)
  const handleUpdateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it
        return { ...it, [field]: value }
      })
    )
  }

  // Compute calculated subtotal
  const calculatedTotal = items.reduce((sum, it) => {
    const price = it.product ? Number(it.product.final_price || it.product.price || 0) : 0
    return sum + price * (Number(it.quantity) || 1)
  }, 0)

  // Submit manual order
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (items.length === 0) {
      setError('يرجى اختيار منتج واحد على الأقل لإتمام الطلب.')
      return
    }

    // Validate quantities and sizes
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.quantity || it.quantity < 1) {
        setError(`يرجى تحديد كمية صحيحة للمنتج «${it.product.name}».`)
        return
      }
      if (it.product.sizes && it.product.sizes.length > 0 && !it.selected_size) {
        setError(`يرجى اختيار المقاس المطلوب للمنتج «${it.product.name}».`)
        return
      }
    }

    if (!shippingName.trim() || shippingName.trim().split(/\s+/).length < 2) {
      setError('يرجى إدخال اسم العميل ثنائياً على الأقل.')
      return
    }

    if (!shippingPhone.trim()) {
      setError('يرجى إدخال رقم هاتف صحيح للتواصل.')
      return
    }

    if (!shippingCity.trim()) {
      setError('يرجى إدخال المدينة / المحافظة.')
      return
    }

    if (!shippingAddress.trim() || shippingAddress.trim().length < 3) {
      setError('يرجى إدخال العنوان بالتفصيل.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: parseInt(it.quantity, 10),
          selected_size: it.selected_size ? parseInt(it.selected_size, 10) : null,
          selected_color: it.selected_color || null,
        })),
        shipping_name: shippingName.trim(),
        shipping_phone: shippingPhone.trim(),
        shipping_city: shippingCity.trim(),
        shipping_address: shippingAddress.trim(),
        notes: notes.trim() ? `[طلب واتساب / يدوي] ${notes.trim()}` : '[طلب واتساب / يدوي]',
      }

      const createdOrder = await api.createManualOrder(payload)
      onSuccess?.(createdOrder)
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message || 'حدث خطأ أثناء تسجيل الطلب. يرجى مراجعة البيانات والمخزون.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col text-ink text-start"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-black/5 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <WhatsAppIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold sm:text-lg">إضافة طلب واتساب / يدوي</h2>
              <p className="text-xs text-ink-muted">تسجيل طلب خارجي مباشر دون إنشاء حساب عميل مع خصم المخزون</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-ink-muted hover:bg-black/5 hover:text-ink transition"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm font-bold text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Product Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-ink flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-emerald-700" />
                <span>1. اختيار المنتجات المطلوبة</span>
              </label>
              <span className="text-xs font-bold text-ink-muted">
                {items.length} {items.length === 1 ? 'منتج مضاف' : 'منتجات مضافة'}
              </span>
            </div>

            {/* Product Search & Dropdown Picker */}
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث عن منتج بالاسم لإضافته للطلب..."
                className="input pr-10 text-xs sm:text-sm"
              />

              {productSearch.trim() && (
                <div className="absolute top-full mt-1.5 inset-x-0 z-30 max-h-56 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl divide-y divide-black/5">
                  {loadingProducts ? (
                    <div className="p-4 text-center text-xs text-ink-muted">جاري تحميل المنتجات...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-ink-muted">لا توجد منتجات مطابقة للبحث</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const firstMedia = p.media && p.media.length > 0 ? p.media[0] : null
                      const img = firstMedia ? resolveMediaUrl(firstMedia.url) : null
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            handleAddProduct(p)
                            setProductSearch('')
                          }}
                          className="w-full flex items-center justify-between p-2.5 sm:p-3 text-start hover:bg-cream-50 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-cream flex items-center justify-center">
                              {img ? (
                                <img src={img} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-ink-muted" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-xs sm:text-sm text-ink truncate">{p.name}</p>
                              <p className="text-[0.7rem] text-ink-muted">
                                المخزون: {p.stock} قطعة · {p.category?.name || 'عام'}
                              </p>
                            </div>
                          </div>
                          <div className="text-end shrink-0">
                            <span className="font-extrabold text-xs sm:text-sm text-emerald-800">
                              {money(p.final_price || p.price)}
                            </span>
                            <span className="block text-[0.65rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                              + إضافة
                            </span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Items List */}
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-sand-subtle/40 p-5 text-center text-xs text-ink-muted">
                ابحث في الحقل أعلاه لاختيار المنتجات ومقاساتها وألوانها
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((it, idx) => {
                  const p = it.product
                  const firstMedia = p.media && p.media.length > 0 ? p.media[0] : null
                  const img = firstMedia ? resolveMediaUrl(firstMedia.url) : null
                  const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0
                  const hasColors = Array.isArray(p.colors) && p.colors.length > 0

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-black/10 bg-cream-50/60 p-3 sm:p-4 space-y-2.5 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-cream flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-ink-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs sm:text-sm text-ink truncate">{p.name}</p>
                            <p className="text-xs font-bold text-emerald-800">
                              {money(p.final_price || p.price)} للقطعة
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                          title="إزالة المنتج"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Variant and Quantity controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-black/5 text-xs">
                        {/* Size Selector */}
                        {hasSizes ? (
                          <div>
                            <label className="block text-[0.7rem] font-bold text-ink-muted mb-1">المقاس</label>
                            <select
                              value={it.selected_size || ''}
                              onChange={(e) => handleUpdateItem(idx, 'selected_size', e.target.value)}
                              className="input py-1.5 px-2 text-xs font-bold"
                              required
                            >
                              <option value="">اختر المقاس...</option>
                              {p.sizes.map((s) => (
                                <option key={s.id || s.size} value={s.size} disabled={s.stock <= 0}>
                                  مقاس {s.size} ({s.stock > 0 ? `متبقي ${s.stock}` : 'نفد'})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="hidden sm:block" />
                        )}

                        {/* Color Selector */}
                        {hasColors ? (
                          <div>
                            <label className="block text-[0.7rem] font-bold text-ink-muted mb-1">اللون</label>
                            <select
                              value={it.selected_color || ''}
                              onChange={(e) => handleUpdateItem(idx, 'selected_color', e.target.value)}
                              className="input py-1.5 px-2 text-xs font-bold"
                            >
                              <option value="">بدون تحديد</option>
                              {p.colors.map((c) => (
                                <option key={c.id || c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="hidden sm:block" />
                        )}

                        {/* Quantity Input */}
                        <div>
                          <label className="block text-[0.7rem] font-bold text-ink-muted mb-1">الكمية</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="input py-1.5 px-2 text-xs font-bold text-center"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Subtotal preview */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-950">إجمالي قيمة المنتجات المحددة:</span>
                  <span className="text-base font-extrabold text-emerald-900">{money(calculatedTotal)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Shipping & Customer Details (NO EMAIL) */}
          <div className="space-y-3 pt-4 border-t border-black/10">
            <label className="text-xs font-extrabold text-ink flex items-center gap-1.5">
              <User className="h-4 w-4 text-emerald-700" />
              <span>2. بيانات العميل والشحن (بدون بريد إلكتروني)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  اسم العميل (ثنائي على الأقل) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="input pr-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  رقم الهاتف (واتساب / اتصال) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                  <input
                    type="tel"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="مثال: 01012345678"
                    className="input pr-9 text-xs sm:text-sm"
                    dir="ltr"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  المحافظة / المدينة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="مثال: القاهرة، الجيزة، الإسكندرية..."
                    className="input pr-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted mb-1">
                  العنوان بالتفصيل <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="الشارع، رقم العمارة، رقم الشقة أو علامة مميزة"
                    className="input pr-9 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-muted mb-1">ملاحظات الطلب (اختياري)</label>
              <div className="relative">
                <FileText className="absolute right-3 top-3 h-4 w-4 text-ink-muted pointer-events-none" />
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بالعميل أو شركة الشحن..."
                  className="input pr-9 text-xs sm:text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer / Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-outline px-4 py-2 text-xs sm:text-sm font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="btn flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs sm:text-sm font-extrabold shadow-sm"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  <span>جاري تسجيل الطلب...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تأكيد وتسجيل طلب واتساب ({money(calculatedTotal)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
