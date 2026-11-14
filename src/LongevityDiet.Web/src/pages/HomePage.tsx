import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Dumbbell,
  Leaf,
  Menu,
  X,
  ShieldCheck,
  UserRound,
  Utensils,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authState'

const reveal = {
  initial: { opacity: 0, y: 34 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
}
const meals = [
  { time: '07:30', title: 'Bữa sáng cân bằng', detail: 'Yến mạch, hạt và trái cây theo mùa' },
  { time: '12:15', title: 'Bữa trưa chủ đạo thực vật', detail: 'Ngũ cốc nguyên hạt, đậu, rau và cá' },
  { time: '18:00', title: 'Bữa tối nhẹ nhàng', detail: 'Rau củ, súp đậu và dầu ô-liu' },
]

const habits = [
  { icon: Leaf, label: 'Thực phẩm chủ đạo thực vật', value: '4 / 5', note: 'Mục tiêu hôm nay' },
  { icon: Clock3, label: 'Khung giờ ăn', value: '10h 45m', note: 'Trong khoảng mục tiêu' },
  { icon: Dumbbell, label: 'Vận động', value: '28 phút', note: 'Còn một phiên ngắn' },
]

const principles = [
  ['01', 'Ưu tiên thực vật', 'Rau, đậu và ngũ cốc nguyên hạt là nền tảng cho lựa chọn mỗi ngày.'],
  ['02', 'Giữ nhịp ổn định', 'Theo dõi thời điểm ăn để hình thành nhịp sinh hoạt dễ duy trì.'],
  ['03', 'Vận động đều đặn', 'Tích lũy vận động và duy trì sức mạnh theo khả năng của bạn.'],
  ['04', 'Theo dõi tiến bộ', 'Mỗi chỉ số đều có giải thích rõ ràng và giới hạn sử dụng.'],
]
export function HomePage() {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="site-shell">
      <header className="topbar" onKeyDown={(event) => {
        if (event.key === 'Escape') setMobileMenuOpen(false)
      }}>
        <Link className="brand" to="/" aria-label="Longevity home">
          <span className="brand-monogram">L</span>
          <span className="brand-copy">
            <strong>Longevity</strong>
            <small>Đồng hành cùng sức khỏe mỗi ngày</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Điều hướng chính">
          <a className="active" href="#today">Hôm nay</a>
          <a href="#plan">Kế hoạch</a>
          <a href="#journey">Hành trình</a>
          <a href="#principles">Nguyên tắc</a>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={mobileMenuOpen ? 'Đóng menu trang chủ' : 'Mở menu trang chủ'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-section-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
          <Link className="round-button" aria-label="Thông báo" to={user ? '/notifications' : '/login'}>
            <Bell size={17} strokeWidth={1.7} />
          </Link>
          <Link className="account-button" to={user ? '/profile' : '/login'} aria-label={user ? `Tài khoản ${user.displayName}` : 'Đăng nhập'}>
            <UserRound size={16} strokeWidth={1.7} />
            <span>{user ? user.displayName : 'Đăng nhập'}</span>
          </Link>
        </div>
        <nav
          id="mobile-section-navigation"
          className="mobile-section-navigation"
          aria-label="Điều hướng trang chủ trên điện thoại"
          hidden={!mobileMenuOpen}
        >
          <a href="#today" onClick={() => setMobileMenuOpen(false)}>Hôm nay</a>
          <a href="#plan" onClick={() => setMobileMenuOpen(false)}>Kế hoạch mẫu</a>
          <a href="#journey" onClick={() => setMobileMenuOpen(false)}>Hành trình mẫu</a>
          <a href="#principles" onClick={() => setMobileMenuOpen(false)}>Nguyên tắc</a>
        </nav>
      </header>

      <main>
        <section className="hero-section" id="today">
          <motion.div className="hero-copy" {...reveal}>
            <span className="eyebrow">DINH DƯỠNG TỐT · THÓI QUEN BỀN VỮNG</span>
            <h1>
              Ăn uống tốt hơn.
              <br />
              <em>Sống khỏe</em> mỗi ngày.
            </h1>
            <p className="hero-description">
              Lên kế hoạch bữa ăn, theo dõi vận động và nhìn thấy tiến bộ của bạn
              trong một không gian rõ ràng, gần gũi và dễ sử dụng.
            </p>
            <div className="hero-actions">
              {user && <Link className="primary-button" to="/activity">
                Ghi hoạt động thực tế <ArrowRight size={16} />
              </Link>}
              <Link className="primary-button" to={user ? '/app' : '/register'}>
                {user ? 'Tiếp tục ngày hôm nay' : 'Bắt đầu hành trình'}
                <ArrowRight size={16} strokeWidth={1.8} />
              </Link>
              <a className="secondary-link" href="#journey">Xem hành trình mẫu</a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={18} /> Nguyên tắc có nguồn</span>
              <span><BookOpen size={18} /> Gợi ý dễ hiểu</span>
              <span><Activity size={18} /> Theo dõi mỗi ngày</span>
            </div>
          </motion.div>

          <motion.aside
            className="daily-card"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="daily-card-head">
              <div>
                <span className="micro-label">NHỊP ĐỘ HÔM NAY</span>
                <h2>Đang đi đúng hướng</h2>
              </div>
              <span className="date-chip">BẢN MINH HỌA</span>
            </div>
            <div className="score-composition">
              <div className="score-ring">
                <div className="score-core"><strong>82</strong><span>trên 100</span></div>
              </div>
              <div className="score-copy">
                <span>Chỉ số tuân thủ</span>
                <strong>Ổn định</strong>
                <p>Chỉ số minh họa. Đăng nhập để xem tiến độ của riêng bạn.</p>
              </div>
            </div>
            <div className="daily-divider" />
            <div className="daily-metrics">
              <div><span>Khung giờ ăn</span><strong>10h 45m</strong></div>
              <div><span>Chuỗi duy trì</span><strong>5 ngày</strong></div>
              <div><span>Thử thách</span><strong>Ngày 6</strong></div>
            </div>
          </motion.aside>
        </section>

        <motion.section className="overview-section" id="plan" {...reveal}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">XEM TRƯỚC · DỮ LIỆU MINH HỌA</span>
              <h2>Bữa ăn, vận động và tiến độ — tất cả ở một nơi.</h2>
            </div>
            <Link className="section-link" to={user ? '/app' : '/register'}>
              Xem khu vực ứng dụng <ArrowRight size={15} />
            </Link>
          </div>
          <div className="overview-grid">
            <article className="surface-card meal-card">
              <div className="card-heading">
                <span className="icon-box"><Utensils size={18} strokeWidth={1.6} /></span>
                <div><span className="micro-label">BỮA ĂN</span><h3>Kế hoạch trong ngày</h3></div>
              </div>
              <div className="meal-timeline">
                {meals.map((meal) => (
                  <div className="meal-row" key={meal.time}>
                    <time>{meal.time}</time>
                    <span className="meal-dot" />
                    <div><strong>{meal.title}</strong><p>{meal.detail}</p></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="surface-card habit-card">
              <div className="card-heading">
                <span className="icon-box"><CalendarDays size={18} strokeWidth={1.6} /></span>
                <div><span className="micro-label">THÓI QUEN</span><h3>Mục tiêu hôm nay</h3></div>
              </div>
              <div className="habit-list">
                {habits.map(({ icon: Icon, label, value, note }) => (
                  <div className="habit-row" key={label}>
                    <span className="habit-icon"><Icon size={17} strokeWidth={1.7} /></span>
                    <div className="habit-copy"><strong>{label}</strong><span>{note}</span></div>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </motion.section>

        <motion.section className="journey-section" id="journey" {...reveal}>
          <div className="journey-copy">
            <span className="eyebrow eyebrow-light">HÀNH TRÌNH 14 NGÀY · MINH HỌA</span>
            <h2>Thói quen tốt bắt đầu từ những ngày nhỏ.</h2>
            <p>Mỗi ngày tập trung vào một lựa chọn nhỏ, có mục đích và phù hợp với nhịp sống của bạn.</p>
            <Link className="light-button" to={user ? '/app' : '/register'}>{user ? 'Tiếp tục hành trình' : 'Tạo hành trình của bạn'} <ArrowRight size={16} /></Link>
          </div>
          <div className="journey-progress">
            <div className="journey-number"><span>Ngày</span><strong>06</strong><small>trên 14</small></div>
            <div className="progress-track" aria-label="Tiến độ 43 phần trăm">
              <span style={{ width: '43%' }} />
            </div>
            <div className="journey-meta"><span>5 ngày liên tiếp</span><span>43% hoàn thành</span></div>
          </div>
        </motion.section>

        <motion.section className="insight-section" {...reveal}>
          <div className="insight-ornament" aria-hidden="true"><Leaf size={66} strokeWidth={0.8} /></div>
          <div className="insight-copy">
            <span className="eyebrow">GỢI Ý THAM KHẢO · MINH HỌA</span>
            <h2>Những điều chỉnh nhỏ tạo nên khác biệt.</h2>
            <p>Hãy thử hoàn thành bữa tối sớm hơn một chút để tạo khoảng nghỉ trước giờ ngủ.</p>
            <Link to={user ? '/profile' : '/register'}>
              {user ? 'Điều chỉnh hồ sơ' : 'Thiết lập hồ sơ'} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="insight-stat">
            <span>Khoảng nghỉ trước giờ ngủ</span>
            <strong>3h 10m</strong>
            <div className="stat-line"><span style={{ width: '78%' }} /></div>
            <small>Giá trị minh họa dựa trên lịch sinh hoạt mẫu.</small>
          </div>
        </motion.section>

        <motion.section className="principles-section" id="principles" {...reveal}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">NGUYÊN TẮC NỀN TẢNG</span>
              <h2>4 nguyên tắc để bắt đầu đơn giản.</h2>
            </div>
          </div>
          <div className="principles-grid">
            {principles.map(([number, title, description]) => (
              <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </motion.section>
      </main>

      <footer>
        <div className="footer-brand">
          <span className="brand-monogram">L</span>
          <div><strong>Longevity</strong><small>Wellness companion</small></div>
        </div>
        <p>Hỗ trợ xây dựng thói quen; không thay thế tư vấn hoặc chẩn đoán y khoa.</p>
        <span className="footer-year">2026</span>
      </footer>
    </div>
  )
}
