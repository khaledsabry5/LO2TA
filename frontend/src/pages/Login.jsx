import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import { Alert, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { requestOTP, verifyOTP } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Step 1: 'email' (Email input & Request OTP)
  // Step 2: 'otp' (6-digit OTP input & Verify)
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Countdown effect for OTP resend cooldown
  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  // Step 1: Request OTP code via email
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح')
      return
    }

    setBusy(true)
    try {
      const res = await requestOTP(cleanEmail)
      setSuccessMsg(res?.message || `تم إرسال رمز التحقق بنجاح إلى ${cleanEmail}`)
      setStep(2)
      setResendTimer(60)
    } catch (err) {
      setError(err.message || 'تعذر إرسال رمز التحقق، يرجى التأكد من صحة البريد الإلكتروني')
    } finally {
      setBusy(false)
    }
  }

  // Step 2: Verify OTP code and login
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')

    const cleanOtp = otp.trim()
    if (cleanOtp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام كاملاً')
      return
    }

    setBusy(true)
    try {
      const res = await verifyOTP(email.trim().toLowerCase(), cleanOtp)
      const userRole = res?.role || res?.user?.role
      const isStaffOrAdmin = userRole === 'manager' || userRole === 'admin'

      // Redirect based on role
      const defaultPath = isStaffOrAdmin ? '/dashboard' : '/'
      const redirectTarget = location.state?.from || defaultPath
      navigate(redirectTarget, { replace: true })
    } catch (err) {
      setError(err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية')
    } finally {
      setBusy(false)
    }
  }

  // Allow user to edit their email and return to Step 1
  const handleChangeEmail = () => {
    setStep(1)
    setOtp('')
    setError('')
    setSuccessMsg('')
  }

  // Resend OTP code while on Step 2
  const handleResendOtp = async () => {
    if (resendTimer > 0 || busy) return
    setError('')
    setBusy(true)
    try {
      const res = await requestOTP(email.trim().toLowerCase())
      setSuccessMsg(res?.message || 'تمت إعادة إرسال رمز التحقق بنجاح')
      setResendTimer(60)
    } catch (err) {
      setError(err.message || 'تعذر إعادة إرسال رمز التحقق')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <Logo />
          <h1 className="login-title">
            {step === 1 ? 'تسجيل الدخول' : 'رمز التحقق (OTP)'}
          </h1>
          <p className="login-subtitle">
            {step === 1
              ? 'تسجيل دخول موحد وآمن لجميع المستخدمين والإدارة عبر البريد الإلكتروني'
              : 'أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك الإلكتروني'}
          </p>
        </div>

        {error && <Alert>{error}</Alert>}
        {successMsg && !error && (
          <div className="login-success-badge">{successMsg}</div>
        )}

        {step === 1 ? (
          /* STEP 1: Single Email Input & Send Code Button */
          <form onSubmit={handleRequestOtp} className="login-form">
            <div className="login-field-group">
              <label className="login-label" htmlFor="login-email">
                البريد الإلكتروني
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoFocus
                dir="ltr"
                placeholder="example@ysn.com"
                className="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              id="login-send-otp-btn"
              type="submit"
              disabled={busy}
              className="login-submit-btn"
            >
              {busy ? <Spinner /> : 'إرسال رمز التحقق'}
            </button>

            <div className="login-footer-links">
              عميل جديد؟{' '}
              <Link
                to="/register"
                state={location.state}
                className="login-register-link"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          </form>
        ) : (
          /* STEP 2: 6-digit OTP Input & Verify Button */
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-sent-banner">
              <div className="otp-sent-details">
                <span className="otp-sent-label">تم إرسال الرمز إلى:</span>
                <span className="otp-sent-email">{email}</span>
              </div>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="otp-change-email-btn"
              >
                تغيير البريد
              </button>
            </div>

            <div className="login-field-group">
              <label className="login-label" htmlFor="login-otp-code">
                رمز التحقق (6 أرقام)
              </label>
              <div className="otp-code-input-wrapper">
                <input
                  id="login-otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="------"
                  className="otp-code-input"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(val)
                  }}
                />
              </div>
              <p className="otp-hint-text">
                ينتهي الرمز خلال 10 دقائق من وقت الإرسال
              </p>
            </div>

            <button
              id="login-verify-otp-btn"
              type="submit"
              disabled={busy || otp.length !== 6}
              className="login-submit-btn"
            >
              {busy ? <Spinner /> : 'تأكيد وتسجيل الدخول'}
            </button>

            <div className="otp-resend-wrapper">
              <button
                type="button"
                disabled={resendTimer > 0 || busy}
                onClick={handleResendOtp}
                className="otp-resend-btn"
              >
                {resendTimer > 0
                  ? `إعادة إرسال الرمز بعد (${resendTimer} ثانية)`
                  : 'لم يصلك الرمز؟ إعادة الإرسال'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
