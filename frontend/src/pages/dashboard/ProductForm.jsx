import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowRight, Upload, X, Trash2, Film, Image as ImageIcon, Plus, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { Spinner, Alert, PageLoader } from '../../components/ui'
import { money, resolveMediaUrl } from '../../lib/format'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    description: '',
    gender: 'men',
    department_id: null,
    department_ids: [],
    category_id: null,
    category_ids: [],
    category: '',
    cost_price: '',
    price: '',
    stock: '10',
    discount_percent: '0',
    is_active: true,
  })

  const [categoriesList, setCategoriesList] = useState([])
  const [departmentsList, setDepartmentsList] = useState([])

  // Dynamic Shoe Sizes (restricted 30 - 50)
  const [sizes, setSizes] = useState([
    { size: 40, stock: 8 },
    { size: 41, stock: 10 },
    { size: 42, stock: 12 },
    { size: 43, stock: 8 },
  ])
  const [newSizeInput, setNewSizeInput] = useState('')
  const [newSizeStock, setNewSizeStock] = useState('5')

  // Dynamic Colors (for shoes and bags)
  const [colors, setColors] = useState([
    { name: 'أسود', code: '#111827' },
    { name: 'بني', code: '#78350f' },
  ])
  const [newColorName, setNewColorName] = useState('')
  const [newColorCode, setNewColorCode] = useState('#111827')

  const [existingMedia, setExistingMedia] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch dynamic departments & categories
  useEffect(() => {
    api.departments()
      .then((depts) => {
        if (Array.isArray(depts)) {
          setDepartmentsList(depts)
          if (!isEdit && depts.length > 0) {
            setForm((prev) => ({
              ...prev,
              department_ids: prev.department_ids?.length ? prev.department_ids : [depts[0].id],
              department_id: prev.department_id || depts[0].id,
              gender: prev.gender || (depts[0].name.includes('نساء') ? 'women' : 'men'),
            }))
          }
        }
      })
      .catch((err) => console.error('Failed to load departments:', err))

    api.categories()
      .then((cats) => {
        if (Array.isArray(cats)) {
          setCategoriesList(cats)
          if (!isEdit && cats.length > 0) {
            setForm((prev) => ({
              ...prev,
              category_ids: prev.category_ids?.length ? prev.category_ids : [cats[0].id],
              category_id: prev.category_id || cats[0].id,
              category: prev.category || cats[0].name,
            }))
          }
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))
  }, [isEdit])

  useEffect(() => {
    if (isEdit) {
      api
        .manageProduct(id)
        .then((p) => {
          const deptIds = Array.isArray(p.department_ids) && p.department_ids.length > 0
            ? p.department_ids
            : (Array.isArray(p.departments) && p.departments.length > 0
                ? p.departments.map((d) => d.id)
                : (p.department_id ? [p.department_id] : []))

          const catIds = Array.isArray(p.category_ids) && p.category_ids.length > 0
            ? p.category_ids
            : (Array.isArray(p.categories) && p.categories.length > 0
                ? p.categories.map((c) => c.id)
                : (p.category_id ? [p.category_id] : []))

          const catName = (typeof p.category === 'object' ? p.category?.name : p.category) || ''

          setForm({
            name: p.name,
            description: p.description || '',
            gender: p.gender || 'men',
            department_id: deptIds[0] || p.department_id || null,
            department_ids: deptIds,
            category_id: catIds[0] || p.category_id || null,
            category_ids: catIds,
            category: catName,
            cost_price: p.cost_price !== undefined && p.cost_price !== null ? String(p.cost_price) : '',
            price: String(p.price),
            stock: String(p.stock),
            discount_percent: String(p.discount_percent || 0),
            is_active: p.is_active,
          })
          if (Array.isArray(p.sizes) && p.sizes.length > 0) {
            setSizes(p.sizes.map((s) => ({ size: s.size, stock: s.stock })))
          }
          if (Array.isArray(p.colors) && p.colors.length > 0) {
            setColors(p.colors.map((c) => ({ name: c.name, code: c.code || '' })))
          }
          setExistingMedia(p.media || [])
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [id, isEdit])

  const toggleDepartment = (deptId) => {
    setForm((prev) => {
      const currentIds = Array.isArray(prev.department_ids) ? [...prev.department_ids] : []
      const exists = currentIds.includes(deptId)
      let nextIds
      if (exists) {
        if (currentIds.length > 1) {
          nextIds = currentIds.filter((id) => id !== deptId)
        } else {
          nextIds = currentIds
        }
      } else {
        nextIds = [...currentIds, deptId]
      }

      const activeDepts = departmentsList.filter((d) => nextIds.includes(d.id))
      const hasMen = activeDepts.some((d) => d.name.includes('رجال'))
      const hasWomen = activeDepts.some((d) => d.name.includes('نساء'))

      let nextGender = prev.gender
      if (hasMen && hasWomen) {
        nextGender = 'unisex'
      } else if (hasMen) {
        nextGender = 'men'
      } else if (hasWomen) {
        nextGender = 'women'
      } else if (nextIds.length > 1) {
        nextGender = 'unisex'
      }

      return {
        ...prev,
        department_ids: nextIds,
        department_id: nextIds[0] || null,
        gender: nextGender,
      }
    })
  }

  const toggleCategory = (cat) => {
    setForm((prev) => {
      const currentIds = Array.isArray(prev.category_ids) ? [...prev.category_ids] : []
      const exists = currentIds.includes(cat.id)
      let nextIds
      if (exists) {
        if (currentIds.length > 1) {
          nextIds = currentIds.filter((id) => id !== cat.id)
        } else {
          nextIds = currentIds
        }
      } else {
        nextIds = [...currentIds, cat.id]
      }

      const firstCat = categoriesList.find((c) => c.id === nextIds[0]) || cat

      return {
        ...prev,
        category_ids: nextIds,
        category_id: nextIds[0] || null,
        category: firstCat ? firstCat.name : prev.category,
      }
    })
  }

  const setField = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [k]: val }))
  }

  // --- Dynamic Shoe Sizes Handlers ---
  const handleAddSize = (e) => {
    e.preventDefault()
    const sz = parseInt(newSizeInput, 10)
    const st = parseInt(newSizeStock, 10) || 0
    if (isNaN(sz) || sz < 30 || sz > 50) {
      alert('المقاس يجب أن يكون رقماً صحيحاً بين 30 و 50')
      return
    }
    if (sizes.some((s) => s.size === sz)) {
      alert(`المقاس ${sz} مضاف بالفعل`)
      return
    }
    const updated = [...sizes, { size: sz, stock: st }].sort((a, b) => a.size - b.size)
    setSizes(updated)
    setNewSizeInput('')
    setNewSizeStock('5')
  }

  const handleUpdateSizeStock = (sizeVal, stockVal) => {
    const cleanStock = Math.max(0, parseInt(stockVal, 10) || 0)
    setSizes((prev) => prev.map((s) => (s.size === sizeVal ? { ...s, stock: cleanStock } : s)))
  }

  const handleRemoveSize = (sizeVal) => {
    setSizes((prev) => prev.filter((s) => s.size !== sizeVal))
  }

  // --- Dynamic Colors Handlers ---
  const handleAddColor = (e) => {
    e.preventDefault()
    const name = newColorName.trim()
    if (!name) return
    if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert(`اللون ${name} مضاف بالفعل`)
      return
    }
    setColors((prev) => [...prev, { name, code: newColorCode || null }])
    setNewColorName('')
  }

  const handleRemoveColor = (colorName) => {
    setColors((prev) => prev.filter((c) => c.name !== colorName))
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

  const selectedCategoriesList = categoriesList.filter((c) => form.category_ids?.includes(c.id))
  const isShoeCategory =
    selectedCategoriesList.some((c) => c.name?.includes('أحذية') || c.name === 'shoes' || c.name === 'الأحذية') ||
    (form.category && (form.category === 'shoes' || form.category === 'الأحذية' || form.category.includes('أحذية')))

  const isShoeOrBag =
    isShoeCategory ||
    selectedCategoriesList.some((c) => c.name?.includes('شنط') || c.name === 'bags' || c.name === 'الشنط') ||
    (form.category && (form.category === 'bags' || form.category === 'الشنط' || form.category.includes('شنط')))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Calculate stock for shoes from sizes
      let finalStock = parseInt(form.stock, 10) || 0
      if (isShoeCategory && sizes.length > 0) {
        finalStock = sizes.reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0)
      }

      const finalCatIds = form.category_ids && form.category_ids.length > 0
        ? form.category_ids
        : (form.category_id ? [form.category_id] : [])

      const finalDeptIds = form.department_ids && form.department_ids.length > 0
        ? form.department_ids
        : (form.department_id ? [form.department_id] : [])

      const payload = {
        name: form.name.trim(),
        description: form.description ? form.description.trim() : null,
        gender: form.gender,
        department_ids: finalDeptIds,
        department_id: finalDeptIds[0] || undefined,
        category_ids: finalCatIds,
        category_id: finalCatIds[0] || undefined,
        category: form.category || undefined,
        cost_price: form.cost_price === '' ? 0 : (parseFloat(form.cost_price) || 0),
        price: parseFloat(form.price),
        stock: finalStock,
        discount_percent: parseInt(form.discount_percent || 0, 10),
        is_active: Boolean(form.is_active),
        sizes: isShoeCategory ? sizes.map((s) => ({ size: parseInt(s.size, 10), stock: parseInt(s.stock, 10) || 0 })) : null,
        colors: isShoeOrBag ? colors.map((c) => ({ name: c.name.trim(), code: c.code || null })) : null,
      }

      let productId = id
      if (isEdit) {
        await api.updateProduct(id, payload)
      } else {
        const created = await api.createProduct(payload)
        productId = created.id
      }

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
      <div className="admin-form-header">
        <Link
          to="/dashboard/products"
          className="admin-form-back-btn"
          aria-label="الرجوع إلى قائمة المنتجات"
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

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8 admin-product-form-container">
        {/* Name */}
        <div>
          <label className="label" htmlFor="prod-name">اسم المنتج</label>
          <input
            id="prod-name"
            required
            placeholder="مثال: حذاء كلاسيك جلد / حقيبة يد نسائية"
            value={form.name}
            onChange={setField('name')}
            className="input text-base font-bold"
          />
        </div>

        {/* Dynamic Department Selection (الفئة الرئيسية) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="label mb-0">الفئة الرئيسية / القسم (متعدد الاختيار)</label>
              <span className="text-[0.7rem] text-ink-muted">يمكن تحديد كل من "رجالي" و"نسائي" ليصبح المنتج للجنسين (Unisex)</span>
            </div>
            <Link to="/dashboard/departments" className="text-xs font-bold text-ink hover:underline">
              + إدارة الفئات
            </Link>
          </div>
          {departmentsList.length > 0 ? (
            <div className={`grid gap-2.5 ${departmentsList.length <= 2 ? 'grid-cols-2' : departmentsList.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {departmentsList.map((dept) => {
                const isSelected = form.department_ids?.includes(dept.id) || form.department_id === dept.id
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 px-3 text-center text-sm font-extrabold transition ${
                      isSelected
                        ? 'border-ink bg-ink text-white shadow-sm ring-2 ring-ink'
                        : 'border-black/10 bg-white text-ink hover:bg-cream-100'
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${isSelected ? 'bg-white text-ink' : 'border border-black/20 bg-transparent'}`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </span>
                    <span>{dept.name}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm((p) => {
                    const isMen = p.gender === 'men'
                    const isUnisex = p.gender === 'unisex'
                    let nextGender = 'men'
                    if (isUnisex) nextGender = 'women'
                    else if (isMen) nextGender = 'unisex'
                    else nextGender = 'unisex'
                    return { ...p, gender: nextGender }
                  })
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 text-center text-sm font-extrabold transition ${
                  form.gender === 'men' || form.gender === 'unisex'
                    ? 'border-ink bg-ink text-white shadow-sm'
                    : 'border-black/10 bg-white text-ink hover:bg-cream-100'
                }`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${form.gender === 'men' || form.gender === 'unisex' ? 'bg-white text-ink' : 'border border-black/20 bg-transparent'}`}>
                  {(form.gender === 'men' || form.gender === 'unisex') && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span>رجال</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm((p) => {
                    const isWomen = p.gender === 'women'
                    const isUnisex = p.gender === 'unisex'
                    let nextGender = 'women'
                    if (isUnisex) nextGender = 'men'
                    else if (isWomen) nextGender = 'unisex'
                    else nextGender = 'unisex'
                    return { ...p, gender: nextGender }
                  })
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 text-center text-sm font-extrabold transition ${
                  form.gender === 'women' || form.gender === 'unisex'
                    ? 'border-ink bg-ink text-white shadow-sm'
                    : 'border-black/10 bg-white text-ink hover:bg-cream-100'
                }`}
              >
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${form.gender === 'women' || form.gender === 'unisex' ? 'bg-white text-ink' : 'border border-black/20 bg-transparent'}`}>
                  {(form.gender === 'women' || form.gender === 'unisex') && <Check className="h-3 w-3 stroke-[3]" />}
                </span>
                <span>نساء</span>
              </button>
            </div>
          )}
          {form.gender === 'unisex' && (
            <p className="mt-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
              ✓ تم تعيين المنتج كـ "للجنسين (Unisex)" وسيعرض في كلا القسمين (رجالي ونسائي) بالمتجر
            </p>
          )}
        </div>

        {/* Dynamic Category Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="label mb-0">التصنيفات (متعدد الاختيار)</label>
              <span className="text-[0.7rem] text-ink-muted">انقر لاختيار تصنيف واحد أو أكثر للمنتج</span>
            </div>
            <Link to="/dashboard/categories" className="text-xs font-bold text-ink hover:underline">
              + إدارة التصنيفات
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {categoriesList.map((cat) => {
              const isSelected = form.category_ids?.includes(cat.id) || form.category_id === cat.id || form.category === cat.name || form.category === cat.name.toLowerCase()
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-start transition ${
                    isSelected
                      ? 'border-ink bg-cream text-ink ring-2 ring-ink shadow-sm'
                      : 'border-black/10 bg-white text-ink hover:bg-cream-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.image_url ? (
                      <img
                        src={resolveMediaUrl(cat.image_url)}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover mix-blend-multiply shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <span className="text-xs font-extrabold truncate">{cat.name}</span>
                  </div>
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ${isSelected ? 'bg-ink text-white' : 'border border-black/20 bg-transparent'}`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* DYNAMIC SECTION 1: Shoe Sizes & Inventory (Range 30 to 50) */}
        {isShoeCategory && (
          <div className="rounded-2xl border border-black/10 bg-cream-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-ink">المقاسات المتاحة والمخزون (الأحذية)</h3>
                <p className="text-xs text-ink-muted">المقاسات مقيدة في النطاق من 30 إلى 50 مع تحديد كمية كل مقاس</p>
              </div>
              <span className="rounded-lg bg-cream px-2.5 py-1 text-xs font-bold text-ink">
                إجمالي المخزون: {sizes.reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0)}
              </span>
            </div>

            {/* List of current sizes */}
            {sizes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {sizes.map((s) => (
                  <div
                    key={s.size}
                    className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white p-2.5 text-xs shadow-sm"
                  >
                    <span className="font-extrabold text-sm text-ink">مقاس {s.size}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-ink-muted text-[0.65rem]">الكمية:</span>
                      <input
                        type="number"
                        min="0"
                        className="w-14 rounded-lg border border-black/10 bg-cream-100 px-1.5 py-1 text-center font-bold"
                        value={s.stock}
                        onChange={(e) => handleUpdateSizeStock(s.size, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(s.size)}
                        className="text-ink-muted hover:text-sale p-1"
                        title="حذف المقاس"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-sale font-bold">لم تتم إضافة أي مقاسات بعد. يرجى إضافة مقاس واحد على الأقل.</p>
            )}

            {/* Add new size row */}
            <div className="admin-form-size-row">
              <input
                type="number"
                min="30"
                max="50"
                placeholder="المقاس (30-50)"
                className="w-32 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-bold"
                value={newSizeInput}
                onChange={(e) => setNewSizeInput(e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="الكمية"
                className="w-24 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-bold"
                value={newSizeStock}
                onChange={(e) => setNewSizeStock(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddSize}
                className="btn-dark py-2 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة مقاس
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC SECTION 2: Available Colors (for Shoes and Bags) */}
        {isShoeOrBag && (
          <div className="rounded-2xl border border-black/10 bg-cream-50/70 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-ink">الألوان المتاحة للمنتج</h3>
              <p className="text-xs text-ink-muted">أضف خيارات الألوان المتوفرة (مثل: أسود، بني، بيج، كحلي)</p>
            </div>

            {/* Colors chips */}
            {colors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold shadow-sm"
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-black/20 bg-cream" />
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(c.name)}
                      className="text-ink-muted hover:text-sale"
                      title="حذف اللون"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-muted">لم يتم تحديد أي ألوان لهذا المنتج.</p>
            )}

            {/* Add color row */}
            <div className="admin-form-color-row">
              <input
                type="text"
                placeholder="اسم اللون (مثال: كحلي / بني)"
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-bold flex-1"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddColor}
                className="btn-dark py-2 px-3 text-xs flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة لون
              </button>
            </div>
          </div>
        )}

        {/* Pricing & Stock */}
        <div className="admin-pricing-grid">
          <div>
            <label className="label flex items-center justify-between" htmlFor="prod-cost-price">
              <span>سعر التكلفة / الجملة (ج.م)</span>
              <span className="text-[0.68rem] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">خاص بالإدارة</span>
            </label>
            <input
              id="prod-cost-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="مثال: 250"
              value={form.cost_price}
              onChange={setField('cost_price')}
              className="input text-base font-bold border-amber-300/80 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="label" htmlFor="prod-price">سعر البيع الرسمي (ج.م)</label>
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
            <label className="label" htmlFor="prod-stock">
              {form.category === 'shoes' ? 'إجمالي المخزون (محسوب تلقائياً)' : 'الكمية المتوفرة بالمخزون'}
            </label>
            <input
              id="prod-stock"
              type="number"
              min="0"
              required
              readOnly={form.category === 'shoes' && sizes.length > 0}
              placeholder="مثال: 25"
              value={
                form.category === 'shoes' && sizes.length > 0
                  ? sizes.reduce((sum, s) => sum + (parseInt(s.stock, 10) || 0), 0)
                  : form.stock
              }
              onChange={setField('stock')}
              className="input text-base font-bold"
            />
          </div>
        </div>

        {/* Discount Box with #ef233c badge */}
        <div className="admin-discount-box">
          <label className="label" htmlFor="prod-discount">إضافة خصم</label>
          <div className="admin-discount-row">
            <div className="admin-discount-badge">
              #ef233c
            </div>

            <div className="admin-discount-input-wrapper">
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

        {/* Media Upload Area */}
        <div>
          <label className="label">صور / فيديوهات المنتج</label>
          <label
            htmlFor="media-upload"
            className="admin-media-dropzone"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-cream text-ink">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-sm font-extrabold text-ink">رفع صور أو فيديوهات</span>
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

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-ink">الملفات المحددة للرفع ({selectedFiles.length}):</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 admin-selected-files-list">
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
                      <video src={resolveMediaUrl(m.url)} className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={resolveMediaUrl(m.url)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList?.remove('hidden')
                        }}
                      />
                    )}
                    <div className="hidden grid h-full w-full place-items-center bg-sand-subtle text-ink-muted">
                      <ImageIcon className="h-6 w-6 stroke-1 text-ink-muted/50" />
                    </div>
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

        {/* Description */}
        <div>
          <label className="label" htmlFor="prod-desc">الوصف والمواصفات</label>
          <textarea
            id="prod-desc"
            rows={3}
            placeholder="وصف تفصيلي للخامة والمواصفات..."
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
        <div className="admin-form-actions">
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
