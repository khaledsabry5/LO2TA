import { useEffect, useState } from 'react'
import { Check, Filter, RotateCcw, X } from 'lucide-react'
import './ProductFilter.css'

const DEFAULT_SHOES_SIZES = [39, 40, 41, 42, 43, 44]
const DEFAULT_COLORS = [
  { name: 'أسود', className: 'swatch-black' },
  { name: 'بني', className: 'swatch-brown' },
  { name: 'بيج', className: 'swatch-beige' },
]

function getColorClass(colorName, code) {
  if (!colorName) return 'swatch-default'
  const name = colorName.trim().toLowerCase()
  if (name.includes('أسود') || name.includes('اسود') || code === '#111827') return 'swatch-black'
  if (name.includes('بني') || code === '#78350f') return 'swatch-brown'
  if (name.includes('بيج') || code === '#fef3c7') return 'swatch-beige'
  if (name.includes('أبيض') || name.includes('ابيض') || code === '#ffffff') return 'swatch-white'
  if (name.includes('كحلي') || name.includes('أزرق') || name.includes('ازرق')) return 'swatch-navy'
  if (name.includes('رمادي') || name.includes('رصاصي')) return 'swatch-grey'
  if (name.includes('أحمر') || name.includes('احمر')) return 'swatch-red'
  return 'swatch-default'
}

export default function ProductFilter({
  filters = {},
  onChange,
  onReset,
  availableSizes = DEFAULT_SHOES_SIZES,
  availableColors = DEFAULT_COLORS,
  isMobileDrawer = false,
  onCloseMobile,
}) {
  const [localSize, setLocalSize] = useState(filters.size || '')
  const [localColor, setLocalColor] = useState(filters.color || '')
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice || '')
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice || '')

  useEffect(() => {
    setLocalSize(filters.size || '')
    setLocalColor(filters.color || '')
    setLocalMinPrice(filters.minPrice || '')
    setLocalMaxPrice(filters.maxPrice || '')
  }, [filters.size, filters.color, filters.minPrice, filters.maxPrice])

  const handleApply = (overrides = {}) => {
    const nextFilters = {
      size: overrides.size !== undefined ? overrides.size : localSize,
      color: overrides.color !== undefined ? overrides.color : localColor,
      minPrice: overrides.minPrice !== undefined ? overrides.minPrice : localMinPrice,
      maxPrice: overrides.maxPrice !== undefined ? overrides.maxPrice : localMaxPrice,
    }
    onChange(nextFilters)
    if (isMobileDrawer && onCloseMobile) {
      onCloseMobile()
    }
  }

  const handleReset = () => {
    setLocalSize('')
    setLocalColor('')
    setLocalMinPrice('')
    setLocalMaxPrice('')
    if (onReset) onReset()
    if (isMobileDrawer && onCloseMobile) {
      onCloseMobile()
    }
  }

  const toggleSize = (sz) => {
    const next = String(localSize) === String(sz) ? '' : String(sz)
    setLocalSize(next)
    handleApply({ size: next })
  }

  const toggleColor = (colName) => {
    const next = localColor === colName ? '' : colName
    setLocalColor(next)
    handleApply({ color: next })
  }

  const hasActiveFilters = Boolean(
    localSize || localColor || localMinPrice || localMaxPrice
  )

  const sizesList = availableSizes && availableSizes.length > 0 ? availableSizes : DEFAULT_SHOES_SIZES
  const colorsList = availableColors && availableColors.length > 0 ? availableColors : DEFAULT_COLORS

  const content = (
    <div className="filter-card">
      {/* Header */}
      <div className="filter-header">
        <div className="filter-title-wrap">
          <Filter className="filter-icon" />
          <h3 className="filter-title">تصفية الأحذية</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="filter-reset-btn"
            title="إعادة ضبط الفلاتر"
          >
            إعادة ضبط
          </button>
        )}
      </div>

      {/* Active Tags */}
      {hasActiveFilters && (
        <div className="filter-active-tags">
          {localSize && (
            <span
              className="filter-active-tag"
              onClick={() => toggleSize(localSize)}
            >
              مقاس: {localSize}
              <X className="filter-tag-close" />
            </span>
          )}
          {localColor && (
            <span
              className="filter-active-tag"
              onClick={() => toggleColor(localColor)}
            >
              اللون: {localColor}
              <X className="filter-tag-close" />
            </span>
          )}
          {(localMinPrice || localMaxPrice) && (
            <span
              className="filter-active-tag"
              onClick={() => {
                setLocalMinPrice('')
                setLocalMaxPrice('')
                handleApply({ minPrice: '', maxPrice: '' })
              }}
            >
              السعر: {localMinPrice || '0'} - {localMaxPrice || '∞'} ج.م
              <X className="filter-tag-close" />
            </span>
          )}
        </div>
      )}

      {/* 1. Price Range */}
      <div className="filter-section">
        <div className="filter-section-title">
          <span>نطاق السعر</span>
          <span className="filter-badge-hint">بالجنيه المصري</span>
        </div>
        <div className="filter-price-grid">
          <div className="filter-price-field">
            <span className="filter-price-label">الحد الأدنى</span>
            <div className="filter-price-input-wrap">
              <input
                type="number"
                min="0"
                step="50"
                placeholder="من"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="filter-price-input"
              />
              <span className="filter-currency-badge">ج.م</span>
            </div>
          </div>
          <div className="filter-price-field">
            <span className="filter-price-label">الحد الأقصى</span>
            <div className="filter-price-input-wrap">
              <input
                type="number"
                min="0"
                step="50"
                placeholder="إلى"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                className="filter-price-input"
              />
              <span className="filter-currency-badge">ج.م</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Shoe Size */}
      <div className="filter-section">
        <div className="filter-section-title">
          <span>المقاس</span>
          <span className="filter-badge-hint">مقاسات الأحذية المتاحة</span>
        </div>
        <div className="filter-size-grid">
          {sizesList.map((sz) => {
            const isSelected = String(localSize) === String(sz)
            return (
              <button
                key={sz}
                type="button"
                onClick={() => toggleSize(sz)}
                className={`filter-size-btn ${isSelected ? 'active' : ''}`}
                aria-pressed={isSelected}
              >
                {sz}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Color */}
      <div className="filter-section">
        <div className="filter-section-title">
          <span>اللون</span>
          <span className="filter-badge-hint">الألوان المتوفرة</span>
        </div>
        <div className="filter-color-grid">
          {colorsList.map((col) => {
            const colName = typeof col === 'string' ? col : col.name
            const colCode = typeof col === 'object' ? col.code : null
            const isSelected = localColor === colName
            const swatchClass = getColorClass(colName, colCode)

            return (
              <button
                key={colName}
                type="button"
                onClick={() => toggleColor(colName)}
                className={`filter-color-btn ${isSelected ? 'active' : ''}`}
                aria-pressed={isSelected}
              >
                <div className="filter-color-meta">
                  <span className={`filter-color-circle ${swatchClass}`} />
                  <span>{colName}</span>
                </div>
                {isSelected && <Check className="filter-check-icon" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="filter-action-box">
        <button
          type="button"
          onClick={() => handleApply()}
          className="filter-apply-btn"
        >
          <span>تطبيق الفلتر</span>
        </button>
      </div>
    </div>
  )

  if (isMobileDrawer) {
    return (
      <div className="filter-drawer-overlay" onClick={onCloseMobile}>
        <div className="filter-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="filter-drawer-header">
            <h3 className="filter-title">تصفية المنتجات</h3>
            <button
              type="button"
              onClick={onCloseMobile}
              className="filter-drawer-close-btn"
              aria-label="إغلاق"
            >
              <X className="filter-icon" />
            </button>
          </div>
          {content}
        </div>
      </div>
    )
  }

  return content
}
