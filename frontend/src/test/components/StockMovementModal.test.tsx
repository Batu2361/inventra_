import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../context/ToastContext'
import StockMovementModal from '../../components/StockMovementModal'
import api from '../../api/client'

/** Wrap any component that calls useToast() in ToastProvider. */
function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

// Mock the API client
vi.mock('../../api/client', () => ({
  default: {
    get:  vi.fn(),
    post: vi.fn(),
  },
}))

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

const defaultProps = {
  productId:   'prod-uuid-123',
  productName: 'Test Widget',
  onClose:     vi.fn(),
  onDone:      vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // Warehouses endpoint returns empty list by default
  mockedApi.get.mockResolvedValue({ data: [] })
})

describe('StockMovementModal', () => {
  it('renders with the product name', async () => {
    renderWithToast(<StockMovementModal {...defaultProps} />)
    expect(screen.getByText('Test Widget')).toBeInTheDocument()
    expect(screen.getByText('Book Movement')).toBeInTheDocument()
  })

  it('submits INBOUND movement with correct payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} })

    renderWithToast(<StockMovementModal {...defaultProps} />)

    // Select INBOUND (default) and set quantity
    const qtyInput = screen.getByPlaceholderText('e.g. 50')
    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '25')

    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/products/prod-uuid-123/movements',
        expect.objectContaining({ type: 'INBOUND', quantity: 25 }),
      )
    })
  })

  it('shows error message on API failure', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: { data: { detail: 'Insufficient stock' } },
    })

    renderWithToast(<StockMovementModal {...defaultProps} />)

    const qtyInput = screen.getByPlaceholderText('e.g. 50')
    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '999')

    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => {
      expect(screen.getByText('Insufficient stock')).toBeInTheDocument()
    })
  })

  it('quantity field starts empty and enforces min=1', async () => {
    renderWithToast(<StockMovementModal {...defaultProps} />)

    const qtyInput = screen.getByPlaceholderText('e.g. 50') as HTMLInputElement
    expect(qtyInput.value).toBe('')
    expect(qtyInput).toHaveAttribute('min', '1')
  })

  it('close button calls onClose', async () => {
    const onClose = vi.fn()
    renderWithToast(<StockMovementModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
