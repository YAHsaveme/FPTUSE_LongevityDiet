import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllergens, getFoods, getRecipes, getRecipeHistory } from '../../catalog/catalogApi'
import { AdminCatalogPage } from './AdminCatalogPage'
import { RecipeHistoryPanel } from './RecipeHistoryPanel'

vi.mock('../../catalog/catalogApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../catalog/catalogApi')>(),
  getRecipeHistory: vi.fn(),
  getRecipes: vi.fn(),
  getFoods: vi.fn(),
  getAllergens: vi.fn(),
}))

const recipeId = '6e171196-6315-4a18-a088-9905cafdf43a'
const foodId = 'a5ad689a-c359-474f-92ec-cd99047d0739'
const allergenId = '032ae66f-42f1-4099-bdf8-cbe5f9a91423'
const created = {
  id: 'c1', recipeId, changeType: 'Created', actorId: null,
  recordedAt: '2026-11-16T01:00:00Z',
  snapshotJson: JSON.stringify({
    isActive: true,
    ingredients: [{ foodId, amount: 120, unit: 'g', isOptional: true }],
    allergens: [{ allergenId }],
  }),
}
const updated = {
  id: 'c2', recipeId, changeType: 'Updated', actorId: 'admin-1',
  recordedAt: '2026-11-16T02:00:00', // SQL datetime2 UTC can omit its offset
  snapshotJson: JSON.stringify({
    isActive: true,
    ingredients: [{ foodId, amount: 200, unit: 'g', isOptional: false }],
    allergens: [],
  }),
}

function mount(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>)
}

describe('Admin recipe composition history', () => {
  beforeEach(() => {
    vi.mocked(getRecipeHistory).mockReset()
    vi.mocked(getRecipes).mockReset()
    vi.mocked(getFoods).mockReset()
    vi.mocked(getAllergens).mockReset()
  })

  it('shows immutable amounts/allergens, pages through server history and closes', async () => {
    vi.mocked(getRecipeHistory).mockImplementation(async (_, page) =>
      page === 1 ? { items: [updated], page: 1, pageSize: 5, totalItems: 2, totalPages: 2 }
        : { items: [created], page: 2, pageSize: 5, totalItems: 2, totalPages: 2 })
    const onClose = vi.fn()
    mount(<RecipeHistoryPanel recipeId={recipeId} recipeName="Cháo đậu" onClose={onClose} />)
    expect(await screen.findByText('Cập nhật công thức')).toBeInTheDocument()
    expect(screen.getByText(/200 g/)).toBeInTheDocument()
    expect(screen.getByText(/Tổng cộng 2 bản ghi/)).toBeInTheDocument()
    expect(screen.getByText(/16\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/09:00/)).toBeInTheDocument() // UTC => Vietnam timezone
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(await screen.findByText('Tạo công thức')).toBeInTheDocument()
    expect(screen.getByText(/120 g/)).toBeInTheDocument()
    expect(screen.getByText(allergenId)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
    expect(getRecipeHistory).toHaveBeenCalledWith(recipeId, 2, 5)

    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử công thức' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not crash or trust malformed historical snapshots', async () => {
    vi.mocked(getRecipeHistory).mockResolvedValue({
      items: [{ ...created, snapshotJson: '{not-json}' }],
      page: 1, pageSize: 5, totalItems: 1, totalPages: 1,
    })
    mount(<RecipeHistoryPanel recipeId={recipeId} recipeName="Cháo đậu" onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể hiển thị dữ liệu lịch sử')
  })

  it('offers an actionable retry when history API is unavailable', async () => {
    vi.mocked(getRecipeHistory).mockRejectedValueOnce(new Error('Synthetic 503'))
      .mockResolvedValueOnce({ items: [created], page: 1, pageSize: 5, totalItems: 1, totalPages: 1 })
    mount(<RecipeHistoryPanel recipeId={recipeId} recipeName="Cháo đậu" onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải lịch sử công thức')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Tạo công thức')).toBeInTheDocument()
  })

  it('lets Admin open the selected recipe history from the catalog listing', async () => {
    vi.mocked(getRecipes).mockResolvedValue({
      items: [{
        id: recipeId, name: 'Cháo đậu', category: 'Main', cuisine: null, tags: null,
        servingCount: 1, prepMinutes: 10, caloriesPerServing: 220,
        isPlantForward: true, hasLegume: true, hasWholeGrain: false, hasFish: false, isActive: true,
      }],
      page: 1, pageSize: 20, totalItems: 1, totalPages: 1,
    })
    vi.mocked(getFoods).mockResolvedValue({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 })
    vi.mocked(getAllergens).mockResolvedValue([])
    vi.mocked(getRecipeHistory).mockResolvedValue({
      items: [created], page: 1, pageSize: 5, totalItems: 1, totalPages: 1,
    })

    mount(<AdminCatalogPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Công thức' }))
    const open = await screen.findByRole('button', { name: 'Lịch sử' })
    fireEvent.click(open)
    expect(await screen.findByRole('region', { name: 'Lịch sử công thức Cháo đậu' }))
      .toBeInTheDocument()
    await waitFor(() => expect(getRecipeHistory).toHaveBeenCalledWith(recipeId, 1, 5))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử công thức' }))
    expect(screen.queryByRole('region', { name: 'Lịch sử công thức Cháo đậu' })).toBeNull()
  })
})
