import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, Package } from 'lucide-react'
import { EmptyState } from '../components/ui'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { money, resolveMediaUrl } from '../lib/format'

function CartItemThumb({ src, alt }) {
  const [failed, setFailed] = useState(false)
  const resolved = resolveMediaUrl(src)

  if (!resolved || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-cream-200 text-ink-muted">
        <Package className="h-6 w-6 opacity-40" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  )
}

export default function Cart() {
  const { items, setQty, remove, subtotal, total, savings } = useCart()
  const { user, isStaff } = useAuth()
  const navigate = useNavigate()

  if (!items.length)
    return (
      <div className="container-x py-10">
        <EmptyState
          icon={ShoppingBag}
          title="سلتك فارغة"
          text="ابدأ التسوق وأضف منتجاتك المفضلة."
          action={
            <Link to="/shop" className="btn-dark">
              تسوق الآن
            </Link>
          }
        />
      </div>
    )

  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-extrabold sm:text-3xl">سلة التسوق</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {items.map((i) => {
            const itemKey = i.key || i.id
            return (
              <li key={itemKey} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
                <Link
                  to={`/product/${i.id}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-100 sm:h-28 sm:w-28"
                >
                  <CartItemThumb src={i.image} alt={i.name} />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/product/${i.id}`} className="font-bold leading-snug">
                      {i.name}
                    </Link>
                    <button
                      onClick={() => remove(itemKey)}
                      className="text-ink-muted hover:text-sale"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Size & Color variant tags */}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {i.size && (
                      <span className="rounded-md bg-cream-100 px-2 py-0.5 text-xs font-bold text-ink">
                        المقاس: {i.size}
                      </span>
                    )}
                    {i.color && (
                      <span className="rounded-md bg-cream-100 px-2 py-0.5 text-xs font-bold text-ink">
                        اللون: {i.color}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="font-extrabold">{money(i.final_price)}</span>
                    {i.discount_percent > 0 && (
                      <span className="text-xs text-ink-muted line-through">{money(i.price)}</span>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-lg ring-1 ring-black/10">
                      <button
                        onClick={() => setQty(itemKey, i.qty + 1)}
                        className="grid h-8 w-8 place-items-center"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                      <button
                        onClick={() => setQty(itemKey, i.qty - 1)}
                        className="grid h-8 w-8 place-items-center"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold">{money(i.final_price * i.qty)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>
          <div className="flex justify-between text-sm">
            <span>المجموع</span>
            <span>{money(subtotal)}</span>
          </div>
          {savings > 0 && (
            <div className="flex justify-between text-sm font-bold text-sale">
              <span>الخصم</span>
              <span>- {money(savings)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>الشحن</span>
            <span className="text-emerald-600 font-bold">مجاني</span>
          </div>
          <div className="h-px bg-black/5" />
          <div className="flex justify-between text-lg font-extrabold">
            <span>الإجمالي</span>
            <span>{money(total)}</span>
          </div>
          {isStaff ? (
            <p className="rounded-xl bg-cream-100 p-3 text-center text-xs">
              حسابات الإدارة لا يمكنها إتمام الشراء.
            </p>
          ) : (
            <button
              id="checkout-button"
              onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
              className="btn-dark w-full"
            >
              إتمام الشراء
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
