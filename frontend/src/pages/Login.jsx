import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { handleEgyptianPhoneChange, STAFF_PASSWORD_REGEX } from '../lib/phone'

export default function Login() {
  const { login, passwordlessLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Mode: 'customer' (passwordless) vs 'staff' (4-character password)
  const [mode, setMode] = useState('customer')

  // Customer form
  const [identifier, setIdentifier] = useState('+20')

  // Staff form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const me = await passwordlessLogin(identifier.trim())
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول')
    } finally {
      setBusy(false)
    }
  }

  const handleStaffSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!STAFF_PASSWORD_REGEX.test(password)) {
      setError('كلمة مرور الإدارة يجب أن تتكون من 4 خانات وحروف أو أرقام إنجليزية فقط')
      return
    }

    setBusy(true)
    try {
      const me = await login(email.trim(), password)
      const staff = me?.role === 'manager' || me?.role === 'admin'
      navigate(location.state?.from || (staff ? '/dashboard' : '/'), { replace: true })
    } catch (err) {
      setError(err.message || 'بيانات الدخول غير صحيحة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-x flex justify-center py-10 sm:py-16">
      <div className="card w-full max-w-md space-y-5 p-6 sm:p-8 animate-fade-up">
        <div className="text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-extrabold">تسجيل الدخول</h1>
          <p className="mt-1 text-xs text-ink-muted">اختر نوع الحساب للمتابعة</p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream-100 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('customer')
              setError('')
            }}
            className={`rounded-xl py-2.5 text-xs font-extrabold transition ${
              mode === 'customer' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            دخول العملاء (سريع)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('staff')
              setError('')
            }}
            className={`rounded-xl py-2.5 text-xs font-extrabold transition ${
              mode === 'staff' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            دخول الإدارة والمشرفين
          </button>
        </div>

        {error && <Alert>{error}</Alert>}

        {mode === 'customer' ? (
          /* Passwordless Customer Login Form */
          <form onSubmit={handleCustomerSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="customer-identifier">
                رقم الهاتف المصري أو البريد الإلكتروني
              </label>
              <input
                id="customer-identifier"
                required
                dir="ltr"
                placeholder="+2010xxxxxxxx أو email@example.com"
                className="input text-end font-mono"
                value={identifier}
                onChange={(e) => {
                  const val = e.target.value
                  if (val.includes('@')) {
                    setIdentifier(val)
                  } else {
                    setIdentifier(handleEgyptianPhoneChange(val))
                  }
                }}
              />
              <span className="mt-1 block text-[0.7rem] text-ink-muted">
                تسجيل دخول آمن وفوري بدون الحاجة لكلمة مرور
              </span>
            </div>

            <button id="login-submit-customer" disabled={busy} className="btn-dark w-full">
              {busy ? <Spinner /> : 'دخول فوري إلى حسابي'}
            </button>

            <p className="text-center text-sm text-ink-muted">
              عميل جديد؟{' '}
              <Link to="/register" state={location.state} className="font-bold text-ink underline">
                إنشاء حساب جديد
              </Link>
            </p>
          </form>
        ) : (
          /* Staff Login Form with 4-character password */
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="staff-email">
                البريد الإلكتروني للإدارة
              </label>
              <input
                id="staff-email"
                type="text"
                dir="ltr"
                required
                placeholder="admin@lo2ta.com أو admin"
                className="input text-end"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="staff-password">
                كلمة المرور (4 خانات)
              </label>
              <input
                id="staff-password"
                type="password"
                dir="ltr"
                required
                maxLength={4}
                placeholder="****"
                className="input text-end font-mono tracking-widest text-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="mt-1 block text-[0.7rem] text-ink-muted">
                سياسة الأمان: 4 خانات وحروف/أرقام إنجليزية فقط (Regex: ^[a-zA-Z0-9]&#123;4&#125;$)
              </span>
            </div>

            <button id="login-submit-staff" disabled={busy} className="btn-dark w-full">
              {busy ? <Spinner /> : 'دخول لوحة التحكم'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
