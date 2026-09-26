import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/AuthContext'
import { getApiErrorMessage } from '../../lib/apiError'
import { AuthFrame } from './AuthFrame'

const schema = z.object({
  email: z.string().trim().email('Email chưa đúng định dạng.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (!isLoading && user) {
    return <Navigate to={user.profileCompleted ? '/app' : '/onboarding'} replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const signedInUser = await login(values)
      const requestedPath = (location.state as { from?: string } | null)?.from
      navigate(
        signedInUser.profileCompleted ? (requestedPath ?? '/app') : '/onboarding',
        { replace: true },
      )
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error, 'Email hoặc mật khẩu không đúng.') })
    }
  })

  return (
    <AuthFrame
      eyebrow="CHÀO MỪNG TRỞ LẠI"
      title="Tiếp tục hành trình của bạn."
      description="Đăng nhập để xem kế hoạch, cập nhật hồ sơ và tiếp tục những thói quen bạn đang xây dựng."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-heading">
          <span>ĐĂNG NHẬP</span>
          <h2>Một nhịp quen thuộc đang chờ bạn.</h2>
        </div>

        <label className="field">
          <span>Email</span>
          <div className="field-control">
            <Mail size={17} />
            <input type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          </div>
          {errors.email && <small>{errors.email.message}</small>}
        </label>

        <label className="field">
          <span>Mật khẩu</span>
          <div className="field-control">
            <LockKeyhole size={17} />
            <input type="password" autoComplete="current-password" placeholder="Mật khẩu của bạn" {...register('password')} />
          </div>
          {errors.password && <small>{errors.password.message}</small>}
        </label>

        {errors.root && <p className="form-error">{errors.root.message}</p>}

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>

        <p className="form-switch">
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
        </p>
      </form>
    </AuthFrame>
  )
}
