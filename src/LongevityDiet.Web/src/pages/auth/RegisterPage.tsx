import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/AuthContext'
import { getApiErrorMessage } from '../../lib/apiError'
import { AuthFrame } from './AuthFrame'

const schema = z
  .object({
    displayName: z.string().trim().min(2, 'Tên hiển thị cần ít nhất 2 ký tự.').max(120),
    email: z.string().trim().email('Email chưa đúng định dạng.'),
    password: z
      .string()
      .min(10, 'Mật khẩu cần ít nhất 10 ký tự.')
      .regex(/[A-Z]/, 'Cần ít nhất một chữ in hoa.')
      .regex(/[a-z]/, 'Cần ít nhất một chữ thường.')
      .regex(/[0-9]/, 'Cần ít nhất một chữ số.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Mật khẩu xác nhận chưa khớp.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { user, isLoading, register: registerUser } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  if (!isLoading && user) {
    return <Navigate to={user.profileCompleted ? '/app' : '/onboarding'} replace />
  }

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmPassword, ...values }) => {
    try {
      await registerUser(values)
      navigate('/onboarding', { replace: true })
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error, 'Không thể tạo tài khoản lúc này.') })
    }
  })

  return (
    <AuthFrame
      eyebrow="BẮT ĐẦU NHẸ NHÀNG"
      title="Tạo nền tảng cho một hành trình dài lâu."
      description="Tài khoản giúp hệ thống lưu kế hoạch, hồ sơ và những lựa chọn phù hợp với nhịp sống riêng của bạn."
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-heading">
          <span>TẠO TÀI KHOẢN</span>
          <h2>Chỉ vài thông tin để bắt đầu.</h2>
        </div>

        <label className="field">
          <span>Tên hiển thị</span>
          <div className="field-control">
            <UserRound size={17} />
            <input autoComplete="name" placeholder="Tên của bạn" {...register('displayName')} />
          </div>
          {errors.displayName && <small>{errors.displayName.message}</small>}
        </label>

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
            <input type="password" autoComplete="new-password" placeholder="Ít nhất 10 ký tự" {...register('password')} />
          </div>
          {errors.password && <small>{errors.password.message}</small>}
        </label>

        <label className="field">
          <span>Xác nhận mật khẩu</span>
          <div className="field-control">
            <LockKeyhole size={17} />
            <input type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...register('confirmPassword')} />
          </div>
          {errors.confirmPassword && <small>{errors.confirmPassword.message}</small>}
        </label>

        {errors.root && <p className="form-error">{errors.root.message}</p>}

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>

        <p className="form-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </AuthFrame>
  )
}
