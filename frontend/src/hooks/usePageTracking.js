import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const PRODUCT_PATH_REGEX = /^\/product\/\d+\/?$/

/**
 * Custom hook to track page views on route changes.
 *
 * Rules:
 * 1. Exclude Admin / Manager: If the authenticated user has role 'admin' or 'manager', ignore tracking.
 * 2. Restrict to Specific Pages: ONLY tracks exact Home Page ('/') or Product Details ('/product/:id').
 */
export function usePageTracking() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const lastTrackedPath = useRef(null)

  useEffect(() => {
    // 1. Exclude Admin & Manager views completely
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      return
    }

    // 2. Restrict tracking strictly to Home ('/') and Product Details ('/product/:id')
    const cleanPath = pathname ? pathname.split('?')[0].split('#')[0] : '/'
    const isHome = cleanPath === '/'
    const isProduct = PRODUCT_PATH_REGEX.test(cleanPath)

    if (!isHome && !isProduct) {
      return
    }

    // Avoid duplicate immediate calls for the same pathname
    if (lastTrackedPath.current === cleanPath) {
      return
    }
    lastTrackedPath.current = cleanPath

    // Fire and forget; non-blocking
    api.trackPageView(cleanPath).catch((err) => {
      // Silently catch tracking errors so customer experience is completely unaffected
      console.debug('Failed to track page view:', err)
    })
  }, [pathname, user])
}
