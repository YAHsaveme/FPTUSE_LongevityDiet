import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminCatalogPage } from './AdminCatalogPage'
import { activateRuleSet, getActiveRuleSet, getRules, getRuleReviewQueue } from '../../catalog/catalogApi'

vi.mock('../../catalog/catalogApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../catalog/catalogApi')>(),
  getRules: vi.fn(),
  getActiveRuleSet: vi.fn(),
  getRuleReviewQueue: vi.fn(),
  activateRuleSet: vi.fn(),
  getRuleImpact: vi.fn(),
  getRuleHistory: vi.fn(),
}))

const publishedVersion = {
  id: 'version-1', dietRuleId: 'rule-1', versionNumber: 1,
  parametersJson: '{"baseWeight":25}', sourceUrl: 'https://example.org/source',
  sourceType: 2, citation: 'Verified synthetic QA source', evidenceLevel: 2,
  state: 2, effectiveAt: null, publishedAt: '2026-11-15T10:00:00Z',
}
const draftVersion = { ...publishedVersion, id: 'version-draft', versionNumber: 2, state: 1 }

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <MemoryRouter><AdminCatalogPage /></MemoryRouter>
  </QueryClientProvider>)
}

describe('Admin RuleSet activation', () => {
  beforeEach(() => {
    vi.mocked(getRules).mockReset()
    vi.mocked(getActiveRuleSet).mockReset()
    vi.mocked(getRuleReviewQueue).mockReset()
    vi.mocked(activateRuleSet).mockReset()

    vi.mocked(getRules).mockResolvedValue([{
      id: 'rule-1', ruleKey: 'PLANT_FORWARD_PATTERN',
      title: 'Plant-forward source rule', description: 'QA only', category: 'Nutrition',
      isMedicalSensitive: false, isActive: true,
      versions: [publishedVersion, draftVersion],
    }])
    vi.mocked(getActiveRuleSet).mockResolvedValue({
      id: 'active-1', versionLabel: 'qa-current-v1', isActive: true,
      effectiveAt: '2026-11-15T10:00:00Z', publishedAt: '2026-11-15T10:00:00Z',
      rules: [publishedVersion],
    })
    vi.mocked(getRuleReviewQueue).mockResolvedValue({
      items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0,
    })
    vi.mocked(activateRuleSet).mockResolvedValue({
      id: 'active-2', versionLabel: 'qa-reviewed-v2', isActive: true,
      effectiveAt: '2026-11-15T10:30:00Z', publishedAt: '2026-11-15T10:30:00Z',
      rules: [publishedVersion],
    })
  })

  it('shows actual active version and requires published selection and explicit confirmation', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Quy tắc' }))
    expect(await screen.findByText('qa-current-v1')).toBeInTheDocument()
    const activateButton = screen.getByRole('button', { name: 'Kích hoạt bộ quy tắc mới' })
    expect(activateButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('2026.11-reviewed-v2'), {
      target: { value: 'qa-reviewed-v2' },
    })
    const selector = screen.getByRole('group', { name: 'Chọn một phiên bản đã công bố cho mỗi quy tắc' })
    const published = within(selector).getByRole('checkbox', { name: /v1/ })
    expect(within(selector).queryByRole('checkbox', { name: /v2/ })).toBeNull()
    fireEvent.click(published)
    expect(activateButton).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi xác nhận đã kiểm tra nguồn/ }))
    expect(activateButton).toBeEnabled()

    fireEvent.click(activateButton)
    await waitFor(() => expect(activateRuleSet).toHaveBeenCalledWith({
      versionLabel: 'qa-reviewed-v2',
      ruleVersionIds: ['version-1'],
    }))
    expect(await screen.findByText(/Đã kích hoạt bộ quy tắc qa-reviewed-v2/)).toBeInTheDocument()
  })
})
