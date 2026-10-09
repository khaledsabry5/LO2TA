// Change currency in one place (reference design uses Saudi Riyal "ر.س")
export const CURRENCY = 'ر.س'

const nf = new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 2 })

export const money = (v) => `${nf.format(Number(v || 0))} ${CURRENCY}`
export const num = (v) => nf.format(Number(v || 0))

export const CATEGORY_LABELS = { shoes: 'الأحذية', bags: 'الشنط', watches: 'الساعات' }
export const CATEGORY_SINGULAR = { shoes: 'أحذية', bags: 'شنط', watches: 'ساعات' }
export const GENDER_LABELS = { men: 'رجال', women: 'نساء' }
export const ROLE_LABELS = { manager: 'مدير', admin: 'مشرف', customer: 'عميل' }

export const ORDER_STATUS = {
  pending: { label: 'قيد المراجعة', cls: 'bg-cream text-ink' },
  confirmed: { label: 'مؤكد', cls: 'bg-azure/10 text-azure-dark' },
  shipped: { label: 'تم الشحن', cls: 'bg-ink text-white' },
  delivered: { label: 'تم التسليم', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'ملغي', cls: 'bg-sale/10 text-sale' },
}

export const NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })

export const firstImage = (p) => p?.media?.find((m) => m.media_type === 'image')?.url
