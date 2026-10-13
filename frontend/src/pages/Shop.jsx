import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Filter, SearchX, SlidersHorizontal } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import ProductFilter from '../components/ProductFilter'
import { EmptyState, ProductSkeleton } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_LABELS, GENDER_LABELS } from '../lib/format'

const PAGE = 24

function Chip({ active, onClick, children, tone }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
        active ? (tone === 'sale' ? 'bg-sale text-white' : 'bg-ink text-white') : 'bg-cream-100 text-ink hover:bg-cream'
      }`}
    >
      {children}
    </button>
  )
}

export default function Shop() {
  const { category: pathCategory, categoryId } = useParams()
  const [params, setParams] = useSearchParams()

  const rawCategoryParam = categoryId || pathCategory || ''
  const gender = params.get('gender') || ''
  const department = params.get('department') || ''
  const category = params.get('category') || rawCategoryParam || ''
  const discounted = params.get('discounted') === 'true'
  const q = params.get('q') || ''
  const size = params.get('size') || ''
  const color = params.get('color') || ''
  const minPrice = params.get('min_price') || ''
  const maxPrice = params.get('max_price') || ''

  const [allDepartments, setAllDepartments] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [data, setData] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    sizes: [],
    colors: [],
    min_price: 0,
    max_price: 5000,
  })

  // Load all departments & categories
  useEffect(() => {
    api.departments()
      .then((depts) => {
        if (Array.isArray(depts)) setAllDepartments(depts)
      })
      .catch(() => {})

    api.categories()
      .then((cats) => {
        if (Array.isArray(cats)) setAllCategories(cats)
      })
      .catch(() => {})
  }, [])

  const matchedCategory = allCategories.find(
    (c) => String(c.id) === String(category) || c.name === category || c.name.toLowerCase() === category.toLowerCase()
  )
  const isShoes = matchedCategory
    ? (matchedCategory.name === 'الأحذية' || matchedCategory.name.includes('أحذية'))
    : (category === 'shoes' || category === '1')

  // Load available sizes and colors dynamically for shoes
  useEffect(() => {
    if (isShoes) {
      const catFilterVal = matchedCategory ? String(matchedCategory.id) : (category || 'shoes')
      api.filterOptions({ category: catFilterVal, gender: gender || undefined })
        .then((res) => {
          if (res) {
            setFilterOptions(res)
          }
        })
        .catch((err) => {
          console.warn('Failed to load filter options:', err)
        })
    }
  }, [isShoes, matchedCategory, category, gender])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (!value || next.get(key) === String(value)) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams(params)
    if (newFilters.size) next.set('size', newFilters.size)
    else next.delete('size')

    if (newFilters.color) next.set('color', newFilters.color)
    else next.delete('color')

    if (newFilters.minPrice) next.set('min_price', newFilters.minPrice)
    else next.delete('min_price')

    if (newFilters.maxPrice) next.set('max_price', newFilters.maxPrice)
    else next.delete('max_price')

    setParams(next)
  }

  const handleFilterReset = () => {
    const next = new URLSearchParams(params)
    next.delete('size')
    next.delete('color')
    next.delete('min_price')
    next.delete('max_price')
    setParams(next)
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')
    setOffset(0)

    async function fetchProducts() {
      try {
        const queryParams = {
          gender: gender || undefined,
          department: department || undefined,
          category: category || undefined,
          q: q || undefined,
          discounted: discounted || undefined,
          size: size ? Number(size) : undefined,
          color: color || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          limit: PAGE,
          offset: 0,
        }

        const res = await api.products(queryParams)
        if (mounted) {
          setData(res && Array.isArray(res.items) ? res : { total: 0, items: [] })
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'تعذر تحميل المنتجات')
          setData({ total: 0, items: [] })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProducts()
    return () => {
      mounted = false
    }
  }, [gender, department, category, q, discounted, size, color, minPrice, maxPrice])

  const loadMore = async () => {
    const nextOffset = offset + PAGE
    try {
      const res = await api.products({
        gender: gender || undefined,
        department: department || undefined,
        category: category || undefined,
        q: q || undefined,
        discounted: discounted || undefined,
        size: size ? Number(size) : undefined,
        color: color || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        limit: PAGE,
        offset: nextOffset,
      })
      if (res && Array.isArray(res.items)) {
        setData((d) => ({ total: res.total, items: [...(d.items || []), ...res.items] }))
        setOffset(nextOffset)
      }
    } catch (err) {
      console.error('Failed to load more products:', err)
    }
  }

  const matchedDepartment = allDepartments.find((d) => String(d.id) === String(department) || d.name === department)
  const departmentTitle = matchedDepartment?.name || (gender && (gender === 'men' ? 'الرجال' : 'النساء'))
  const categoryTitle = matchedCategory?.name || (CATEGORY_LABELS[category] || (isNaN(Number(category)) ? category : ''))

  const title = q
    ? `نتائج البحث عن «${q}»`
    : [departmentTitle, categoryTitle, discounted && 'العروض']
        .filter(Boolean)
        .join(' · ') || 'جميع المنتجات'

  const activeFiltersCount = [size, color, minPrice, maxPrice].filter(Boolean).length

  return (
    <div className="container-x py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{loading ? '...' : `${data.total} منتج`}</p>
        </div>

        {isShoes && (
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="mobile-filter-trigger"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>تصفية الأحذية</span>
              {activeFiltersCount > 0 && (
                <span className="mobile-filter-count">{activeFiltersCount}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Departments and Categories chips */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {allDepartments.length > 0 ? (
          allDepartments.map((dept) => {
            const isActive = String(department) === String(dept.id) ||
              (!department && dept.name?.includes('رجال') && gender === 'men') ||
              (!department && dept.name?.includes('نساء') && gender === 'women')
            return (
              <Chip
                key={dept.id}
                active={isActive}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  if (isActive) {
                    next.delete('department')
                    next.delete('gender')
                  } else {
                    next.set('department', String(dept.id))
                    if (dept.name?.includes('رجال')) next.set('gender', 'men')
                    else if (dept.name?.includes('نساء')) next.set('gender', 'women')
                    else next.delete('gender')
                  }
                  setParams(next)
                }}
              >
                {dept.name}
              </Chip>
            )
          })
        ) : (
          Object.entries(GENDER_LABELS).map(([k, v]) => (
            <Chip key={k} active={gender === k} onClick={() => update('gender', k)}>{v}</Chip>
          ))
        )}
        <span className="mx-1 w-px shrink-0 bg-black/10" />
        {allCategories.length > 0 ? (
          allCategories.map((c) => {
            const isActive = String(category) === String(c.id) || category === c.name || category === c.name.toLowerCase()
            return (
              <Chip key={c.id} active={isActive} onClick={() => update('category', String(c.id))}>
                {c.name}
              </Chip>
            )
          })
        ) : (
          Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <Chip key={k} active={category === k} onClick={() => update('category', k)}>{v}</Chip>
          ))
        )}
        <span className="mx-1 w-px shrink-0 bg-black/10" />
        <Chip active={discounted} tone="sale" onClick={() => update('discounted', 'true')}>العروض</Chip>
      </div>

      {/* Main Content Area */}
      {isShoes ? (
        <div className="shop-filter-layout mt-6">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block">
            <ProductFilter
              filters={{ size, color, minPrice, maxPrice }}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              availableSizes={filterOptions.sizes}
              availableColors={filterOptions.colors}
            />
          </aside>

          {/* Products Grid Area */}
          <main>
            {loading ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : data.items.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="لا توجد نتائج مطابقة"
                text="جرّب تعديل خيارات المقاس أو اللون أو نطاق السعر للعثور على منتجات."
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-x-5">
                  {data.items.map((p, i) => <ProductCard key={p.id} product={p} index={i % PAGE} />)}
                </div>
                {data.items.length < data.total && (
                  <div className="mt-10 text-center">
                    <button onClick={loadMore} className="btn-outline">عرض المزيد</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      ) : (
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState icon={SearchX} title="لا توجد نتائج" text="جرّب تغيير الفلاتر أو كلمة البحث." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
                {data.items.map((p, i) => <ProductCard key={p.id} product={p} index={i % PAGE} />)}
              </div>
              {data.items.length < data.total && (
                <div className="mt-10 text-center">
                  <button onClick={loadMore} className="btn-outline">عرض المزيد</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Mobile Drawer Filter */}
      {isShoes && mobileFilterOpen && (
        <ProductFilter
          isMobileDrawer
          onCloseMobile={() => setMobileFilterOpen(false)}
          filters={{ size, color, minPrice, maxPrice }}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          availableSizes={filterOptions.sizes}
          availableColors={filterOptions.colors}
        />
      )}
    </div>
  )
}
