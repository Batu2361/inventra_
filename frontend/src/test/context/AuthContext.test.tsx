import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import api from '../../api/client'

vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}))

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> }

// Helper component that exercises useAuth
function AuthConsumer() {
  const { token, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <button onClick={() => login('admin', 'pass')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('AuthContext', () => {
  it('stores token in localStorage on successful login', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { token: 'jwt-abc-123' } })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    await act(async () => {
      screen.getByText('Login').click()
    })

    expect(localStorage.getItem('token')).toBe('jwt-abc-123')
    expect(screen.getByTestId('token').textContent).toBe('jwt-abc-123')
  })

  it('removes token from localStorage on logout', async () => {
    localStorage.setItem('token', 'existing-token')

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    act(() => {
      screen.getByText('Logout').click()
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(screen.getByTestId('token').textContent).toBe('null')
  })

  it('throws if useAuth is used outside AuthProvider', () => {
    // Suppress expected console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function Orphan() {
      useAuth()
      return null
    }

    expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider')

    spy.mockRestore()
  })
})
