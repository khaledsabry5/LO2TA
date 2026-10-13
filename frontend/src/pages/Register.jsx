import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isValidEgyptianPhone, isValidTwoNames } from '../lib/phone'
import './Register.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ full_name: '', email: '' })
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleNameChange = (e) => {
    setForm((f) => ({ ...f, full_name: e.target.value }))
  }

  const handlePhoneChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '')

    // Handle user pasting with country code +20 or 20
    if (raw.startsWith('201')) {
      raw = raw.slice(2)
    }

    // Prevent typing a leading zero; strip any leading zeroes
    if (raw.startsWith('0')) {
      raw = raw.replace(/^0+/, '')
    }

    // First digit must be 1 (e.g., 10, 11, 12, 15)
    if (raw.length > 0 && !raw.startsWith('1')) {
      return
    }

    // Only accept maximum 10 digits
    setPhoneNumber(raw.slice(0, 10))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isValidTwoNames(form.full_name)) {
      setError('يرجى إدخال الاسم ثنائياً على الأقل (الاسم واسم العائلة)')
      return
    }

    if (phoneNumber.length !== 10 || !phoneNumber.startsWith('1')) {
      setError('يرجى إدخال رقم هاتف مصري صحيح مكون من 10 أرقام يبدأ بـ 1 (مثال: 1012345678)')
      return
    }

    const fullPhoneNumber = '+20' + phoneNumber.trim()

    if (!isValidEgyptianPhone(fullPhoneNumber)) {
      setError('يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 10 أو 11 أو 12 أو 15')
      return
    }

    setBusy(true)
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: fullPhoneNumber,
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
          <label className="label" htmlFor="phone">رقم الهاتف المحمول</label>
          <div className="phone-input-wrapper">
            <div className="country-code">(+20)</div>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              maxLength={10}
              pattern="1[0-9]{9}"
              placeholder="10xxxxxxxx"
              className="phone-number-input"
              value={phoneNumber}
              onChange={handlePhoneChange}
            />
          </div>
          <span className="phone-hint">
            أدخل 10 أرقام تبدأ بـ 1 (شبكات: 10، 11، 12، 15)
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
