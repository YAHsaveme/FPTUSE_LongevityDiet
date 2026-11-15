import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../auth/authState'
import { OnboardingPage, ProfilePage } from './ProfileEditorPage'

vi.mock('@tanstack/react-query', async (original) => ({
  ...await original<typeof import('@tanstack/react-query')>(),
  useQuery: vi.fn(),
}))
vi.mock('../../auth/authState', () => ({ useAuth: vi.fn() }))

const logout = vi.fn().mockResolvedValue(undefined)
const setup = (mode: 'loading' | 'error' | 'ready', onboarding = false) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'test-user', email: 'qa@example.test', displayName: 'QA',
      role: 'Member', profileCompleted: !onboarding },
    isLoading: false, login: vi.fn(), register: vi.fn(), logout,
    updateSessionUser: vi.fn(),
  })
  vi.mocked(useQuery).mockReturnValue({
    isLoading: mode === 'loading', isError: mode === 'error',
    data: mode === 'ready' ? { email: 'qa@example.test',
      displayName: 'QA', preferredMealFrequency: 3, timeZone: 'Asia/Ho_Chi_Minh',
      birthYear: 1997, wakeTime: '06:30', sleepTime: '23:00',
      profileCompleted: true, foodPreference: '' } : undefined,
    error: mode === 'error' ? new Error('synthetic request failed') : undefined,
  } as never)
  render(<MemoryRouter initialEntries={['/profile']}>
    <Routes>
      <Route path="/profile" element={onboarding ? <OnboardingPage /> : <ProfilePage />} />
      <Route path="/login" element={<p>Login destination</p>} />
    </Routes>
  </MemoryRouter>)
}

describe('Profile logout remains available in all non-onboarding states', () => {
  beforeEach(() => {
    logout.mockReset()
    logout.mockResolvedValue(undefined)
  })
  it.each(['loading', 'error', 'ready'] as const)('keeps logout visible when query is %s', async (mode) => {
    setup(mode)
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    await waitFor(() => expect(logout).toHaveBeenCalledOnce())
    expect(await screen.findByText('Login destination')).toBeInTheDocument()
  })
  it.each(['loading', 'error', 'ready'] as const)(
    'keeps session and shows an actionable error if server revoke fails while %s',
    async (mode) => {
      logout.mockRejectedValueOnce(new Error('Synthetic 429'))
      setup(mode)
      fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Đăng xuất chưa hoàn tất trên máy chủ')
      expect(screen.queryByText('Login destination')).toBeNull()
    },
  )
  it('does not add a logout button to first-time onboarding', () => {
    setup('loading', true)
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).toBeNull()
  })
})
