import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'

/**
 * Custom hook to track page views on route changes.
 * Automatically invokes POST /api/track-view with the active pathname.
 */
export function usePageTracking() {
  const { pathname } = useLocation()
  const lastTrackedPath = useRef(null)

  useEffect(() => {
    // Avoid duplicate immediate calls for the same pathname
    if (lastTrackedPath.current === pathname) {
      return
    }
    lastTrackedPath.current = pathname

    // Fire and forget; non-blocking
    api.trackPageView(pathname).catch((err) => {
      // Silently catch tracking errors so customer experience is completely unaffected
      console.debug('Failed to track page view:', err)
    })
  }, [pathname])
}
