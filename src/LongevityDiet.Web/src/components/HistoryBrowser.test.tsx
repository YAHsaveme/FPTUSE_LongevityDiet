import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { HistoryBrowser } from './HistoryBrowser'

vi.mock('../lib/api', () => ({ api: { get: vi.fn() } }))

function mount(kind: 'meal-plan' | 'meal-log' | 'challenge') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><HistoryBrowser kind={kind} /></QueryClientProvider>)
}

describe('HistoryBrowser', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockResolvedValue({ data: {
      items: [{ id: 'history-1', title: 'Lunch from fixture', localDate: '2026-11-14' }],
      page: 1, pageSize: 10, totalItems: 1, totalPages: 1,
    } })
  })

  it('only fetches expanded history and sends a server-side page query', async () => {
    mount('meal-log')
    expect(api.get).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử' }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/meal-logs/page')
    expect(await screen.findByText('Lunch from fixture')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Lọc loại bữa'), { target: { value: 'Lunch' } })
    await waitFor(() => {
      const lastCall = vi.mocked(api.get).mock.lastCall
      expect(lastCall?.[1]).toMatchObject({ params: { slotType: 'Lunch', sortBy: 'eatenAt' } })
    })
  })

  it('blocks invalid date ranges instead of sending a request', async () => {
    mount('challenge')
    fireEvent.click(screen.getByRole('button', { name: 'Mở lịch sử' }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const before = vi.mocked(api.get).mock.calls.length
    fireEvent.change(screen.getByLabelText('Lọc từ ngày'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Lọc đến ngày'), { target: { value: '2026-11-01' } })
    expect(screen.getByRole('alert').textContent).toMatch(/Ngày bắt đầu/)
    // There must never be an API request with an invalid combined date range.
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThanOrEqual(before)
    for (const call of vi.mocked(api.get).mock.calls) {
      const params = (call[1] as { params?: { fromDate?: string; toDate?: string } } | undefined)?.params
      expect(!(params?.fromDate === '2026-11-20' && params?.toDate === '2026-11-01')).toBe(true)
    }
  })
})
