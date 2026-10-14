// Egyptian localization: Egyptian Pound "ج.م"
export const CURRENCY = 'ج.م'

const nf = new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 2 })

export const money = (v) => `${nf.format(Number(v || 0))} ${CURRENCY}`
export const num = (v) => nf.format(Number(v || 0))

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  // If the path refers to frontend public static assets (/images/...), keep it as-is for frontend serving
  if (url.startsWith('/images/') || url.startsWith('images/')) {
    return url.startsWith('/') ? url : `/${url}`
  }
  const base = import.meta.env.VITE_API_URL || ''
  return base ? `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url
}

export const DEFAULT_CATEGORY_FALLBACKS = {
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
  watches: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80',
  glasses: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
}

export function getCategoryFallbackImage(category) {
  const name = typeof category === 'object' ? (category?.name || '') : String(category || '')
  const lower = name.toLowerCase()
  if (
    lower.includes('حذاء') ||
    lower.includes('أحذية') ||
    lower.includes('خفية') ||
    lower.includes('كعب') ||
    lower.includes('shoe') ||
    lower.includes('sneaker')
  ) {
    return DEFAULT_CATEGORY_FALLBACKS.shoes
  }
  if (lower.includes('شنط') || lower.includes('حقيبة') || lower.includes('محفظة') || lower.includes('bag')) {
    return DEFAULT_CATEGORY_FALLBACKS.bags
  }
  if (lower.includes('ساع') || lower.includes('watch')) {
    return DEFAULT_CATEGORY_FALLBACKS.watches
  }
  if (lower.includes('نظار') || lower.includes('glass') || lower.includes('إكسسوار')) {
    return DEFAULT_CATEGORY_FALLBACKS.glasses
  }
  return DEFAULT_CATEGORY_FALLBACKS.default
}

export const CATEGORY_LABELS = {
  shoes: 'الأحذية',
  bags: 'الشنط',
  watches: 'الساعات',
  glasses: 'النظارات والإكسسوارات',
  sunglasses: 'النظارات والإكسسوارات',
}
export const CATEGORY_SINGULAR = {
  shoes: 'أحذية',
  bags: 'شنط',
  watches: 'ساعات',
  glasses: 'نظارات وإكسسوارات',
  sunglasses: 'نظارات وإكسسوارات',
}

export const getCategoryName = (c) => {
  if (!c) return ''
  if (typeof c === 'object') return c.name || ''
  return CATEGORY_LABELS[c] || c
}

export const GENDER_LABELS = { men: 'رجال', women: 'نساء', unisex: 'للجنسين (رجالي ونسائي)' }
export const ROLE_LABELS = { manager: 'مدير', admin: 'مشرف', customer: 'عميل' }

export const ORDER_STATUS = {
  PENDING: { label: 'قيد المراجعة', cls: 'status-badge-pending', selectCls: 'status-select-pending' },
  PROCESSING: { label: 'قيد التجهيز والشحن', cls: 'status-badge-processing', selectCls: 'status-select-processing' },
  DELIVERED: { label: 'تم التوصيل', cls: 'status-badge-delivered', selectCls: 'status-select-delivered' },
  NOT_RECEIVED: { label: 'لم يتم الاستلام', cls: 'status-badge-not-received', selectCls: 'status-select-not-received' },
  // Backward compatibility aliases
  pending: { label: 'قيد المراجعة', cls: 'status-badge-pending', selectCls: 'status-select-pending' },
  processing: { label: 'قيد التجهيز والشحن', cls: 'status-badge-processing', selectCls: 'status-select-processing' },
  confirmed: { label: 'قيد التجهيز والشحن', cls: 'status-badge-processing', selectCls: 'status-select-processing' },
  shipped: { label: 'قيد التجهيز والشحن', cls: 'status-badge-processing', selectCls: 'status-select-processing' },
  delivered: { label: 'تم التوصيل', cls: 'status-badge-delivered', selectCls: 'status-select-delivered' },
  cancelled: { label: 'لم يتم الاستلام', cls: 'status-badge-not-received', selectCls: 'status-select-not-received' },
  not_received: { label: 'لم يتم الاستلام', cls: 'status-badge-not-received', selectCls: 'status-select-not-received' },
}

export const ORDER_STATUS_LIST = [
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'PROCESSING', label: 'قيد التجهيز والشحن' },
  { value: 'DELIVERED', label: 'تم التوصيل' },
  { value: 'NOT_RECEIVED', label: 'لم يتم الاستلام' },
]

export const ACTIVE_ORDER_STATUS_LIST = [
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'PROCESSING', label: 'قيد التجهيز والشحن' },
]

export const getOrderStatusInfo = (status) => {
  if (!status) return ORDER_STATUS.PENDING
  const upper = String(status).toUpperCase()
  return ORDER_STATUS[upper] || ORDER_STATUS[status] || {
    label: status,
    cls: 'status-badge-pending',
    selectCls: 'status-select-pending',
  }
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })

export const firstImage = (p) => p?.media?.find((m) => m.media_type === 'image')?.url
