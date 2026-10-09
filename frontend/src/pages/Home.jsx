import { Truck, ShieldCheck, RotateCcw } from 'lucide-react'
import GenderSections from '../components/home/GenderSections'
import CategoriesSection from '../components/home/CategoriesSection'
import LatestArrivals from '../components/home/LatestArrivals'

export default function Home() {
  return (
    <>
      <h1 className="sr-only">لقطة للإكسسوارات – أحذية وشنط وساعات للرجال والنساء</h1>
      {/* 1) Gender sections */}
      <GenderSections />
      {/* 2) Categories */}
      <CategoriesSection />
      {/* 3) Latest arrivals (20) */}
      <LatestArrivals />

      <section className="container-x mt-14">
        <div className="grid grid-cols-3 gap-2 rounded-3xl bg-cream-50 p-4 ring-1 ring-cream sm:gap-6 sm:p-8">
          {[
            { icon: Truck, t: 'شحن سريع' },
            { icon: ShieldCheck, t: 'منتجات أصلية' },
            { icon: RotateCcw, t: 'استرجاع سهل' },
          ].map(({ icon: Icon, t }) => (
            <div key={t} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center sm:gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-cream sm:h-12 sm:w-12">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold sm:text-base">{t}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
