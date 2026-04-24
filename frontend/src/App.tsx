import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'

// Lazy-loaded pages – each route becomes a separate chunk (< 50 KB each)
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const ProductDetailPage    = lazy(() => import('./pages/ProductDetailPage'))
const WarehousesPage       = lazy(() => import('./pages/WarehousesPage'))
const MovementsPage        = lazy(() => import('./pages/MovementsPage'))
const UserManagementPage   = lazy(() => import('./pages/UserManagementPage'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="products/:id" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
        <Route path="warehouses"   element={<Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense>} />
        <Route path="movements"    element={<Suspense fallback={<PageLoader />}><MovementsPage /></Suspense>} />
        <Route path="users"        element={<Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
