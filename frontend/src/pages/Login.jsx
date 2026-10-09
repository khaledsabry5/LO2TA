import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const me = await login(email, password)
      const staff = me?.role === 'manager' || me?.role === 'admin'
      navigate(location.state?.from || (staff ? '/dashboard' : '/'), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-x flex justify-center py-10 sm:py-16">
      <form onSubmit={submit} className="card w-full max-w-md space-y-5 p-6 sm:p-8 animate-fade-up">
        <div className="text-center">
          <Logo />
          <h1 className="mt-4 text-xl font-extrabold">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-ink-muted">أهلاً بعودتك!</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <div><label className="label" htmlFor="email">البريد الإلكتروني</label><input id="email" type="email" dir="ltr" required className="input text-end" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label" htmlFor="password">كلمة المرور</label><input id="password" type="password" dir="ltr" required className="input text-end" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button id="login-submit" disabled={busy} className="btn-dark w-full">{busy ? <Spinner /> : 'دخول'}</button>
        <p className="text-center text-sm text-ink-muted">ليس لديك حساب؟ <Link to="/register" state={location.state} className="font-bold text-ink underline">إنشاء حساب</Link></p>
      </form>
    </div>
  )
}
