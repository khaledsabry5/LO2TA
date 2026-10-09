import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register({ ...form, phone: form.phone || null })
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message)
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
        </div>
        {error && <Alert>{error}</Alert>}
        <div><label className="label" htmlFor="full_name">الاسم الكامل</label><input id="full_name" required minLength={2} className="input" value={form.full_name} onChange={set('full_name')} /></div>
        <div><label className="label" htmlFor="reg-email">البريد الإلكتروني</label><input id="reg-email" type="email" dir="ltr" required className="input text-end" value={form.email} onChange={set('email')} /></div>
        <div><label className="label" htmlFor="phone">رقم الجوال</label><input id="phone" dir="ltr" className="input text-end" value={form.phone} onChange={set('phone')} /></div>
        <div><label className="label" htmlFor="reg-password">كلمة المرور (8 أحرف على الأقل)</label><input id="reg-password" type="password" dir="ltr" required minLength={8} className="input text-end" value={form.password} onChange={set('password')} /></div>
        <button id="register-submit" disabled={busy} className="btn-dark w-full">{busy ? <Spinner /> : 'إنشاء الحساب'}</button>
        <p className="text-center text-sm text-ink-muted">لديك حساب؟ <Link to="/login" state={location.state} className="font-bold text-ink underline">تسجيل الدخول</Link></p>
      </form>
    </div>
  )
}
