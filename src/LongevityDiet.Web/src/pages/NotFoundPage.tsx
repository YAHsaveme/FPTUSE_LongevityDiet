import { Link } from 'react-router-dom'

/** Explicit invalid URL instead of silently redirecting visitors home. */
export function NotFoundPage() {
  return (
    <main className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        <p className="not-found-code" aria-hidden="true">404</p>
        <h1 id="not-found-title">KhÃ´ng tÃ¬m tháº¥y trang</h1>
        <p>
          ÄÆ°á»ng dáº«n nÃ y khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ thay Ä‘á»•i. Báº¡n cÃ³ thá»ƒ vá» trang chá»§
          hoáº·c má»Ÿ láº¡i hÃ nh trÃ¬nh cá»§a mÃ¬nh.
        </p>
        <div className="not-found-actions">
          <Link className="not-found-primary" to="/">Vá» trang chá»§</Link>
          <Link className="not-found-secondary" to="/app">Má»Ÿ káº¿ hoáº¡ch</Link>
        </div>
      </div>
    </main>
  )
}