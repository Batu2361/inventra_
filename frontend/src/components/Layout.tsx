import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',  icon: '📊', roles: null },
  { to: '/warehouses', label: 'Warehouses',  icon: '🏭', roles: null },
  { to: '/movements',  label: 'Movements',   icon: '📦', roles: null },
  { to: '/users',      label: 'Users',       icon: '👥', roles: ['ADMIN'] },
]

export default function Layout() {
  const { logout, role } = useAuth()
  const navigate          = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <span>🏭</span> Inventra
        </div>

        {NAV.filter(n => !n.roles || n.roles.includes(role)).map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}

        <div className="spacer" />

        <NotificationBell />

        <button className="nav-link btn" style={{ border: 'none', width: '100%', textAlign: 'left' }} onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
