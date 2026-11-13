import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/authState'
import { HomePage } from './HomePage'

vi.mock('../auth/authState', () => ({ useAuth: vi.fn() }))

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>)
}

describe('HomePage mobile navigation and transparency', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateSessionUser: vi.fn(),
    })
  })

  it('offers mobile section navigation that can open and close', () => {
    renderHome()
    const openButton = screen.getByRole('button', { name: 'Mở menu trang chủ' })
    expect(openButton.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(openButton)
    expect(screen.getByRole('button', { name: 'Đóng menu trang chủ' }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('navigation', { name: 'Điều hướng trang chủ trên điện thoại' }).hasAttribute('hidden')).toBe(false)
    fireEvent.click(screen.getByRole('link', { name: 'Kế hoạch mẫu' }))
    expect(screen.getByRole('button', { name: 'Mở menu trang chủ' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('takes new visitors to signup and labels illustrative health data', () => {
    renderHome()
    expect(screen.getByRole('link', { name: 'Bắt đầu hành trình' }).getAttribute('href')).toBe('/register')
    expect(screen.getByText('XEM TRƯỚC · DỮ LIỆU MINH HỌA')).toBeTruthy()
    expect(screen.getByText('GỢI Ý THAM KHẢO · MINH HỌA')).toBeTruthy()
  })
})
