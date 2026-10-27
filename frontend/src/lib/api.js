const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'lo2ta_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function extractMessage(data, status) {
  if (!data) return `خطأ غير متوقع (${status})`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join('، ')
  return `خطأ غير متوقع (${status})`
}

export async function request(path, { method = 'GET', body, form, files, params } = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }
  const headers = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (files) {
    payload = new FormData()
    files.forEach((f) => payload.append('files', f))
  } else if (form) {
    payload = new URLSearchParams(form)
  } else if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
  }

  try {
    const res = await fetch(url, { method, headers, body: payload })
    if (res.status === 204) return null
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      if (res.status === 401) tokenStore.clear()
      throw new ApiError(extractMessage(data, res.status), res.status)
    }
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('تعذر الاتصال بالخادم (يرجى التأكد من تشغيل خادم FastAPI).', 0)
  }
}

export const api = {
  // auth
  requestOTP: (email) => request('/auth/request-otp', { method: 'POST', body: { email } }),
  verifyOTP: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  me: () => request('/auth/me'),

  // departments
  departments: () => request('/departments'),
  department: (id) => request(`/departments/${id}`),
  createDepartment: (formData) => request('/departments', { method: 'POST', body: formData }),
  updateDepartment: (id, formData) => request(`/departments/${id}`, { method: 'PUT', body: formData }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: 'DELETE' }),

  // categories
  categories: () => request('/categories'),
  category: (id) => request(`/categories/${id}`),
  categoryProducts: (id, params) => request(`/categories/${id}/products`, { params }),
  createCategory: (formData) => request('/categories', { method: 'POST', body: formData }),
  updateCategory: (id, formData) => request(`/categories/${id}`, { method: 'PUT', body: formData }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // catalog
  latest: () => request('/products/latest'),
  products: (params) => request('/products', { params }),
  filterOptions: (params) => request('/products/filter-options', { params }),
  product: (id) => request(`/products/${id}`),

  // customer orders
  checkout: (data) => request('/orders', { method: 'POST', body: data }),
  myOrders: () => request('/orders/me'),
  cancelMyOrder: (id) => request(`/orders/me/${id}/cancel`, { method: 'POST' }),

  // staff – products
  manageProducts: (params) => request('/products/manage/all', { params }),
  manageProduct: (id) => request(`/products/manage/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  setDiscount: (id, percent) => request(`/products/${id}/discount`, { method: 'PUT', body: { percent } }),
  removeDiscount: (id) => request(`/products/${id}/discount`, { method: 'DELETE' }),
  uploadMedia: (id, files) => request(`/products/${id}/media`, { method: 'POST', files }),
  deleteMedia: (id, mediaId) => request(`/products/${id}/media/${mediaId}`, { method: 'DELETE' }),

  // staff – orders
  fulfillment: (params) => request('/orders', { params }),
  setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: { status } }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // manager only
  analytics: () => request('/manager/analytics'),
  customers: (params) => request('/manager/customers', { params }),
  customer: (id) => request(`/manager/customers/${id}`),
  staff: () => request('/manager/staff'),
  createStaff: (data) => request('/manager/staff', { method: 'POST', body: data }),
  updateStaff: (id, data) => request(`/manager/staff/${id}`, { method: 'PATCH', body: data }),
  deleteStaff: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  sales: (params) => request('/manager/sales', { params }),
  refundSale: (id) => request(`/manager/sales/${id}/refund`, { method: 'POST' }),
  deleteSale: (id) => request(`/manager/sales/${id}`, { method: 'DELETE' }),
  inventoryCost: () => request('/manager/inventory-cost'),

  // expenses & discounts
  getExpenses: (params) => request('/expenses', { params }),
  getExpensesSummary: () => request('/expenses/summary'),
  createExpense: (data) => request('/expenses', { method: 'POST', body: data }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: data }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  clearAllExpenses: () => request('/expenses', { method: 'DELETE' }),
}
