import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-20 text-center">
      <p className="font-logo text-7xl font-bold text-cream-400">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">الصفحة غير موجودة</h1>
      <Link to="/" className="btn-dark mt-6">العودة للرئيسية</Link>
    </div>
  )
}
