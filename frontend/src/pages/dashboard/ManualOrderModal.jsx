import { useEffect, useRef, useState } from 'react'
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
  ChevronDown,
  Check,
} from 'lucide-react'
import WhatsAppIcon from '../../components/icons/WhatsAppIcon'
import { api, tokenStore } from '../../lib/api'
import { money, resolveMediaUrl } from '../../lib/format'
import { Spinner } from '../../components/ui'

export default function ManualOrderModal({ isOpen, onClose, onSuccess }) {
  // Store all active products
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [fetchProductsError, setFetchProductsError] = useState('')

  // Rich Combobox State
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const comboboxRef = useRef(null)

  // Current Selection Stage
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectionError, setSelectionError] = useState('')

  // Locked Order Items List
  const [items, setItems] = useState([])

  // Shipping details (NO EMAIL FIELD per strict constraint)
  const [shippingName, setShippingName] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setComboboxOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Function to fetch and map products with fallback
  const loadStoreProducts = async (isCurrent) => {
    setLoadingProducts(true)
    setFetchProductsError('')
    try {
      let rawItems = []

      // 1. First attempt: Staff products endpoint (protected, carries auth headers automatically)
      const token = tokenStore.get()
      if (token) {
        try {
          const adminRes = await api.manageProducts({ limit: 200 })
          if (adminRes?.items && Array.isArray(adminRes.items) && adminRes.items.length > 0) {
            rawItems = adminRes.items
          } else if (Array.isArray(adminRes) && adminRes.length > 0) {
            rawItems = adminRes
          }
        } catch (adminErr) {
          console.warn('api.manageProducts failed, falling back to public catalog:', adminErr)
        }
      }

      // 2. Second attempt / Fallback: Public products catalog
      if (!rawItems || rawItems.length === 0) {
        const publicRes = await api.products({ limit: 100 })
        if (publicRes?.items && Array.isArray(publicRes.items)) {
          rawItems = publicRes.items
        } else if (Array.isArray(publicRes)) {
          rawItems = publicRes
        }
      }

      if (isCurrent && !isCurrent()) return

      // 3. Normalization and robust mapping:
      // Keep all items where is_active is not explicitly false (public endpoint doesn't return is_active field)
      const valid = (rawItems || []).filter(
        (p) => p && (p.is_active === undefined || p.is_active === null || Boolean(p.is_active))
      )

      const normalized = valid.map((p) => {
        // Resolve primary image / thumbnail
        const primaryImg =
          p.image_url ||
          (Array.isArray(p.media) && p.media.length > 0 ? p.media[0]?.url : null) ||
          null

        // Map sizes array
        const mappedSizes = Array.isArray(p.sizes)
          ? p.sizes.map((s) => ({
              id: s.id || s.size,
              size: s.size,
              stock: Number(s.stock ?? 0),
            }))
          : []

        // Calculate aggregate stock safely
        let stockNum = 0
        if (p.stock !== undefined && p.stock !== null) {
          stockNum = Number(p.stock) || 0
        } else if (mappedSizes.length > 0) {
          stockNum = mappedSizes.reduce((sum, s) => sum + s.stock, 0)
        } else if (p.in_stock) {
          stockNum = 10
        }

        // Map colors array
        const mappedColors = Array.isArray(p.colors)
          ? p.colors.map((c) => ({
              id: typeof c === 'object' ? (c.id || c.name) : c,
              name: typeof c === 'object' ? c.name : String(c),
              code: typeof c === 'object' ? c.code || null : null,
            }))
          : []

        // Resolve category
        const catObj =
          p.category && typeof p.category === 'object'
            ? p.category
            : Array.isArray(p.categories) && p.categories[0]
            ? p.categories[0]
            : { name: typeof p.category === 'string' ? p.category : 'عام' }

        return {
          id: p.id,
          name: p.name || `منتج #${p.id}`,
          description: p.description || '',
          price: Number(p.price || 0),
          final_price: Number(p.final_price || p.price || 0),
          cost_price: Number(p.cost_price || 0),
          discount_percent: Number(p.discount_percent || 0),
          has_discount: Boolean(p.has_discount || (p.discount_percent && p.discount_percent > 0)),
          stock: stockNum,
          in_stock: p.in_stock !== undefined ? Boolean(p.in_stock) : stockNum > 0,
          is_active: p.is_active === undefined ? true : Boolean(p.is_active),
          image_url: primaryImg,
          media:
            Array.isArray(p.media) && p.media.length > 0
              ? p.media
              : primaryImg
              ? [{ id: 0, url: primaryImg, media_type: 'image', sort_order: 0 }]
              : [],
          sizes: mappedSizes,
          colors: mappedColors,
          category: catObj,
        }
      })

      setProducts(normalized)
    } catch (err) {
      console.error('Failed to load products for manual order modal:', err)
      if (isCurrent && !isCurrent()) return
      setProducts([])
      setFetchProductsError('تعذر تحميل قائمة المنتجات من الخادم. يرجى التأكد من تشغيل الخادم والاتصال بالإنترنت.')
    } finally {
      if (!isCurrent || isCurrent()) {
        setLoadingProducts(false)
      }
    }
  }

  // Load active products on open
  useEffect(() => {
    if (!isOpen) return
    setFormError('')
    setSelectionError('')
    setFetchProductsError('')
    setItems([])
    setSelectedProduct(null)
    setSelectedColor('')
    setSelectedSize('')
    setQuantity(1)
    setShippingName('')
    setShippingPhone('')
    setShippingCity('')
    setShippingAddress('')
    setNotes('')
    setProductSearch('')
    setComboboxOpen(false)

    let active = true
    loadStoreProducts(() => active)

    return () => {
      active = false
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filter products by search text
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true
    const q = productSearch.trim().toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q))
    )
  })

  // When a product is picked from dropdown
  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod)
    setProductSearch('')
    setComboboxOpen(false)
    setSelectionError('')

    // Reset or auto-select variant defaults
    if (prod.colors && prod.colors.length === 1) {
      setSelectedColor(prod.colors[0].name)
    } else {
      setSelectedColor('')
    }

    if (prod.sizes && prod.sizes.length === 1) {
      setSelectedSize(String(prod.sizes[0].size))
    } else {
      setSelectedSize('')
    }

    setQuantity(1)
  }

  // Variant availability checks
  const hasMultipleColors = Boolean(selectedProduct?.colors && selectedProduct.colors.length > 1)
  const hasSingleColor = Boolean(selectedProduct?.colors && selectedProduct.colors.length === 1)
  const hasColors = Boolean(selectedProduct?.colors && selectedProduct.colors.length > 0)

  const hasMultipleSizes = Boolean(selectedProduct?.sizes && selectedProduct.sizes.length > 1)
  const hasSingleSize = Boolean(selectedProduct?.sizes && selectedProduct.sizes.length === 1)
  const hasSizes = Boolean(selectedProduct?.sizes && selectedProduct.sizes.length > 0)

  // Add currently selected product & variants to the locked order items list
  const handleAddToOrder = () => {
    setSelectionError('')
    if (!selectedProduct) {
      setSelectionError('يرجى اختيار منتج أولاً من القائمة.')
      return
    }

    if (hasMultipleColors && !selectedColor) {
      setSelectionError('يرجى اختيار لون المنتج المطلوب.')
      return
    }

    if (hasMultipleSizes && !selectedSize) {
      setSelectionError('يرجى اختيار مقاس المنتج المطلوب.')
      return
    }

    const qty = parseInt(quantity, 10) || 1
    if (qty < 1) {
      setSelectionError('الكمية يجب أن تكون 1 على الأقل.')
      return
    }

    // Check size stock if applicable
    if (hasSizes && selectedSize) {
      const chosenSizeNum = parseInt(selectedSize, 10)
      const sizeObj = selectedProduct.sizes.find((s) => s.size === chosenSizeNum)
      if (sizeObj && sizeObj.stock < qty) {
        setSelectionError(`الكمية المتاحة في المخزون من مقاس ${chosenSizeNum} هي ${sizeObj.stock} فقط.`)
        return
      }
    }

    // Check general stock
    if (selectedProduct.stock < qty) {
      setSelectionError(`الكمية المتاحة في المخزون من «${selectedProduct.name}» هي ${selectedProduct.stock} فقط.`)
      return
    }

    // Resolve color & size to save
    const finalColor = selectedColor || (hasSingleColor ? selectedProduct.colors[0].name : null)
    const finalSize = selectedSize
      ? parseInt(selectedSize, 10)
      : hasSingleSize
      ? parseInt(selectedProduct.sizes[0].size, 10)
      : null

    // Lock in to order items
    setItems((prev) => [
      ...prev,
      {
        product: selectedProduct,
        product_id: selectedProduct.id,
        quantity: qty,
        selected_size: finalSize,
        selected_color: finalColor,
      },
    ])

    // Reset selection box for the next item
    setSelectedProduct(null)
    setSelectedColor('')
    setSelectedSize('')
    setQuantity(1)
    setSelectionError('')
  }

  // Remove a locked item
  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  // Calculate total order amount
  const calculatedTotal = items.reduce((sum, it) => {
    const price = it.product ? Number(it.product.final_price || it.product.price || 0) : 0
    return sum + price * (Number(it.quantity) || 1)
  }, 0)

  // Submit manual order
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (items.length === 0) {
      setFormError('يرجى إضافة منتج واحد على الأقل للطلب بواسطة زر «+ إضافة للطلب».')
      return
    }

    if (!shippingName.trim() || shippingName.trim().split(/\s+/).length < 2) {
      setFormError('يرجى إدخال اسم العميل ثنائياً على الأقل.')
      return
    }

    if (!shippingPhone.trim()) {
      setFormError('يرجى إدخال رقم هاتف صحيح للتواصل.')
      return
    }

    if (!shippingCity.trim()) {
      setFormError('يرجى إدخال المدينة / المحافظة.')
      return
    }

    if (!shippingAddress.trim() || shippingAddress.trim().length < 3) {
      setFormError('يرجى إدخال العنوان بالتفصيل.')
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
      setFormError(err.message || 'حدث خطأ أثناء تسجيل الطلب. يرجى مراجعة البيانات والمخزون.')
    } finally {
      setSubmitting(false)
    }
  }

  // Selected product thumbnail
  const selectedProductImg = selectedProduct
    ? (selectedProduct.image_url
        ? resolveMediaUrl(selectedProduct.image_url)
        : selectedProduct.media && selectedProduct.media.length > 0
        ? resolveMediaUrl(selectedProduct.media[0].url)
        : null)
    : null

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
              <p className="text-xs text-ink-muted">تسجيل وتأكيد طلب خارجي مباشر مع خصم المخزون والمقاسات</p>
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
          {formError && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-sm font-bold text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: UPGRADED PRODUCT & VARIANT SELECTOR */}
          <div className="rounded-2xl border border-emerald-900/10 bg-emerald-50/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-emerald-700" />
                <span>1. اختيار وتخصيص المنتج</span>
              </label>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null)
                    setSelectedColor('')
                    setSelectedSize('')
                    setQuantity(1)
                  }}
                  className="text-[0.7rem] font-bold text-ink-muted hover:text-rose-600 transition"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {/* 1. Rich Searchable Combobox with Thumbnails */}
            <div className="relative" ref={comboboxRef}>
              <div
                onClick={() => setComboboxOpen((v) => !v)}
                className={`w-full cursor-pointer rounded-2xl border bg-white p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-sm transition hover:border-emerald-500 ${
                  comboboxOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-black/10'
                }`}
              >
                {loadingProducts ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 font-bold">
                    <Spinner size="sm" />
                    <span>جاري تحميل قائمة المنتجات من المتجر...</span>
                  </div>
                ) : selectedProduct ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-cream flex items-center justify-center">
                      {selectedProductImg ? (
                        <img src={selectedProductImg} alt={selectedProduct.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-ink-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs sm:text-sm text-ink truncate">{selectedProduct.name}</p>
                      <p className="text-[0.7rem] text-ink-muted">
                        المخزون: {selectedProduct.stock} قطعة · {money(selectedProduct.final_price || selectedProduct.price)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
                    <Search className="h-4 w-4 text-ink-muted" />
                    <span>انقر لاختيار منتج من القائمة أو ابحث باسمه...</span>
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-ink-muted transition-transform duration-200 ${comboboxOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {comboboxOpen && (
                <div className="absolute top-full mt-2 inset-x-0 z-40 max-h-64 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-2xl divide-y divide-black/5 animate-fade-in">
                  {/* Search input inside dropdown */}
                  <div className="sticky top-0 z-10 bg-white p-2 border-b border-black/5">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="اكتب اسم المنتج للفلترة السريعة..."
                        className="input pr-8 py-1.5 text-xs bg-cream-50/50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {loadingProducts ? (
                    <div className="p-6 text-center text-xs text-ink-muted flex flex-col items-center justify-center gap-2">
                      <Spinner size="md" />
                      <span className="font-bold text-ink">جاري تحميل المنتجات من الخادم...</span>
                    </div>
                  ) : fetchProductsError ? (
                    <div className="p-5 text-center text-xs space-y-2.5">
                      <p className="font-bold text-rose-600">{fetchProductsError}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          loadStoreProducts()
                        }}
                        className="btn bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs py-1.5 px-3 rounded-xl font-bold shadow-xs transition"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-muted">
                      {productSearch ? 'لا توجد منتجات مطابقة للبحث' : 'لا توجد منتجات متاحة في المتجر حالياً'}
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const img = p.image_url
                        ? resolveMediaUrl(p.image_url)
                        : p.media && p.media.length > 0
                        ? resolveMediaUrl(p.media[0].url)
                        : null
                      const isSelected = selectedProduct?.id === p.id

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`w-full flex items-center justify-between p-2.5 sm:p-3 text-start cursor-pointer hover:bg-emerald-50/70 transition ${
                            isSelected ? 'bg-emerald-50' : ''
                          }`}
                        >
                          {/* Thumbnail & Title */}
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

                          {/* Price & Selection tick */}
                          <div className="text-end shrink-0 flex items-center gap-2">
                            <div>
                              <span className="font-extrabold text-xs sm:text-sm text-emerald-800">
                                {money(p.final_price || p.price)}
                              </span>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* 2. Dynamic Variant Options (Only visible when multiple colors or sizes exist) */}
            {selectedProduct && (
              <div className="space-y-3 pt-3 border-t border-emerald-900/10 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dynamic Color Selector (Only if multiple colors exist) */}
                  {hasMultipleColors ? (
                    <div>
                      <label className="block text-xs font-bold text-ink-muted mb-1.5">
                        اختر اللون <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.colors.map((c) => {
                          const active = selectedColor === c.name
                          return (
                            <button
                              key={c.id || c.name}
                              type="button"
                              onClick={() => setSelectedColor(c.name)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                                active
                                  ? 'bg-ink text-white border-ink shadow-sm'
                                  : 'bg-white text-ink border-black/15 hover:border-black/40'
                              }`}
                            >
                              {c.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : hasSingleColor ? (
                    <div className="flex items-center gap-2 text-xs text-ink-muted bg-white/70 border border-black/5 rounded-xl p-2.5">
                      <span className="font-bold">اللون:</span>
                      <span className="font-extrabold text-ink">{selectedProduct.colors[0].name} (افتراضي)</span>
                    </div>
                  ) : null}

                  {/* Dynamic Size Selector (Only if multiple sizes exist) */}
                  {hasMultipleSizes ? (
                    <div>
                      <label className="block text-xs font-bold text-ink-muted mb-1.5">
                        اختر المقاس <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProduct.sizes.map((s) => {
                          const active = selectedSize === String(s.size)
                          const outOfStock = s.stock <= 0
                          return (
                            <button
                              key={s.id || s.size}
                              type="button"
                              disabled={outOfStock}
                              onClick={() => setSelectedSize(String(s.size))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                                active
                                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                  : outOfStock
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                  : 'bg-white text-ink border-black/15 hover:border-black/40'
                              }`}
                            >
                              مقاس {s.size} ({outOfStock ? 'نفد' : s.stock})
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : hasSingleSize ? (
                    <div className="flex items-center gap-2 text-xs text-ink-muted bg-white/70 border border-black/5 rounded-xl p-2.5">
                      <span className="font-bold">المقاس:</span>
                      <span className="font-extrabold text-ink">
                        مقاس {selectedProduct.sizes[0].size} ({selectedProduct.sizes[0].stock} قطعة)
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* 3. Quantity & "Add to Order" Button */}
                <div className="flex items-end gap-3 pt-2">
                  <div className="w-28 shrink-0">
                    <label className="block text-xs font-bold text-ink-muted mb-1">الكمية</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.stock || 50}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="input text-xs font-extrabold text-center py-2 bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToOrder}
                    className="btn flex-1 flex items-center justify-center gap-1.5 bg-ink hover:bg-black text-white px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl shadow-sm transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>إضافة إلى الطلب (+ Add to Order)</span>
                  </button>
                </div>

                {selectionError && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1 pt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{selectionError}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Locked Order Items List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-ink">المنتجات المضافة للطلب:</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'عنصر' : 'عناصر'}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-sand-subtle/30 p-4 text-center text-xs text-ink-muted">
                لم يتم إضافة أي منتج بعد. اختر منتجاً من الصندوق أعلاه واضغط على «إضافة إلى الطلب».
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => {
                  const p = it.product
                  const img = p.image_url
                    ? resolveMediaUrl(p.image_url)
                    : p.media && p.media.length > 0
                    ? resolveMediaUrl(p.media[0].url)
                    : null
                  const itemTotal = Number(p.final_price || p.price || 0) * (it.quantity || 1)

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-black/10 bg-white hover:border-black/20 shadow-xs transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-cream flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-ink-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs sm:text-sm text-ink truncate">{p.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[0.72rem] text-ink-muted">
                            <span className="font-extrabold text-ink">الكمية: {it.quantity}</span>
                            {it.selected_size && (
                              <span className="chip bg-cream text-[0.68rem] px-2 py-0.5 font-bold">
                                مقاس: {it.selected_size}
                              </span>
                            )}
                            {it.selected_color && (
                              <span className="chip bg-cream text-[0.68rem] px-2 py-0.5 font-bold">
                                اللون: {it.selected_color}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-end">
                          <span className="font-extrabold text-xs sm:text-sm text-emerald-900 block">
                            {money(itemTotal)}
                          </span>
                          <span className="text-[0.65rem] text-ink-muted">
                            ({money(p.final_price || p.price)} للقطعة)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="إزالة هذا العنصر من الطلب"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Subtotal Preview Bar */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-xs sm:text-sm font-bold text-emerald-950">
                    إجمالي المنتجات المضافة في هذا الطلب:
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-900">
                    {money(calculatedTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Shipping & Customer Details (NO EMAIL) */}
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
              className="btn flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs sm:text-sm font-extrabold shadow-sm transition"
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
