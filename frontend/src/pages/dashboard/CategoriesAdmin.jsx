import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Upload,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { api } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/format'
import { Alert, PageLoader, Spinner } from '../../components/ui'
import './CategoriesAdmin.css'

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add Form State
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState(null)
  const [editName, setEditName] = useState('')
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const editFileInputRef = useRef(null)

  const loadCategories = async () => {
    try {
      setError('')
      const data = await api.categories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'تعذر تحميل التصنيفات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  // File Handlers for Add Form
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleClearImage = () => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Create Category Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('يرجى إدخال اسم التصنيف')
      return
    }

    if (!imageFile) {
      setError('يرجى رفع صورة للتصنيف الجديد')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', cleanName)
      formData.append('file', imageFile)

      const created = await api.createCategory(formData)
      setSuccess(`تمت إضافة التصنيف «${created.name}» بنجاح!`)
      setName('')
      handleClearImage()
      await loadCategories()
    } catch (err) {
      setError(err.message || 'فشل إنشاء التصنيف')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Category Handler
  const handleDelete = async (cat) => {
    if (cat.products_count > 0) {
      alert(
        `لا يمكن حذف التصنيف «${cat.name}» لأنه مرتبط بـ ${cat.products_count} منتج حالياً. قم بنقل أو حذف المنتجات أولاً.`
      )
      return
    }

    const confirmDelete = window.confirm(`هل أنت متأكد من حذف التصنيف «${cat.name}»؟`)
    if (!confirmDelete) return

    setDeletingId(cat.id)
    setError('')
    setSuccess('')

    try {
      await api.deleteCategory(cat.id)
      setSuccess(`تم حذف التصنيف «${cat.name}» بنجاح`)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    } catch (err) {
      setError(err.message || 'فشل حذف التصنيف')
    } finally {
      setDeletingId(null)
    }
  }

  // Edit Modal Handlers
  const openEditModal = (cat) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditError('')
  }

  const closeEditModal = () => {
    setEditingCategory(null)
    setEditName('')
    setEditImageFile(null)
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview)
      setEditImagePreview(null)
    }
    setEditError('')
  }

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setEditError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)')
        return
      }
      setEditImageFile(file)
      setEditImagePreview(URL.createObjectURL(file))
      setEditError('')
    }
  }

  const handleClearEditNewImage = () => {
    setEditImageFile(null)
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview)
      setEditImagePreview(null)
    }
    if (editFileInputRef.current) {
      editFileInputRef.current.value = ''
    }
  }

  // Submit Category Update
  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!editingCategory) return

    const cleanName = editName.trim()
    if (!cleanName) {
      setEditError('يرجى إدخال اسم التصنيف')
      return
    }

    setEditSubmitting(true)
    setEditError('')

    try {
      const formData = new FormData()
      formData.append('name', cleanName)
      if (editImageFile) {
        formData.append('file', editImageFile)
      }

      const updated = await api.updateCategory(editingCategory.id, formData)
      setSuccess(`تم تعديل التصنيف «${updated.name}» بنجاح!`)
      closeEditModal()
      await loadCategories()
    } catch (err) {
      setEditError(err.message || 'فشل تعديل التصنيف')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="categories-admin-container">
      {/* Header */}
      <div className="categories-admin-header">
        <div>
          <h1 className="categories-admin-title">إدارة التصنيفات</h1>
          <p className="categories-admin-subtitle">
            إضافة وإدارة تصنيفات المنتجات المتغيرة في المتجر مع صور العرض
          </p>
        </div>
        <button
          type="button"
          onClick={loadCategories}
          className="categories-refresh-btn"
        >
          <RefreshCw className="h-4 w-4" /> تحديث القائمة
        </button>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          {success}
        </div>
      )}

      {/* Main Grid: Add Form + Categories Table */}
      <div className="categories-layout-grid">
        {/* Form: Add New Category */}
        <section aria-labelledby="add-category-heading" className="category-form-card">
          <h2 id="add-category-heading" className="category-form-title">
            إضافة تصنيف جديد
          </h2>
          <p className="category-form-desc">
            أدخل اسم التصنيف وارفع صورته ليظهر فوراً في الصفحة الرئيسية ونموذج المنتجات.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Category Name */}
            <div className="category-form-group">
              <label htmlFor="cat-name-input" className="category-form-label">
                اسم التصنيف *
              </label>
              <input
                id="cat-name-input"
                type="text"
                placeholder="مثال: النظارات الشمسية، الأوشحة..."
                className="category-form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Category Image Upload */}
            <div className="category-form-group">
              <label className="category-form-label">صورة التصنيف *</label>

              {imagePreview ? (
                <div className="category-image-preview-wrapper">
                  <img src={imagePreview} alt="معاينة التصنيف" className="category-image-preview-img" />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="category-image-clear-btn"
                  >
                    <Trash2 className="h-3 w-3" /> حذف
                  </button>
                </div>
              ) : (
                <div
                  className="category-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="category-upload-input"
                    onChange={handleFileChange}
                  />
                  <Upload className="category-upload-icon" />
                  <span className="category-upload-text">اضغط لرفع صورة التصنيف</span>
                  <span className="category-upload-hint">PNG, JPG, WebP بحجم حتى 10MB</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !name.trim() || !imageFile}
              className="category-submit-btn"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" /> جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> حفظ التصنيف
                </>
              )}
            </button>
          </form>
        </section>

        {/* Existing Categories Table */}
        <section aria-labelledby="existing-categories-heading" className="categories-list-card">
          <div className="categories-list-header">
            <h2 id="existing-categories-heading" className="category-form-title">
              التصنيفات الحالية
            </h2>
            <span className="categories-list-count">{categories.length} تصنيف</span>
          </div>

          <div className="table-responsive categories-table-container">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>التصنيف</th>
                  <th>عدد المنتجات</th>
                  <th>معاينة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <div className="category-row-meta">
                        {cat.image_url ? (
                          <img
                            src={resolveMediaUrl(cat.image_url)}
                            alt={cat.name}
                            className="category-thumbnail"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`category-thumbnail grid place-items-center bg-sand-subtle text-ink-muted ${cat.image_url ? 'hidden' : ''}`}>
                          <FolderTree className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="category-name-text">{cat.name}</p>
                          <p className="category-id-badge">معرف #{cat.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-products-count-badge">
                        <FolderTree className="h-3.5 w-3.5" />
                        {cat.products_count ?? 0} منتج
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/category/${cat.id}`}
                        target="_blank"
                        className="category-action-link table-action-btn"
                        title="فتح صفحة التصنيف"
                      >
                        عرض بالمتجر
                      </Link>
                    </td>
                    <td>
                      <div className="category-actions-group">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="category-action-edit-btn"
                          title="تعديل التصنيف"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          className="category-delete-btn table-action-btn"
                          title="حذف التصنيف"
                        >
                          {deletingId === cat.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-ink-muted">
                      لا توجد تصنيفات حالياً. أضف أول تصنيف من النموذج.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="category-modal-backdrop" onClick={closeEditModal}>
          <div className="category-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="category-modal-header">
              <h3 className="category-modal-title">
                تعديل التصنيف «{editingCategory.name}»
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="category-modal-close-btn"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="category-modal-body">
                {editError && <Alert>{editError}</Alert>}

                {/* Name Field */}
                <div className="category-form-group">
                  <label htmlFor="edit-cat-name" className="category-form-label">
                    اسم التصنيف *
                  </label>
                  <input
                    id="edit-cat-name"
                    type="text"
                    required
                    className="category-form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                {/* Current Image Indicator */}
                <div className="category-current-preview-box">
                  {editImagePreview || editingCategory.image_url ? (
                    <img
                      src={editImagePreview || resolveMediaUrl(editingCategory.image_url)}
                      alt={editingCategory.name}
                      className="category-current-preview-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`category-current-preview-img grid place-items-center bg-sand-subtle text-ink-muted ${editImagePreview || editingCategory.image_url ? 'hidden' : ''}`}>
                    <FolderTree className="h-6 w-6 stroke-1 text-ink-muted/50" />
                  </div>
                  <div className="category-current-preview-meta">
                    <span className="category-current-preview-label">
                      {editImagePreview ? 'الصورة الجديدة المحددة:' : 'صورة التصنيف الحالية:'}
                    </span>
                    <span className="category-current-preview-status">
                      {editImagePreview ? 'جاهزة للحفظ' : (editingCategory.image_url ? 'صورة معتمدة' : 'لا توجد صورة')}
                    </span>
                  </div>
                </div>

                {/* Upload Replacement Image */}
                <div className="category-form-group">
                  <label className="category-form-label">
                    تغيير صورة التصنيف (اختياري)
                  </label>
                  {editImagePreview ? (
                    <button
                      type="button"
                      onClick={handleClearEditNewImage}
                      className="category-image-clear-btn"
                    >
                      <Trash2 className="h-3 w-3" /> إلغاء الصورة الجديدة
                    </button>
                  ) : (
                    <div
                      className="category-upload-dropzone"
                      onClick={() => editFileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        className="category-upload-input"
                        onChange={handleEditFileChange}
                      />
                      <Upload className="category-upload-icon" />
                      <span className="category-upload-text">اضغط لاختيار صورة بديلة</span>
                      <span className="category-upload-hint">اتركها فارغة للاحتفاظ بالصورة الحالية</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="category-modal-footer">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                  className="category-modal-cancel-btn"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editName.trim()}
                  className="category-modal-save-btn"
                >
                  {editSubmitting ? (
                    <>
                      <Spinner size="sm" /> جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> حفظ التعديلات
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
