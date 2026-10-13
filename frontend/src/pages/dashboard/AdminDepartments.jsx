import { useEffect, useRef, useState } from 'react'
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Upload,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { api } from '../../lib/api'
import { Alert, PageLoader, Spinner } from '../../components/ui'
import './AdminDepartments.css'

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([])
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
  const [editingDept, setEditingDept] = useState(null)
  const [editName, setEditName] = useState('')
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const editFileInputRef = useRef(null)

  const loadDepartments = async () => {
    try {
      setError('')
      const data = await api.departments()
      setDepartments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'تعذر تحميل الفئات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  // Add Image Handlers
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

  // Create Department Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = name.trim()
    if (!cleanName) {
      setError('يرجى إدخال اسم الفئة')
      return
    }

    if (!imageFile) {
      setError('يرجى رفع صورة للغلاف')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', cleanName)
      formData.append('file', imageFile)

      const created = await api.createDepartment(formData)
      setSuccess(`تمت إضافة الفئة «${created.name}» بنجاح!`)
      setName('')
      handleClearImage()
      await loadDepartments()
    } catch (err) {
      setError(err.message || 'فشل إنشاء الفئة')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Department Handler
  const handleDelete = async (dept) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف الفئة «${dept.name}»؟`)
    if (!confirmDelete) return

    setDeletingId(dept.id)
    setError('')
    setSuccess('')

    try {
      await api.deleteDepartment(dept.id)
      setSuccess(`تم حذف الفئة «${dept.name}» بنجاح`)
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id))
    } catch (err) {
      setError(err.message || 'فشل حذف الفئة')
    } finally {
      setDeletingId(null)
    }
  }

  // Open Edit Modal
  const openEditModal = (dept) => {
    setEditingDept(dept)
    setEditName(dept.name)
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditError('')
  }

  // Close Edit Modal
  const closeEditModal = () => {
    setEditingDept(null)
    setEditName('')
    setEditImageFile(null)
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview)
      setEditImagePreview(null)
    }
    setEditError('')
  }

  // Edit File Handlers
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

  // Submit Edit Department
  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!editingDept) return

    const cleanName = editName.trim()
    if (!cleanName) {
      setEditError('يرجى إدخال اسم الفئة')
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

      const updated = await api.updateDepartment(editingDept.id, formData)
      setSuccess(`تم تعديل الفئة «${updated.name}» بنجاح!`)
      closeEditModal()
      await loadDepartments()
    } catch (err) {
      setEditError(err.message || 'فشل تعديل الفئة')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="departments-admin-container">
      {/* Header */}
      <div className="departments-admin-header">
        <div>
          <h1 className="departments-admin-title">إدارة الفئات</h1>
          <p className="departments-admin-subtitle">
            إدارة الفئات الرئيسية للمتجر (مثل: رجالي، نسائي) مع صور الغلاف
          </p>
        </div>
        <button
          type="button"
          onClick={loadDepartments}
          className="departments-refresh-btn"
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

      {/* Main Grid: Add Form + Departments Table */}
      <div className="departments-layout-grid">
        {/* Form: Add New Department */}
        <section aria-labelledby="add-department-heading" className="department-form-card">
          <h2 id="add-department-heading" className="department-form-title">
            إضافة فئة جديدة
          </h2>
          <p className="department-form-desc">
            أدخل اسم الفئة وارفع صورة الغلاف الخاصة بها.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Department Name */}
            <div className="department-form-group">
              <label htmlFor="dept-name-input" className="department-form-label">
                اسم الفئة *
              </label>
              <input
                id="dept-name-input"
                type="text"
                placeholder="مثال: رجالي، نسائي..."
                className="department-form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Department Image Upload */}
            <div className="department-form-group">
              <label className="department-form-label">صورة الغلاف *</label>

              {imagePreview ? (
                <div className="department-image-preview-wrapper">
                  <img src={imagePreview} alt="معاينة الفئة" className="department-image-preview-img" />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="department-image-clear-btn"
                  >
                    <Trash2 className="h-3 w-3" /> حذف
                  </button>
                </div>
              ) : (
                <div
                  className="department-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="department-upload-input"
                    onChange={handleFileChange}
                  />
                  <Upload className="department-upload-icon" />
                  <span className="department-upload-text">اضغط لرفع صورة الفئة</span>
                  <span className="department-upload-hint">PNG, JPG, WebP بحجم حتى 8MB</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !name.trim() || !imageFile}
              className="department-submit-btn"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" /> جاري الحفظ...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> حفظ الفئة
                </>
              )}
            </button>
          </form>
        </section>

        {/* Existing Departments Table */}
        <section aria-labelledby="existing-departments-heading" className="departments-list-card">
          <div className="departments-list-header">
            <h2 id="existing-departments-heading" className="department-form-title">
              الفئات الحالية
            </h2>
            <span className="departments-list-count">{departments.length} فئة</span>
          </div>

          <div className="departments-table-container">
            <table className="departments-table">
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>صورة الغلاف</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>
                      <div className="department-row-meta">
                        <img
                          src={dept.image_url || '/images/products/sneaker.jpg'}
                          alt={dept.name}
                          className="department-thumbnail"
                        />
                        <div>
                          <p className="department-name-text">{dept.name}</p>
                          <p className="department-id-badge">معرف #{dept.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-ink-muted dir-ltr font-mono">
                        {dept.image_url ? dept.image_url.split('/').pop() : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="department-actions-group">
                        <button
                          type="button"
                          onClick={() => openEditModal(dept)}
                          className="department-action-edit-btn"
                          title="تعديل الفئة"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept)}
                          disabled={deletingId === dept.id}
                          className="department-action-delete-btn"
                          title="حذف الفئة"
                        >
                          {deletingId === dept.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5" /> حذف
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-ink-muted">
                      لا توجد فئات حالياً. أضف أول فئة من النموذج أعلاه.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="department-modal-backdrop" onClick={closeEditModal}>
          <div className="department-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="department-modal-header">
              <h3 className="department-modal-title">
                تعديل الفئة «{editingDept.name}»
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="department-modal-close-btn"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="department-modal-body">
                {editError && <Alert>{editError}</Alert>}

                {/* Name Field */}
                <div className="department-form-group">
                  <label htmlFor="edit-dept-name" className="department-form-label">
                    اسم الفئة *
                  </label>
                  <input
                    id="edit-dept-name"
                    type="text"
                    required
                    className="department-form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                {/* Current Image Indicator */}
                <div className="department-current-preview-box">
                  <img
                    src={editImagePreview || editingDept.image_url}
                    alt={editingDept.name}
                    className="department-current-preview-img"
                  />
                  <div className="department-current-preview-meta">
                    <span className="department-current-preview-label">
                      {editImagePreview ? 'الصورة الجديدة المحددة:' : 'صورة الغلاف الحالية:'}
                    </span>
                    <span className="department-current-preview-status">
                      {editImagePreview ? 'جاهزة للحفظ' : 'صورة معتمدة'}
                    </span>
                  </div>
                </div>

                {/* Upload Replacement Image */}
                <div className="department-form-group">
                  <label className="department-form-label">
                    تغيير صورة الغلاف (اختياري)
                  </label>
                  {editImagePreview ? (
                    <button
                      type="button"
                      onClick={handleClearEditNewImage}
                      className="department-image-clear-btn"
                    >
                      <Trash2 className="h-3 w-3" /> إلغاء الصورة الجديدة
                    </button>
                  ) : (
                    <div
                      className="department-upload-dropzone"
                      onClick={() => editFileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        className="department-upload-input"
                        onChange={handleEditFileChange}
                      />
                      <Upload className="department-upload-icon" />
                      <span className="department-upload-text">اضغط لاختيار صورة بديلة</span>
                      <span className="department-upload-hint">اتركها فارغة للاحتفاظ بالصورة الحالية</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="department-modal-footer">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                  className="department-modal-cancel-btn"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editName.trim()}
                  className="department-modal-save-btn"
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
