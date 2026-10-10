import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { firstImage } from '../lib/format'

const CartContext = createContext(null)
const KEY = 'lo2ta_cart'

/**
 * Client-side cart with variant support (size & color).
 * Prices here are for display only – the backend recomputes every price & discount at checkout.
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

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const getItemKey = (id, size, color) => `${id}-${size || ''}-${color || ''}`

  const add = (product, qty = 1, options = {}) => {
    const key = getItemKey(product.id, options.size, options.color)
    setItems((prev) => {
      const foundIndex = prev.findIndex(
        (i) => i.key === key || (!i.key && i.id === product.id && i.size === options.size && i.color === options.color)
      )
      if (foundIndex >= 0) {
        return prev.map((item, idx) =>
          idx === foundIndex ? { ...item, qty: Math.min(item.qty + qty, 50) } : item
        )
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          category: product.category,
          size: options.size || null,
          color: options.color || null,
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

  const setQty = (itemKeyOrId, qty) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== itemKeyOrId && i.id !== itemKeyOrId)
        : prev.map((i) =>
            i.key === itemKeyOrId || i.id === itemKeyOrId ? { ...i, qty: Math.min(qty, 50) } : i
          )
    )

  const remove = (itemKeyOrId) =>
    setItems((prev) => prev.filter((i) => i.key !== itemKeyOrId && i.id !== itemKeyOrId))

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

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
