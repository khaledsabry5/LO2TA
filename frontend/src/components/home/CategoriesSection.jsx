import { Link } from 'react-router-dom'

// Order per spec: 1- Shoes, 2- Bags, 3- Watches (rendered right-to-left)
const CATEGORIES = [
  { key: 'shoes', label: 'الأحذية', img: '/images/products/sneaker.jpg' },
  { key: 'bags', label: 'الشنط', img: '/images/products/handbag.jpg' },
  { key: 'watches', label: 'الساعات', img: '/images/products/steel-watch.jpg' },
]

export default function CategoriesSection() {
  return (
    <section aria-labelledby="categories-heading" className="container-x mt-10 sm:mt-14">
      <div className="mb-4 flex items-end justify-between sm:mb-6">
        <h2 id="categories-heading" className="section-title">التصنيفات</h2>
        <Link to="/shop" className="text-sm font-bold text-ink-muted hover:text-ink">عرض الكل</Link>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        {CATEGORIES.map((c, i) => (
          <Link
            key={c.key}
            id={`category-${c.key}`}
            to={`/shop?category=${c.key}`}
            className="group flex flex-col overflow-hidden rounded-2xl bg-cream ring-1 ring-cream-300/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up sm:rounded-3xl"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={c.img}
                alt={c.label}
                loading="lazy"
                className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <span className="py-2.5 text-center text-sm font-extrabold text-ink sm:py-4 sm:text-lg">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
