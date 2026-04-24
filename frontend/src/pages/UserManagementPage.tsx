import { useState, useEffect, useCallback, FormEvent } from 'react'
import api from '../api/client'
import { useToast } from '../context/ToastContext'

interface AppUser {
  id:        string
  username:  string
  email:     string
  role:      string
  active:    boolean
  createdAt: string | null
}

const ROLES = ['ADMIN', 'WAREHOUSE_MANAGER', 'VIEWER'] as const
type Role = typeof ROLES[number]

const ROLE_BADGE: Record<string, string> = {
  ADMIN:             'badge-red',
  WAREHOUSE_MANAGER: 'badge-blue',
  VIEWER:            'badge-gray',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { show } = useToast()
  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState<Role>('VIEWER')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/users', { username, email, password, role })
      show(`User "${username}" created.`, 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.response?.data?.errors
        ? Object.values(err.response.data.errors).join(', ')
        : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New User</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Username *</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                minLength={3} maxLength={50} required placeholder="john_doe" />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              maxLength={100} required placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label>Password * <span className="text-muted" style={{ fontWeight: 400 }}>(min. 8 characters)</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              minLength={8} maxLength={100} required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Change Role Modal ─────────────────────────────────────────────────────────

function ChangeRoleModal({ user, onClose, onDone }: {
  user: AppUser; onClose: () => void; onDone: () => void
}) {
  const { show } = useToast()
  const [role,    setRole]    = useState<Role>(user.role as Role)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    if (role === user.role) { onClose(); return }
    setLoading(true)
    try {
      await api.patch(`/users/${user.id}/role`, { role })
      show(`Role updated to ${role}.`, 'success')
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">Change Role · {user.username}</span>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group" style={{ margin: '8px 0 16px' }}>
          <label>New Role</label>
          <select value={role} onChange={e => setRole(e.target.value as Role)}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { show }                          = useToast()
  const [users,       setUsers]           = useState<AppUser[]>([])
  const [loading,     setLoading]         = useState(true)
  const [error,       setError]           = useState('')
  const [showCreate,  setShowCreate]      = useState(false)
  const [roleTarget,  setRoleTarget]      = useState<AppUser | null>(null)
  const [toggling,    setToggling]        = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get<AppUser[]>('/users')
      setUsers(data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleActive(u: AppUser) {
    setToggling(u.id)
    try {
      await api.patch(`/users/${u.id}/${u.active ? 'deactivate' : 'activate'}`)
      show(`User "${u.username}" ${u.active ? 'deactivated' : 'activated'}.`, 'success')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Action failed')
    } finally {
      setToggling(null)
    }
  }

  const active   = users.filter(u => u.active)
  const inactive = users.filter(u => !u.active)

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New User</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <>
          {/* Active users */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
              borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Active Users</span>
              <span className="text-muted" style={{ fontWeight: 400 }}>{active.length}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No active users.</td></tr>
                  ) : active.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.username}</td>
                      <td className="text-muted">{u.email}</td>
                      <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>{u.role}</span></td>
                      <td className="text-muted" style={{ fontSize: '.82rem' }}>{fmt(u.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setRoleTarget(u)}>
                            Change Role
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleToggleActive(u)}
                            disabled={toggling === u.id}
                          >
                            {toggling === u.id ? <span className="spinner" /> : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inactive users */}
          {inactive.length > 0 && (
            <div className="card">
              <div style={{ padding: '14px 20px 10px', fontWeight: 700, fontSize: '.9rem',
                borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Inactive Users</span>
                <span className="text-muted" style={{ fontWeight: 400 }}>{inactive.length}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactive.map(u => (
                      <tr key={u.id} style={{ opacity: 0.65 }}>
                        <td className="text-muted">{u.username}</td>
                        <td className="text-muted">{u.email}</td>
                        <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}>{u.role}</span></td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleToggleActive(u)}
                            disabled={toggling === u.id}
                          >
                            {toggling === u.id ? <span className="spinner" /> : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); load() }}
        />
      )}
      {roleTarget && (
        <ChangeRoleModal
          user={roleTarget}
          onClose={() => setRoleTarget(null)}
          onDone={() => { setRoleTarget(null); load() }}
        />
      )}
    </>
  )
}
