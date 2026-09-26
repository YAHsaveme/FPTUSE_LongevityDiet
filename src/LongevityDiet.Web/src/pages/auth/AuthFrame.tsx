import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, ShieldCheck } from 'lucide-react'

type AuthFrameProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export function AuthFrame({ eyebrow, title, description, children }: AuthFrameProps) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="auth-brand" to="/" aria-label="Longevity home">
          <span className="brand-monogram">L</span>
          <span>
            <strong>Longevity</strong>
            <small>Daily wellness companion</small>
          </span>
        </Link>

        <div className="auth-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        <div className="auth-trust">
          <span><ShieldCheck size={16} /> Phiên đăng nhập được bảo vệ</span>
          <span><Leaf size={16} /> Thiết lập theo nhịp sống của bạn</span>
        </div>
      </section>

      <section className="auth-form-shell">
        {children}
      </section>
    </main>
  )
}
