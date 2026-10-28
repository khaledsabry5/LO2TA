import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderTree } from 'lucide-react'
import { api } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/format'
import './CategoriesSection.css'

function CategoryCardMedia({ category }) {
  const [failed, setFailed] = useState(false)
  const resolved = resolveMediaUrl(category.image_url)

  if (!resolved || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-sand-subtle text-ink-muted select-none">
        <FolderTree className="h-10 w-10 stroke-1 text-ink-muted/50" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={category.name}
      loading="lazy"
      className="category-card-img"
      onError={() => setFailed(true)}
    />
  )
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.categories()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setCategories(data)
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch categories:', err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section aria-labelledby="categories-heading" className="container-x categories-section-wrapper">
      <div className="categories-section-header">
        <h2 id="categories-heading" className="section-title">التصنيفات</h2>
        <Link to="/shop" className="text-sm font-bold text-ink-muted hover:text-ink">عرض الكل</Link>
      </div>

      {loading && categories.length === 0 ? (
        <div className="categories-2x2-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="category-skeleton-card" />
          ))}
        </div>
      ) : (
        <div className="categories-2x2-grid">
          {categories.map((c) => (
            <Link
              key={c.id}
              id={`category-card-${c.id}`}
              to={`/category/${c.id}`}
              className="category-card"
            >
              <div className="category-card-media">
                <CategoryCardMedia category={c} />
              </div>
              <div className="category-card-content">
                <span className="category-card-title">{typeof c === 'object' ? (c.name || '') : c}</span>
                {typeof c.products_count === 'number' && (
                  <span className="category-card-subtitle">{c.products_count} منتج</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
