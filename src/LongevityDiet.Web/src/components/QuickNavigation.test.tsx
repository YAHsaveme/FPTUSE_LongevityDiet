import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authState'
import { QuickNavigation } from './QuickNavigation'

vi.mock('../auth/authState', () => ({ useAuth: vi.fn() }))

const session = {
  user: {
    id: 'test-user',
    email: 'user@example.test',
    displayName: 'User',
    role: 'Member',
    profileCompleted: true,
  },
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateSessionUser: vi.fn(),
}

function renderDock(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QuickNavigation />
    </MemoryRouter>,
  )
}

describe('QuickNavigation', () => {
  beforeEach(() => vi.mocked(useAuth).mockReturnValue(session))

  it('does not render a user dock on public routes', () => {
    renderDock('/')
    expect(screen.queryByRole('navigation', { name: 'Điều hướng nhanh' })).toBeNull()
  })

  it('does not expose protected feature navigation for an incomplete profile', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...session,
      user: { ...session.user, profileCompleted: false },
    })
    renderDock('/onboarding')
    expect(screen.queryByRole('navigation', { name: 'Điều hướng nhanh' })).toBeNull()
  })

  it('supports the planner alias and all major feature routes', () => {
    renderDock('/planner')
    expect(screen.getByRole('navigation', { name: 'Điều hướng nhanh' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Kế hoạch' }).classList.contains('active')).toBe(true)
    expect(screen.getByRole('link', { name: 'Kế hoạch' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Món ăn' }).getAttribute('href')).toBe('/catalog')
    expect(screen.getByRole('link', { name: 'Báo cáo' }).getAttribute('href')).toBe('/reports')
    expect(screen.getByRole('link', { name: 'Thông báo' }).getAttribute('href')).toBe('/notifications')
  })

  it('expands secondary mobile destinations without losing feature access', () => {
    renderDock('/app')
    const moreButton = screen.getByRole('button', { name: 'Mở các trang khác' })
    expect(moreButton.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(moreButton)
    expect(screen.getByRole('button', { name: 'Đóng các trang khác' }).getAttribute('aria-expanded')).toBe('true')
    const extra = screen.getByRole('group', { name: 'Các trang khác' })
    expect(extra.querySelector('a[href="/reports"]')).toBeTruthy()
    expect(extra.querySelector('a[href="/notifications"]')).toBeTruthy()
    expect(extra.querySelector('a[href="/profile"]')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('navigation', { name: 'Điều hướng nhanh' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Mở các trang khác' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the admin shortcut only to admin users', () => {
    const { unmount } = renderDock('/app')
    expect(screen.queryByRole('link', { name: 'Quản trị' })).toBeNull()
    unmount()

    vi.mocked(useAuth).mockReturnValue({
      ...session,
      user: { ...session.user, role: 'Admin' },
    })
    renderDock('/admin/catalog')
    expect(screen.getByRole('link', { name: 'Quản trị' }).getAttribute('href')).toBe('/admin/catalog')
  })
})
