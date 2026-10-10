import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  { key: 'men', title: 'الرجال', subtitle: 'أناقة كلاسيكية بلمسة عصرية', img: '/images/men.jpg' },
  { key: 'women', title: 'النساء', subtitle: 'تفاصيل راقية لكل إطلالة', img: '/images/women.jpg' },
]

export default function GenderSections() {
  return (
    <section aria-labelledby="gender-heading" className="container-x pt-2 sm:pt-6">
      <h2 id="gender-heading" className="sr-only">الأقسام</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {SECTIONS.map((s, i) => (
          <Link
            key={s.key}
            to={`/shop?gender=${s.key}`}
            id={`gender-${s.key}`}
            className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-cream animate-fade-up sm:aspect-[16/11] lg:aspect-[16/9]"
          >
            <img
              src={s.img}
              alt={s.title}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 text-center text-white sm:items-start sm:p-7 sm:text-start">
              <h3 className="text-lg font-extrabold drop-shadow sm:text-3xl lg:text-4xl">{s.title}</h3>
              <p className="hidden text-sm text-white/80 sm:block">{s.subtitle}</p>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[0.7rem] font-bold text-ink transition-all group-hover:gap-3 group-hover:bg-cream sm:px-4 sm:py-2 sm:text-sm">
                تسوق الآن
                <ArrowLeft className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
