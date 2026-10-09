import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowRight, Upload, X, Trash2, Film, Image as ImageIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, Alert, PageLoader } from '../../components/ui'
import { money } from '../../lib/format'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    description: '',
    gender: 'men',
    category: 'shoes',
    price: '',
    stock: '10',
    discount_percent: '0',
    is_active: true,
  })

  const [existingMedia, setExistingMedia] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      api
        .manageProduct(id)
        .then((p) => {
          setForm({
            name: p.name,
            description: p.description || '',
            gender: p.gender,
            category: p.category,
            price: String(p.price),
            stock: String(p.stock),
            discount_percent: String(p.discount_percent || 0),
            is_active: p.is_active,
          })
          setExistingMedia(p.media || [])
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [id, isEdit])

  const setField = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [k]: val }))
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return
    try {
      await api.deleteMedia(id, mediaId)
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId))
    } catch (err) {
      alert(err.message || 'فشل حذف الملف')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description ? form.description.trim() : null,
        gender: form.gender,
        category: form.category,
        price: parseFloat(form.price),
        stock: parseInt(form.stock, 10),
        discount_percent: parseInt(form.discount_percent || 0, 10),
        is_active: Boolean(form.is_active),
      }

      let productId = id
      if (isEdit) {
        await api.updateProduct(id, payload)
      } else {
        const created = await api.createProduct(payload)
        productId = created.id
      }

      // Upload files if any selected
      if (selectedFiles.length > 0) {
        await api.uploadMedia(productId, selectedFiles)
      }

      navigate('/dashboard/products')
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء حفظ المنتج')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const finalPricePreview = () => {
    const p = parseFloat(form.price) || 0
    const d = parseInt(form.discount_percent || 0, 10)
    if (d <= 0) return money(p)
    return money(p * (1 - d / 100))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Top navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/products"
          className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-cream-100 transition"
        >
          <ArrowRight className="h-5 w-5 rotate-180" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            {isEdit ? 'تعديل المنتج' : 'إضافة منتج'}
          </h1>
          <p className="text-xs text-ink-muted">
            {isEdit ? `تعديل بيانات المنتج #${id}` : 'أدخل مواصفات المنتج الجديد وتفاصيل العرض'}
          </p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Main Form styled closely after reference mockup */}
      <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8">
        {/* Name */}
        <div>
          <label className="label" htmlFor="prod-name">اسم المنتج</label>
          <input
            id="prod-name"
            required
            placeholder="مثال: حذاء رياضي عصري / حقيبة جلد أنيقة"
            value={form.name}
            onChange={setField('name')}
            className="input text-base font-bold"
          />
        </div>

        {/* 1. Gender Selection (الجنس) - Prominent selector matching design */}
        <div>
          <label className="label">الجنس</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, gender: 'men' }))}
              className={`rounded-xl border py-3.5 text-center text-sm font-extrabold transition ${
                form.gender === 'men'
                  ? 'border-ink bg-ink text-white shadow-sm'
                  : 'border-black/10 bg-white text-ink hover:bg-cream-100'
              }`}
            >
              رجال
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, gender: 'women' }))}
              className={`rounded-xl border py-3.5 text-center text-sm font-extrabold transition ${
                form.gender === 'women'
                  ? 'border-ink bg-ink text-white shadow-sm'
                  : 'border-black/10 bg-white text-ink hover:bg-cream-100'
              }`}
            >
              نساء
            </button>
          </div>
        </div>

        {/* 2. Category Selection (نوع الفئة) - 3 categories matching spec */}
        <div>
          <label className="label">نوع الفئة</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'shoes', label: 'أحذية' },
              { key: 'bags', label: 'شنط' },
              { key: 'watches', label: 'ساعات' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setForm((p) => ({ ...p, category: cat.key }))}
                className={`rounded-xl border py-3 text-center text-sm font-extrabold transition ${
                  form.category === cat.key
                    ? 'border-ink bg-cream text-ink ring-2 ring-ink shadow-sm'
                    : 'border-black/10 bg-white text-ink hover:bg-cream-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Media Upload Area (صور الصور / الفيديوهات) - Exact Reference Mockup layout */}
        <div>
          <label className="label">صور الصور / الفيديوهات</label>
          <label
            htmlFor="media-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 bg-cream-50/70 p-6 text-center transition hover:border-ink hover:bg-cream-100"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-cream text-ink">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-sm font-extrabold text-ink">أو الفيديوهات</span>
            <span className="text-xs text-ink-muted">
              اضغط لاختيار صور (JPG, PNG, WEBP) أو فيديوهات (MP4) من جهازك
            </span>
            <input
              id="media-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>

          {/* Pending files to upload */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-ink">الملفات المحددة للرفع ({selectedFiles.length}):</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-xl bg-cream-100 p-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {file.type.startsWith('video') ? (
                        <Film className="h-4 w-4 shrink-0 text-azure-dark" />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-ink" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="text-ink-muted hover:text-sale"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing uploaded media if edit mode */}
          {existingMedia.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-ink">الوسائط المحفوظة حالياً:</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {existingMedia.map((m) => (
                  <div
                    key={m.id}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-cream-100 ring-1 ring-black/10"
                  >
                    {m.media_type === 'video' ? (
                      <video src={m.url} className="h-full w-full object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.id)}
                      className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-lg bg-sale text-white shadow-sm opacity-90 hover:opacity-100 transition"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Pricing & Discount (#ef233c badge matching reference layout) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="prod-price">السعر الرسمي (ر.س)</label>
            <input
              id="prod-price"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="مثال: 450"
              value={form.price}
              onChange={setField('price')}
              className="input text-base font-bold"
            />
          </div>

          <div>
            <label className="label" htmlFor="prod-stock">الكمية المتوفرة بالمخزون</label>
            <input
              id="prod-stock"
              type="number"
              min="0"
              required
              placeholder="مثال: 25"
              value={form.stock}
              onChange={setField('stock')}
              className="input text-base font-bold"
            />
          </div>
        </div>

        {/* Discount Box with #ef233c badge (Directly from reference screen!) */}
        <div className="rounded-2xl border border-black/10 bg-cream-50/50 p-4">
          <label className="label" htmlFor="prod-discount">إضافة خصم</label>
          <div className="flex items-center gap-3">
            {/* The distinct #ef233c rectangle from reference design */}
            <div
              className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: '#ef233c' }}
            >
              #ef233c
            </div>

            <div className="relative flex-1">
              <input
                id="prod-discount"
                type="number"
                min="0"
                max="90"
                placeholder="إضافة خصم (%)"
                value={form.discount_percent}
                onChange={setField('discount_percent')}
                className="input pe-9 font-bold text-base"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
                %
              </span>
            </div>
          </div>

          {parseInt(form.discount_percent, 10) > 0 && parseFloat(form.price) > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-black/5">
              <span className="text-ink-muted">السعر بعد الخصم:</span>
              <span className="font-extrabold text-sale">{finalPricePreview()}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="label" htmlFor="prod-desc">الوصف والمواصفات</label>
          <textarea
            id="prod-desc"
            rows={3}
            placeholder="وصف تفصيلي للخامة والمقاسات والمواصفات..."
            value={form.description}
            onChange={setField('description')}
            className="input"
          />
        </div>

        {/* Active status */}
        <label className="flex cursor-pointer items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={setField('is_active')}
            className="h-5 w-5 rounded-md border-black/20 accent-ink"
          />
          <span className="text-sm font-bold text-ink">المنتج نشط ومتاح للطلب في المتجر</span>
        </label>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
          <Link to="/dashboard/products" className="btn-outline px-6 py-3">
            إلغاء
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-dark px-8 py-3 text-base shadow-lift"
          >
            {saving ? <Spinner /> : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </button>
        </div>
      </form>
    </div>
  )
}
