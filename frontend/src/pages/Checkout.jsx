import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Alert, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const [form, setForm] = useState({
    shipping_name: user?.full_name || '',
    shipping_phone: user?.phone || '',
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
        <p className="mt-2 text-ink-muted">رقم الطلب #{order.id} · الإجمالي {money(order.total)}</p>
        <div className="mt-6 flex gap-3">
          <Link to="/orders" className="btn-dark">طلباتي</Link>
          <Link to="/" className="btn-outline">متابعة التسوق</Link>
        </div>
      </div>
    )

  if (!items.length) return <Navigate to="/cart" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api.checkout({
        ...form,
        notes: form.notes || null,
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty })),
      })
      clear()
      setOrder(res)
    } catch (err) {
      setError(err.message)
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
            <div><label className="label" htmlFor="shipping_name">الاسم الكامل</label><input id="shipping_name" required className="input" value={form.shipping_name} onChange={set('shipping_name')} /></div>
            <div><label className="label" htmlFor="shipping_phone">رقم الجوال</label><input id="shipping_phone" required dir="ltr" className="input text-end" value={form.shipping_phone} onChange={set('shipping_phone')} /></div>
          </div>
          <div><label className="label" htmlFor="shipping_city">المدينة</label><input id="shipping_city" required className="input" value={form.shipping_city} onChange={set('shipping_city')} /></div>
          <div><label className="label" htmlFor="shipping_address">العنوان بالتفصيل</label><textarea id="shipping_address" required rows={3} className="input" value={form.shipping_address} onChange={set('shipping_address')} /></div>
          <div><label className="label" htmlFor="notes">ملاحظات (اختياري)</label><input id="notes" className="input" value={form.notes} onChange={set('notes')} /></div>
          <p className="rounded-xl bg-cream-100 p-3 text-sm">طريقة الدفع: <b>الدفع عند الاستلام</b></p>
        </div>
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="font-extrabold">طلبك</h2>
          {items.map((i) => (
            <div key={i.id} className="flex justify-between gap-2 text-sm">
              <span className="line-clamp-1">{i.name} × {i.qty}</span>
              <span className="shrink-0">{money(i.final_price * i.qty)}</span>
            </div>
          ))}
          <div className="h-px bg-black/5" />
          <div className="flex justify-between text-lg font-extrabold"><span>الإجمالي</span><span>{money(total)}</span></div>
          <button id="place-order" disabled={busy} className="btn-dark w-full">{busy ? <Spinner /> : 'تأكيد الطلب'}</button>
          <p className="text-center text-xs text-ink-muted">يتم احتساب السعر النهائي من الخادم عند التأكيد.</p>
        </aside>
      </form>
    </div>
  )
}
