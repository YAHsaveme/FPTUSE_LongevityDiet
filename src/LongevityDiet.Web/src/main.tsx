import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { queryClient } from './lib/queryClient'

// The static-only GitHub Pages preview needs hash routing because this host
// responds with HTTP 404 on direct subpath refreshes. The regular app keeps
// BrowserRouter for Vercel/Cloudflare rewrites and the current Docker API.
const PreviewRouter = import.meta.env.VITE_STATIC_PREVIEW === 'true' ? HashRouter : BrowserRouter
const browserBase = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreviewRouter basename={import.meta.env.VITE_STATIC_PREVIEW === 'true' ? undefined : browserBase}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PreviewRouter>
    </QueryClientProvider>
  </StrictMode>,
)
