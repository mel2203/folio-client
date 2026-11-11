import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ContactDirectoryPage from '../src/pages/ContactDirectoryPage.jsx'

vi.mock('../src/api/sales.js', () => ({
  createCustomer: vi.fn(),
  listCustomers: vi.fn(),
  updateCustomer: vi.fn(),
}))

vi.mock('../src/api/purchases.js', () => ({
  createVendor: vi.fn(),
  listVendors: vi.fn(),
  updateVendor: vi.fn(),
}))

import { listCustomers, updateCustomer } from '../src/api/sales.js'

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('customer directory actions', () => {
  it('disables a customer active-state action until its request finishes', async () => {
    const user = userEvent.setup()
    let finishUpdate
    listCustomers.mockResolvedValue({
      data: [{
        id: 'customer-1',
        name: 'Northwind',
        email: null,
        phone: null,
        address: null,
        paymentTermsDays: 30,
        isActive: true,
      }],
      meta: { page: 1, limit: 20, total: 1 },
    })
    updateCustomer.mockReturnValue(new Promise((resolve) => { finishUpdate = resolve }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <ContactDirectoryPage kind="customer" />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))

    const pendingButton = screen.getByRole('button', { name: 'Deactivating...' })
    expect(pendingButton).toBeDisabled()
    expect(updateCustomer).toHaveBeenCalledWith('customer-1', { isActive: false })

    await user.click(pendingButton)
    expect(updateCustomer).toHaveBeenCalledTimes(1)

    finishUpdate()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled()
    })
  })
})
