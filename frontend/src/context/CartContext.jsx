import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { firstImage } from '../lib/format'

const CartContext = createContext(null)
const KEY = 'lo2ta_cart'

/**
 * Client-side cart. Prices here are for display only – the backend
 * recomputes every price & discount at checkout.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || []
    } catch {
      return []
    }
  })
  const [bump, setBump] = useState(0)

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items])

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id)
      if (found) return prev.map((i) => (i.id === product.id ? { ...i, qty: Math.min(i.qty + qty, 50) } : i))
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          final_price: product.final_price,
          discount_percent: product.discount_percent,
          image: firstImage(product),
          qty,
        },
      ]
    })
    setBump((b) => b + 1)
  }

  const setQty = (id, qty) =>
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 50) } : i))))
  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id))
  const clear = () => setItems([])

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0)
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const total = items.reduce((s, i) => s + i.final_price * i.qty, 0)
    return { items, count, subtotal, total, savings: subtotal - total, add, setQty, remove, clear, bump }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, bump])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
