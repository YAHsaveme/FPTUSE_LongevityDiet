import { useRef, useState } from 'react'
import { Activity, Bell, BookOpen, CalendarDays, BarChart3, LayoutDashboard, MoreHorizontal, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authState'

const memberLinks = [
  { to: '/app', label: 'Kế hoạch', Icon: LayoutDashboard },
  { to: '/catalog', label: 'Món ăn', Icon: BookOpen },
  { to: '/activity', label: 'Hoạt động', Icon: Activity },
  { to: '/progress', label: 'Tiến độ', Icon: BarChart3 },
  { to: '/reports', label: 'Báo cáo', Icon: CalendarDays },
  { to: '/notifications', label: 'Thông báo', Icon: Bell },
  { to: '/profile', label: 'Cá nhân', Icon: UserRound },
] as const

const primaryRoutes = new Set(['/app', '/catalog', '/activity', '/progress'])

const isMemberLocation = (pathname: string) =>
  ['/app', '/planner', '/catalog', '/activity', '/progress', '/reports', '/notifications', '/profile', '/admin/catalog']
    .some((path) => pathname === path || pathname.startsWith(path + '/'))

/** Cross-feature navigation; does not modify business state or API calls. */
export function QuickNavigation() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [expandedAtPath, setExpandedAtPath] = useState<string | null>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const moreOpen = expandedAtPath === pathname

  if (!user?.profileCompleted || !isMemberLocation(pathname)) return null

  const links = user.role === 'Admin'
    ? [...memberLinks, { to: '/admin/catalog' as const, label: 'Quản trị', Icon: ShieldCheck }]
    : memberLinks

  const secondaryLinks = links.filter(({ to }) => !primaryRoutes.has(to))

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="quick-navigation"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && moreOpen) {
          setExpandedAtPath(null)
          moreButtonRef.current?.focus()
        }
      }}
    >
      {links.map(({ to, label, Icon }) => {
        const active = pathname === to || pathname.startsWith(to + '/') ||
          (to === '/app' && pathname === '/planner')

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={`${active ? 'active ' : ''}${primaryRoutes.has(to) ? 'quick-nav-primary' : 'quick-nav-secondary'}`}
            key={to}
            to={to}
            title={label}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        )
      })}
      <button
        ref={moreButtonRef}
        className={`quick-navigation-more${moreOpen ? ' active' : ''}`}
        type="button"
        aria-label={moreOpen ? 'Đóng các trang khác' : 'Mở các trang khác'}
        aria-expanded={moreOpen}
        aria-controls="quick-navigation-overflow"
        onClick={() => setExpandedAtPath(moreOpen ? null : pathname)}
      >
        <MoreHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
        <span>Thêm</span>
      </button>
      <div
        id="quick-navigation-overflow"
        className="quick-navigation-overflow"
        role="group"
        aria-label="Các trang khác"
        hidden={!moreOpen}
      >
        {secondaryLinks.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={pathname === to ? 'page' : undefined}
            className={pathname === to ? 'active' : ''}
            onClick={() => setExpandedAtPath(null)}
          >
            <Icon aria-hidden="true" size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
