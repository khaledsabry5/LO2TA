import { useEffect, useState } from 'react'
import { Plus, UserCheck, UserX, Shield, ShieldAlert, Mail, Phone, Calendar } from 'lucide-react'
import { api } from '../../lib/api'
import { ROLE_LABELS, formatDate } from '../../lib/format'
import { PageLoader, EmptyState, Alert, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Staff() {
  const { user: currentManager } = useAuth()
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStaff = async () => {
    setLoading(true)
    try {
      const data = await api.staff()
      setStaffList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setStaffList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.createStaff({
        ...form,
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      })
      setSuccess(`تم إضافة ${ROLE_LABELS[form.role]} جديد بنجاح: ${form.full_name}`)
      setShowModal(false)
      setForm({ full_name: '', email: '', phone: '', password: '', role: 'admin' })
      loadStaff()
    } catch (err) {
      setError(err.message || 'فشل إضافة الحساب')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (targetUser) => {
    if (targetUser.id === currentManager.id) {
      alert('لا يمكنك تعطيل حسابك الخاص')
      return
    }
    const nextState = !targetUser.is_active
    const confirmMsg = nextState
      ? `هل تريد تفعيل حساب ${targetUser.full_name}؟`
      : `هل تريد إيقاف حساب ${targetUser.full_name}؟ لن يتمكن من تسجيل الدخول بعد الآن.`
    if (!window.confirm(confirmMsg)) return

    try {
      await api.updateStaff(targetUser.id, { is_active: nextState })
      setStaffList((prev) =>
        prev.map((s) => (s.id === targetUser.id ? { ...s, is_active: nextState } : s))
      )
    } catch (err) {
      alert(err.message || 'فشل تحديث حالة الحساب')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button matching reference UI */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
            إدارة المشرفين والمديرين
          </h1>
          <p className="text-xs text-ink-muted sm:text-sm">
            صلاحية حصرية للمدير: تعيين وتعديل حسابات المديرين والمشرفين
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          id="btn-add-staff"
          className="btn-dark inline-flex items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ إضافة مدير أو مشرف</span>
        </button>
      </div>

      {success && <Alert tone="success">{success}</Alert>}

      {/* Staff Table */}
      {loading ? (
        <PageLoader />
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="لا يوجد حسابات طاقم إداري بعد"
          action={
            <button onClick={() => setShowModal(true)} className="btn-dark text-sm">
              إضافة مشرف جديد
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-black/5 bg-cream/40 p-4 font-bold text-ink">
            قائمة فريق الإدارة والتشغيل ({staffList.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-black/5 bg-cream/20 text-xs font-bold text-ink-muted">
                <tr>
                  <th className="p-3 text-start sm:p-4">الاسم والمستخدم</th>
                  <th className="p-3 text-start sm:p-4">الدور / الرتبة</th>
                  <th className="p-3 text-start sm:p-4">بيانات التواصل</th>
                  <th className="p-3 text-start sm:p-4">تاريخ الانضمام</th>
                  <th className="p-3 text-start sm:p-4">الحالة</th>
                  <th className="p-3 text-end sm:p-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {staffList.map((member) => {
                  const isCurrent = member.id === currentManager.id
                  return (
                    <tr key={member.id} className="transition hover:bg-cream-50/60">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream font-extrabold text-ink">
                            {member.full_name[0]}
                          </span>
                          <div>
                            <p className="font-extrabold text-ink flex items-center gap-2">
                              {member.full_name}
                              {isCurrent && (
                                <span className="chip bg-cream text-[0.65rem] text-ink">أنت</span>
                              )}
                            </p>
                            <p className="text-xs text-ink-muted font-mono">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`chip ${
                            member.role === 'manager'
                              ? 'bg-ink text-white font-extrabold'
                              : 'bg-azure/10 text-azure-dark font-extrabold'
                          }`}
                        >
                          {member.role === 'manager' ? (
                            <span className="flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> مدير (كامل الصلاحيات)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" /> مشرف (منتجات وطلبات)
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-xs">
                        <p className="flex items-center gap-1 text-ink-muted">
                          <Mail className="h-3 w-3" /> {member.email}
                        </p>
                        {member.phone && (
                          <p className="mt-0.5 flex items-center gap-1 text-ink-muted">
                            <Phone className="h-3 w-3" /> <span dir="ltr">{member.phone}</span>
                          </p>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-xs text-ink-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(member.created_at)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <span
                          className={`chip ${
                            member.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-sale/10 text-sale'
                          }`}
                        >
                          {member.is_active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="p-3 text-end sm:p-4">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => toggleActive(member)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              member.is_active
                                ? 'bg-sale/10 text-sale hover:bg-sale hover:text-white'
                                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            {member.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal (Exact UI from reference "+ إضافة مدير أو مشرف") */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md space-y-4 p-6 animate-fade-up">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h2 className="text-lg font-extrabold text-ink">إضافة مدير أو مشرف جديد</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-ink-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && <Alert>{error}</Alert>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">نوع الحساب والصلاحية</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'admin' }))}
                    className={`rounded-xl border p-3 text-center transition ${
                      form.role === 'admin'
                        ? 'border-ink bg-cream text-ink ring-2 ring-ink font-bold'
                        : 'border-black/10 bg-white text-ink-muted hover:bg-cream-100'
                    }`}
                  >
                    <p className="font-extrabold text-sm">مشرف (Admin)</p>
                    <p className="mt-1 text-[0.65rem] text-ink-muted">إدارة المنتجات والطلبات فقط</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'manager' }))}
                    className={`rounded-xl border p-3 text-center transition ${
                      form.role === 'manager'
                        ? 'border-ink bg-ink text-white font-bold'
                        : 'border-black/10 bg-white text-ink-muted hover:bg-cream-100'
                    }`}
                  >
                    <p className="font-extrabold text-sm">مدير (Manager)</p>
                    <p className="mt-1 text-[0.65rem] opacity-75">صلاحيات كاملة على النظام</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="staff-name">الاسم الكامل</label>
                <input
                  id="staff-name"
                  required
                  placeholder="مثال: أحمد عبد الله"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="staff-email">البريد الإلكتروني</label>
                <input
                  id="staff-email"
                  type="email"
                  dir="ltr"
                  required
                  placeholder="admin@lo2ta.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input text-end"
                />
              </div>

              <div>
                <label className="label" htmlFor="staff-phone">رقم الجوال (اختياري)</label>
                <input
                  id="staff-phone"
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input text-end"
                />
              </div>

              <div>
                <label className="label" htmlFor="staff-pass">كلمة المرور المؤقتة</label>
                <input
                  id="staff-pass"
                  type="password"
                  dir="ltr"
                  required
                  minLength={8}
                  placeholder="8 أحرف على الأقل"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input text-end"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-dark px-5 py-2 text-sm"
                >
                  {saving ? <Spinner /> : 'حفظ وإنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
