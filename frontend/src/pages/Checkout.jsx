import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Alert, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { handleEgyptianPhoneChange, isValidEgyptianPhone, isValidTwoNames } from '../lib/phone'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const [form, setForm] = useState({
    shipping_name: user?.full_name || '',
    shipping_phone: user?.phone || '+20',
    shipping_city: '',
    shipping_address: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState(null)

  if (order)
    return (
      <div className="container-x flex flex-col items-center py-16 text-center animate-fade-up">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold">تم استلام طلبك بنجاح!</h1>
        <p className="mt-2 text-ink-muted">
          رقم الطلب #{order.id} · الإجمالي {money(order.total)}
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/orders" className="btn-dark">
            طلباتي
          </Link>
          <Link to="/" className="btn-outline">
            متابعة التسوق
          </Link>
        </div>
      </div>
    )

  if (!items.length) return <Navigate to="/cart" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handlePhone = (e) => {
    const formatted = handleEgyptianPhoneChange(e.target.value)
    setForm((f) => ({ ...f, shipping_phone: formatted }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!isValidTwoNames(form.shipping_name)) {
      setError('يرجى إدخال اسم المستلم ثنائياً على الأقل')
      return
    }

    if (!isValidEgyptianPhone(form.shipping_phone)) {
      setError('يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ +201 (مثال: +201012345678)')
      return
    }

    setBusy(true)
    try {
      const res = await api.checkout({
        shipping_name: form.shipping_name.trim(),
        shipping_phone: form.shipping_phone.trim(),
        shipping_city: form.shipping_city.trim(),
        shipping_address: form.shipping_address.trim(),
        notes: form.notes ? form.notes.trim() : null,
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.qty,
          selected_size: i.size || null,
          selected_color: i.color || null,
        })),
      })
      clear()
      setOrder(res)
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تأكيد الطلب')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold sm:text-3xl">إتمام الشراء</h1>
      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card space-y-4 p-5">
          <h2 className="font-extrabold">بيانات الشحن</h2>
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="shipping_name">
                الاسم الكامل (ثنائي على الأقل)
              </label>
              <input
                id="shipping_name"
                required
                className="input"
                placeholder="مثال: أحمد محمد علي"
                value={form.shipping_name}
                onChange={set('shipping_name')}
              />
            </div>
            <div>
              <label className="label" htmlFor="shipping_phone">
                رقم الهاتف المصري (+20)
              </label>
              <input
                id="shipping_phone"
                required
                dir="ltr"
                placeholder="+2010xxxxxxxx"
                className="input text-end font-mono"
                value={form.shipping_phone}
                onChange={handlePhone}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="shipping_city">
              المحافظة / المدينة
            </label>
            <input
              id="shipping_city"
              required
              placeholder="مثال: القاهرة / الجيزة / الإسكندرية"
              className="input"
              value={form.shipping_city}
              onChange={set('shipping_city')}
            />
          </div>
          <div>
            <label className="label" htmlFor="shipping_address">
              العنوان بالتفصيل
            </label>
            <textarea
              id="shipping_address"
              required
              rows={3}
              placeholder="اسم الشارع، رقم العمارة، رقم الشقة أو علامة مميزة"
              className="input"
              value={form.shipping_address}
              onChange={set('shipping_address')}
            />
          </div>
          <div>
            <label className="label" htmlFor="notes">
              ملاحظات التوصيل (اختياري)
            </label>
            <input
              id="notes"
              placeholder="أي تعليمات للمندوب..."
              className="input"
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
          <p className="rounded-xl bg-cream-100 p-3 text-sm">
            طريقة الدفع: <b>الدفع نقدياً عند الاستلام (COD)</b>
          </p>
        </div>

        <aside className="card h-fit space-y-3 p-5">
          <h2 className="text-lg font-extrabold">المنتجات ({items.length})</h2>
          <ul className="max-h-64 space-y-2 overflow-y-auto divide-y divide-black/5 text-xs">
            {items.map((i) => (
              <li key={i.key || i.id} className="flex justify-between py-2">
                <div>
                  <p className="font-bold">{i.name}</p>
                  <p className="text-ink-muted">
                    {i.qty} × {money(i.final_price)}
                    {i.size && ` · مقاس ${i.size}`}
                    {i.color && ` · لون ${i.color}`}
                  </p>
                </div>
                <span className="font-bold">{money(i.final_price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="h-px bg-black/5" />
          <div className="flex justify-between font-extrabold text-base">
            <span>المبلغ المستحق:</span>
            <span>{money(total)}</span>
          </div>
          <button id="place-order-submit" disabled={busy} className="btn-dark w-full">
            {busy ? <Spinner /> : 'تأكيد الطلب'}
          </button>
        </aside>
      </form>
    </div>
  )
}
