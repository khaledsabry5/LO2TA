import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/format'

const DEFAULT_SECTIONS = [
  { id: 'men', name: 'الرجال', subtitle: 'أناقة كلاسيكية بلمسة عصرية', image_url: '/images/men.jpg' },
  { id: 'women', name: 'النساء', subtitle: 'تفاصيل راقية لكل إطلالة', image_url: '/images/women.jpg' },
]

function getDepartmentSubtitle(name) {
  const n = (name || '').trim()
  if (n.includes('رجال') || n.includes('رجالي')) return 'أناقة كلاسيكية بلمسة عصرية'
  if (n.includes('نساء') || n.includes('نسائي')) return 'تفاصيل راقية لكل إطلالة'
  if (n.includes('اطفال') || n.includes('أطفال')) return 'إطلالات مميزة وحيوية للصغار'
  return 'تفاصيل راقية لكل إطلالة'
}

function getDepartmentLink(dept) {
  const n = (dept.name || '').trim()
  if (n.includes('رجال') || n.includes('رجالي')) return `/shop?gender=men&department=${dept.id}`
  if (n.includes('نساء') || n.includes('نسائي')) return `/shop?gender=women&department=${dept.id}`
  return `/shop?department=${dept.id}`
}

export default function GenderSections() {
  const [departments, setDepartments] = useState(DEFAULT_SECTIONS)

  useEffect(() => {
    let mounted = true
    api.departments()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setDepartments(data)
        }
      })
      .catch((err) => {
        console.warn('Failed to load dynamic departments:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const count = departments.length
  const gridClass =
    count === 1
      ? 'grid grid-cols-1 gap-3 sm:gap-5'
      : count === 2
      ? 'grid grid-cols-2 gap-3 sm:gap-5'
      : count === 3
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5'
      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5'

  return (
    <section aria-labelledby="gender-heading" className="container-x pt-2 sm:pt-6">
      <h2 id="gender-heading" className="sr-only">الفئات الرئيسية</h2>
      <div className={gridClass}>
        {departments.map((dept) => {
          const rawImg = dept.image_url || (dept.id === 'women' ? '/images/women.jpg' : '/images/men.jpg')
          const imgUrl = resolveMediaUrl(rawImg)
          const subtitle = dept.subtitle || getDepartmentSubtitle(dept.name)
          const targetUrl = getDepartmentLink(dept)

          return (
            <Link
              key={dept.id}
              to={targetUrl}
              id={`department-${dept.id}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-cream animate-fade-up sm:aspect-[16/11] lg:aspect-[16/9]"
            >
              <img
                src={imgUrl}
                alt={dept.name}
                onError={(e) => {
                  e.currentTarget.src = dept.name?.includes('نساء') ? '/images/women.jpg' : '/images/men.jpg'
                }}
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 text-center text-white sm:items-start sm:p-7 sm:text-start">
                <h3 className="text-lg font-extrabold drop-shadow sm:text-3xl lg:text-4xl">{dept.name}</h3>
                <p className="hidden text-sm text-white/80 sm:block">{subtitle}</p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[0.7rem] font-bold text-ink transition-all group-hover:gap-3 group-hover:bg-cream sm:px-4 sm:py-2 sm:text-sm">
                  تسوق الآن
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
