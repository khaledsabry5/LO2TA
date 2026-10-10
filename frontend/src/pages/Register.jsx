import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { handleEgyptianPhoneChange, isValidEgyptianPhone, isValidTwoNames } from '../lib/phone'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '+20' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleNameChange = (e) => {
    setForm((f) => ({ ...f, full_name: e.target.value }))
  }

  const handlePhoneChange = (e) => {
    const formatted = handleEgyptianPhoneChange(e.target.value)
    setForm((f) => ({ ...f, phone: formatted }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isValidTwoNames(form.full_name)) {
      setError('يرجى إدخال الاسم ثنائياً على الأقل (الاسم واسم العائلة)')
      return
    }

    if (!isValidEgyptianPhone(form.phone)) {
      setError('يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ +201 (مثال: +201012345678)')
      return
    }

    setBusy(true)
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'فشل إنشاء الحساب')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-x flex justify-center py-10 sm:py-16">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8 animate-fade-up">
        <div className="text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-extrabold">إنشاء حساب جديد</h1>
          <p className="mt-1 text-xs text-ink-muted">تسجيل سريع بدون كلمة مرور لطلب المنتجات</p>
        </div>

        {error && <Alert>{error}</Alert>}

        <div>
          <label className="label" htmlFor="full_name">الاسم الكامل (ثنائي على الأقل)</label>
          <input
            id="full_name"
            required
            placeholder="مثال: أحمد محمد علي"
            className="input"
            value={form.full_name}
            onChange={handleNameChange}
          />
        </div>

        <div>
          <label className="label" htmlFor="reg-email">البريد الإلكتروني</label>
          <input
            id="reg-email"
            type="email"
            dir="ltr"
            required
            placeholder="name@example.com"
            className="input text-end"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="phone">رقم الهاتف المصري (+20)</label>
          <input
            id="phone"
            type="tel"
            dir="ltr"
            required
            placeholder="+2010xxxxxxxx"
            className="input text-end font-mono"
            value={form.phone}
            onChange={handlePhoneChange}
          />
          <span className="mt-1 block text-[0.7rem] text-ink-muted">
            شبكات المحمول في مصر (+2010, +2011, +2012, +2015)
          </span>
        </div>

        <button id="register-submit" disabled={busy} className="btn-dark w-full">
          {busy ? <Spinner /> : 'إنشاء الحساب ومتابعة التسوق'}
        </button>

        <p className="text-center text-sm text-ink-muted">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" state={location.state} className="font-bold text-ink underline">
            تسجيل الدخول
          </Link>
        </p>
      </form>
    </div>
  )
}
