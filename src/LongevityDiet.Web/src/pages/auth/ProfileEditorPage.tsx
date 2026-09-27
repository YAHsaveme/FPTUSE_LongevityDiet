import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, LogOut, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/authState'
import { api } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/apiError'

type ProfileResponse = {
  userId: string
  email: string
  displayName: string
  birthYear: number | null
  timeZone: string
  wakeTime: string | null
  sleepTime: string | null
  preferredMealFrequency: number
  foodPreference: string | null
  profileCompleted: boolean
}

const currentYear = new Date().getFullYear()

const schema = z.object({
  displayName: z.string().trim().min(2, 'Tên hiển thị cần ít nhất 2 ký tự.').max(120),
  birthYear: z
    .string()
    .regex(/^\d{4}$/, 'Vui lòng nhập năm sinh gồm 4 chữ số.')
    .refine((value) => {
      const year = Number(value)
      return year >= 1900 && year <= currentYear
    }, 'Năm sinh chưa hợp lệ.'),
  timeZone: z.string().trim().min(1, 'Vui lòng chọn múi giờ.').max(100),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ thức dậy chưa hợp lệ.'),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ đi ngủ chưa hợp lệ.'),
  preferredMealFrequency: z.enum(['2', '3', '4']),
  foodPreference: z.string().max(500, 'Nội dung tối đa 500 ký tự.'),
})

type FormValues = z.infer<typeof schema>

function toInputTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : ''
}

function toApiTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

type ProfileEditorPageProps = {
  onboarding?: boolean
}

export function ProfileEditorPage({ onboarding = false }: ProfileEditorPageProps) {
  const navigate = useNavigate()
  const { user, logout, updateSessionUser } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await api.get<ProfileResponse>('/profile')).data,
  })

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      birthYear: '',
      timeZone: 'Asia/Ho_Chi_Minh',
      wakeTime: '06:30',
      sleepTime: '23:00',
      preferredMealFrequency: '3',
      foodPreference: '',
    },
  })

  useEffect(() => {
    if (!profileQuery.data) {
      return
    }

    reset({
      displayName: profileQuery.data.displayName,
      birthYear: profileQuery.data.birthYear?.toString() ?? '',
      timeZone: profileQuery.data.timeZone,
      wakeTime: toInputTime(profileQuery.data.wakeTime) || '06:30',
      sleepTime: toInputTime(profileQuery.data.sleepTime) || '23:00',
      preferredMealFrequency: String(profileQuery.data.preferredMealFrequency) as '2' | '3' | '4',
      foodPreference: profileQuery.data.foodPreference ?? '',
    })
  }, [profileQuery.data, reset])

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    setSaved(false)

    try {
      const response = await api.put<ProfileResponse>('/profile', {
        displayName: values.displayName,
        birthYear: Number(values.birthYear),
        timeZone: values.timeZone,
        wakeTime: toApiTime(values.wakeTime),
        sleepTime: toApiTime(values.sleepTime),
        preferredMealFrequency: Number(values.preferredMealFrequency),
        foodPreference: values.foodPreference.trim() || null,
      })

      updateSessionUser({
        displayName: response.data.displayName,
        profileCompleted: response.data.profileCompleted,
      })

      if (onboarding) {
        navigate('/app', { replace: true })
        return
      }

      setSaved(true)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Không thể lưu hồ sơ lúc này.'))
    }
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (profileQuery.isLoading) {
    return (
      <div className="auth-loading" role="status">
        <span />
        <p>Đang tải hồ sơ...</p>
      </div>
    )
  }

  if (profileQuery.isError) {
    return (
      <main className="profile-page">
        <section className="profile-card compact-message">
          <span className="eyebrow">KHÔNG THỂ TẢI HỒ SƠ</span>
          <h1>Phiên làm việc cần được làm mới.</h1>
          <p>{getApiErrorMessage(profileQuery.error)}</p>
          <Link className="auth-submit" to="/login">Quay lại đăng nhập</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="profile-page">
      <header className="profile-topbar">
        <Link className="brand" to="/">
          <span className="brand-monogram">L</span>
          <span className="brand-copy">
            <strong>Longevity</strong>
            <small>Daily wellness companion</small>
          </span>
        </Link>

        {!onboarding && (
          <button className="profile-logout" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        )}
      </header>

      <section className="profile-layout">
        <div className="profile-intro">
          <span className="eyebrow">{onboarding ? 'THIẾT LẬP BAN ĐẦU' : 'HỒ SƠ CỦA BẠN'}</span>
          <h1>
            {onboarding
              ? 'Để gợi ý phù hợp với nhịp sống của bạn.'
              : 'Điều chỉnh những thông tin nền tảng.'}
          </h1>
          <p>
            Những dữ liệu này được dùng để xác định múi giờ, khung sinh hoạt và số bữa ưu tiên.
            Chúng không được dùng để chẩn đoán bệnh hay dự đoán tuổi thọ.
          </p>

          {!onboarding && (
            <Link className="profile-back" to="/app">
              <ArrowLeft size={15} />
              Quay lại ứng dụng
            </Link>
          )}
        </div>

        <form className="profile-card" onSubmit={onSubmit}>
          <div className="profile-card-head">
            <div>
              <span className="micro-label">THÔNG TIN CÁ NHÂN HÓA</span>
              <h2>{onboarding ? 'Hoàn tất hồ sơ' : 'Cập nhật hồ sơ'}</h2>
            </div>
            <span className="profile-email">{profileQuery.data?.email}</span>
          </div>

          <div className="profile-grid">
            <label className="field span-2">
              <span>Tên hiển thị</span>
              <input className="plain-input" autoComplete="name" {...register('displayName')} />
              {errors.displayName && <small>{errors.displayName.message}</small>}
            </label>

            <label className="field">
              <span>Năm sinh</span>
              <input className="plain-input" inputMode="numeric" placeholder="2003" {...register('birthYear')} />
              {errors.birthYear && <small>{errors.birthYear.message}</small>}
            </label>

            <label className="field">
              <span>Múi giờ</span>
              <select className="plain-input" {...register('timeZone')}>
                <option value="Asia/Ho_Chi_Minh">Việt Nam - Asia/Ho_Chi_Minh</option>
                <option value="UTC">UTC</option>
              </select>
              {errors.timeZone && <small>{errors.timeZone.message}</small>}
            </label>

            <label className="field">
              <span>Giờ thức dậy thường lệ</span>
              <input className="plain-input" type="time" {...register('wakeTime')} />
              {errors.wakeTime && <small>{errors.wakeTime.message}</small>}
            </label>

            <label className="field">
              <span>Giờ đi ngủ thường lệ</span>
              <input className="plain-input" type="time" {...register('sleepTime')} />
              {errors.sleepTime && <small>{errors.sleepTime.message}</small>}
            </label>

            <label className="field">
              <span>Số bữa ưu tiên mỗi ngày</span>
              <select className="plain-input" {...register('preferredMealFrequency')}>
                <option value="2">2 bữa</option>
                <option value="3">3 bữa</option>
                <option value="4">4 bữa</option>
              </select>
              {errors.preferredMealFrequency && <small>{errors.preferredMealFrequency.message}</small>}
            </label>

            <label className="field span-2">
              <span>Ưu tiên ăn uống</span>
              <textarea
                className="plain-input profile-textarea"
                placeholder="Ví dụ: ưu tiên món Việt, nhiều rau, đậu và ngũ cốc nguyên hạt"
                {...register('foodPreference')}
              />
              {errors.foodPreference && <small>{errors.foodPreference.message}</small>}
            </label>
          </div>

          {submitError && <p className="form-error">{submitError}</p>}
          {saved && <p className="form-success">Hồ sơ đã được cập nhật.</p>}

          <button className="auth-submit profile-save" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Đang lưu...' : onboarding ? 'Hoàn tất thiết lập' : 'Lưu thay đổi'}
            {onboarding ? <ArrowRight size={17} /> : <Save size={17} />}
          </button>
        </form>
      </section>
    </main>
  )
}

export function OnboardingPage() {
  return <ProfileEditorPage onboarding />
}

export function ProfilePage() {
  return <ProfileEditorPage />
}
