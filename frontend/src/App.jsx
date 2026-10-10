import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import StoreLayout from './components/layout/StoreLayout'
import RequireRole from './components/RequireRole'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import MyOrders from './pages/MyOrders'
import NotFound from './pages/NotFound'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import Overview from './pages/dashboard/Overview'
import ProductsAdmin from './pages/dashboard/ProductsAdmin'
import ProductForm from './pages/dashboard/ProductForm'
import OrdersAdmin from './pages/dashboard/OrdersAdmin'
import Customers from './pages/dashboard/Customers'
import Staff from './pages/dashboard/Staff'
import Sales from './pages/dashboard/Sales'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route element={<RequireRole roles={['customer']} />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<MyOrders />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Staff dashboard (Manager + Admin) */}
        <Route element={<RequireRole roles={['manager', 'admin']} />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="orders" element={<OrdersAdmin />} />
            {/* Manager only */}
            <Route element={<RequireRole roles={['manager']} redirect="/dashboard/products" />}>
              <Route path="overview" element={<Overview />} />
              <Route path="sales" element={<Sales />} />
              <Route path="customers" element={<Customers />} />
              <Route path="staff" element={<Staff />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
