import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AdminCollectionControls, AdminCollectionPagination } from './AdminCollectionControls'
import { useAdminCollection } from './useAdminCollection'

describe('Admin collection list querying', () => {
  it('applies status/feature/sort filters and resets page on changes', () => {
    const { result } = renderHook(() => useAdminCollection('food'))
    expect(result.current.options.pageSize).toBe(20)
    act(() => result.current.setPage(3))
    act(() => result.current.updateStatus('inactive'))
    expect(result.current.options.page).toBe(1)
    expect(result.current.options.isActive).toBe(false)
    act(() => result.current.updateFeature('legume'))
    act(() => result.current.updateSortBy('calories'))
    act(() => result.current.updateSortDirection('desc'))
    expect(result.current.options).toMatchObject({
      isLegume: true, sortBy: 'calories', sortDirection: 'desc',
    })
    act(() => result.current.reset())
    expect(result.current.options).toMatchObject({
      isActive: undefined, isLegume: undefined, sortBy: 'name', pageSize: 20,
    })
  })

  it('renders accessible filters and bounded page-size navigation', () => {
    function Example() {
      const query = useAdminCollection('recipe')
      return <>
        <AdminCollectionControls query={query} kind="recipe" />
        <AdminCollectionPagination query={query} totalItems={126} totalPages={Math.ceil(126 / query.pageSize)} />
      </>
    }
    render(<Example />)
    fireEvent.change(screen.getByLabelText('Lọc trạng thái'), { target: { value: 'inactive' } })
    fireEvent.change(screen.getByLabelText('Trường sắp xếp'), { target: { value: 'prepMinutes' } })
    fireEvent.change(screen.getByLabelText('Số dòng mỗi trang'), { target: { value: '50' } })
    expect(screen.getByText('Trang 1/3')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Trang cuối'))
    expect(screen.getByText('Trang 3/3')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Trang đầu'))
    expect(screen.getByText('Trang 1/3')).toBeTruthy()
  })
})
