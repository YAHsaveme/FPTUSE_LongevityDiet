import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bell, CheckCheck, Clock3 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/apiError'
import './tracking.css'

type Category = 1 | 2 | 3 | 4
type Notification = {
  id: string
  category: Category
  title: string
  body: string
  deepLink: string
  createdAtUtc: string
  readAtUtc: string | null
  emailDeliveryStatus?: 'None' | 'Pending' | 'Sending' | 'Sent' | 'Failed' | 'Skipped'
}
type Page<T> = { items: T[]; totalItems: number; page: number; pageSize: number; totalPages: number }
type Preference = {
  optedIn: boolean
  emailOptedIn: boolean
  mealLoggingEnabled: boolean
  activityEnabled: boolean
  challengeEnabled: boolean
  weeklySummaryEnabled: boolean
  mealTime: string
  activityTime: string
  challengeTime: string
  weeklySummaryTime: string
  quietStart: string
  quietEnd: string
  version: number
  timeZone: string
}
type Schedule = { category: Category; dueAtUtc: string; timeZone: string }
const labels: Record<Category, string> = {
  1: 'Ghi bữa ăn', 2: 'Vận động', 3: 'Thử thách', 4: 'Tổng kết tuần',
}
const categoryFor = (id: Category) => labels[id] ?? 'Thông báo'
const toInput = (value: string) => value.slice(0, 5)
const toApi = (value: string) => value.length === 5 ? `${value}:00` : value

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  // React Query supplies server defaults; local state exists only after an edit.
  const [draftOverride, setDraftOverride] = useState<Preference | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [browserNotificationsOn, setBrowserNotificationsOn] = useState(false)
  const seenNotifications = useRef<Set<string>>(new Set())
  const firstNotificationLoad = useRef(true)
  const preferences = useQuery({
    queryKey: ['reminder-preferences'],
    queryFn: async () => (await api.get<Preference>('/reminders/preferences')).data,
  })
  const draft = draftOverride ?? preferences.data ?? null

  const schedule = useQuery({
    queryKey: ['reminder-preview'],
    queryFn: async () => (await api.get<Schedule[]>('/reminders/preview')).data,
  })
  const messages = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => (await api.get<Page<Notification>>('/notifications',
      { params: { page, pageSize: 10 } })).data,
    refetchInterval: 30000,
  })
  const unread = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data,
    refetchInterval: 30000,
  })

  // Foreground browser alerts require an explicit user gesture/permission.
  // This is NOT background Web Push: a closed tab cannot receive alerts.
  useEffect(() => {
    const rows = messages.data?.items
    if (!rows) return
    if (firstNotificationLoad.current) {
      rows.forEach(n => seenNotifications.current.add(n.id))
      firstNotificationLoad.current = false
      return
    }
    if (!browserNotificationsOn) {
      rows.forEach(n => seenNotifications.current.add(n.id))
      return
    }
    if (typeof window === 'undefined' ||
      !('Notification' in window) || Notification.permission !== 'granted') return
    for (const row of rows) {
      if (row.readAtUtc || seenNotifications.current.has(row.id)) continue
      seenNotifications.current.add(row.id)
      const alert = new Notification('LongevityDiet có lời nhắc mới', {
        body: 'Mở ứng dụng để xem nội dung.',
        tag: 'ldc-reminder-' + row.id,
      })
      alert.onclick = () => {
        window.focus()
        window.location.assign('/notifications')
        alert.close()
      }
    }
  }, [messages.data, browserNotificationsOn])

  async function enableBrowserAlerts() {
    if (!('Notification' in window)) {
      setFeedback('Trình duyệt này không hỗ trợ thông báo hệ thống.')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setBrowserNotificationsOn(true)
        setFeedback('Đã bật thông báo khi trang đang mở. Đây chưa phải Web Push chạy nền.')
      } else {
        setFeedback('Trình duyệt chưa cho phép thông báo. Có thể thay đổi quyền trong cài đặt trang.')
      }
    } catch {
      setFeedback('Không thể yêu cầu quyền thông báo trong trình duyệt này.')
    }
  }

  const refreshMessages = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] }),
  ])
  const save = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Chưa tải cài đặt nhắc lịch.')
      return api.put<Preference>('/reminders/preferences', {
        ...draft, version: undefined, timeZone: undefined,
        mealTime: toApi(draft.mealTime),
        activityTime: toApi(draft.activityTime),
        challengeTime: toApi(draft.challengeTime),
        weeklySummaryTime: toApi(draft.weeklySummaryTime),
        quietStart: toApi(draft.quietStart),
        quietEnd: toApi(draft.quietEnd),
      })
    },
    onSuccess: async () => {
      setFeedback('Đã lưu cài đặt. Lịch mới sẽ được Worker xử lý khi Redis hoạt động.')
      await queryClient.invalidateQueries({ queryKey: ['reminder-preferences'] })
      setDraftOverride(null)
      await queryClient.invalidateQueries({ queryKey: ['reminder-preview'] })
    },
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })
  const markRead = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: refreshMessages,
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })
  const markAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: refreshMessages,
    onError: (error) => setFeedback(getApiErrorMessage(error)),
  })

  function setBoolean(key: keyof Preference, checked: boolean) {
    setDraftOverride((s) => {
      const base = s ?? preferences.data
      return base ? { ...base, [key]: checked } : null
    })
  }
  function setTime(key: keyof Preference, value: string) {
    setDraftOverride((s) => {
      const base = s ?? preferences.data
      return base ? { ...base, [key]: toApi(value) } : null
    })
  }

  return (
    <main className="tracking-page">
      <header className="tracking-header">
        <Link className="tracking-back" to="/app"><ArrowLeft size={18} /> Quay lại ứng dụng</Link>
        <span className="eyebrow">LỊCH NHẮC VÀ THÔNG BÁO</span>
        <h1>Giữ nhịp theo cách bạn chọn</h1>
        <p>Nhắc lịch hoạt động theo múi giờ trong hồ sơ. Bạn kiểm soát loại nhắc nhở và giờ yên tĩnh.</p>
      </header>
      {feedback && <p className="tracking-feedback" role="status">{feedback}</p>}
      <div className="tracking-two-col">
        <section className="tracking-panel">
          <h2><Clock3 size={20} /> Tùy chọn nhắc lịch</h2>
          {preferences.isLoading ? <p>Đang tải tùy chọn...</p> :
            preferences.isError ? <p role="alert">{getApiErrorMessage(preferences.error)}</p> :
            draft && <form onSubmit={(e) => { e.preventDefault(); save.mutate() }}>
              <label className="notification-toggle">
                <input type="checkbox" checked={draft.optedIn}
                  onChange={e => setBoolean('optedIn', e.target.checked)} />
                <span>Cho phép nhắc lịch</span>
              </label>
              <label className="notification-toggle">
                <input type="checkbox" checked={draft.emailOptedIn}
                  disabled={!draft.optedIn}
                  onChange={e => setBoolean('emailOptedIn', e.target.checked)} />
                <span>Đồng ý nhận email nhắc lịch qua địa chỉ trong hồ sơ</span>
              </label>
              <p className="tracking-note">
                Email là tùy chọn riêng, mặc định tắt. Chỉ gửi khi dịch vụ email được quản trị viên cấu hình;
                bạn có thể tắt bất cứ lúc nào. Nội dung email không chứa thông tin sức khỏe nhạy cảm.
              </p>
              <p className="tracking-note">Múi giờ hiện tại: {draft.timeZone}. Thay đổi ở trang Hồ sơ.</p>
              {([
                ['mealLoggingEnabled', 'mealTime', 'Ghi bữa ăn'],
                ['activityEnabled', 'activityTime', 'Vận động'],
                ['challengeEnabled', 'challengeTime', 'Thử thách'],
                ['weeklySummaryEnabled', 'weeklySummaryTime', 'Tổng kết tuần (thứ Hai)'],
              ] as const).map(([checked, time, label]) => (
                <div className="notification-preference" key={checked}>
                  <label className="notification-toggle">
                    <input type="checkbox" checked={draft[checked]}
                      onChange={e => setBoolean(checked, e.target.checked)} />
                    <span>{label}</span>
                  </label>
                  <label className="notification-time">Giờ nhắc
                    <input type="time" value={toInput(draft[time])}
                      onChange={e => setTime(time, e.target.value)} />
                  </label>
                </div>
              ))}
              <div className="notification-preference">
                <label className="notification-time">Bắt đầu giờ yên tĩnh
                  <input type="time" value={toInput(draft.quietStart)}
                    onChange={e => setTime('quietStart', e.target.value)} /></label>
                <label className="notification-time">Kết thúc giờ yên tĩnh
                  <input type="time" value={toInput(draft.quietEnd)}
                    onChange={e => setTime('quietEnd', e.target.value)} /></label>
              </div>
              <button type="submit" disabled={save.isPending}>Lưu lịch nhắc</button>
            </form>}
        </section>
        <section className="tracking-panel">
          <h2>Thời điểm dự kiến</h2>
          {schedule.isLoading ? <p>Đang tải lịch...</p> :
            schedule.isError ? <p role="alert">{getApiErrorMessage(schedule.error)}</p> :
            schedule.data?.length === 0 ? <p>Bạn chưa bật nhắc lịch.</p> :
            <div className="tracking-history">
              {schedule.data?.map((next) => (
                <div className="tracking-history-item" key={next.category}>
                  <div><strong>{categoryFor(next.category)}</strong>
                    <small>{new Date(next.dueAtUtc).toLocaleString('vi-VN',
                      { timeZone: next.timeZone, dateStyle: 'full', timeStyle: 'short' })}</small>
                  </div>
                </div>
              ))}
            </div>}
          <p className="tracking-note">Giờ hiển thị là thời điểm dự kiến; thông báo thực tế phụ thuộc vào Worker và Redis.</p>
        </section>
      </div>
      <section className="tracking-panel">
        <div className="notification-heading">
          <h2><Bell size={20} /> Hộp thư <span>({unread.data?.count ?? 0} chưa đọc)</span></h2>
          <button type="button" onClick={() => void enableBrowserAlerts()}
            disabled={browserNotificationsOn}>
            <Bell size={16} /> {browserNotificationsOn ? 'Đã bật thông báo tab' : 'Bật thông báo trình duyệt'}
          </button>
          <button type="button" disabled={!unread.data?.count || markAll.isPending}
            onClick={() => markAll.mutate()}><CheckCheck size={16} /> Đọc tất cả</button>
        </div>
        {messages.isLoading ? <p>Đang tải thông báo...</p> :
          messages.isError ? <p role="alert">{getApiErrorMessage(messages.error)}</p> :
          messages.data?.items.length === 0 ? <p>Chưa có thông báo nào.</p> :
          <div className="tracking-history">
            {messages.data?.items.map((message) => (
              <div className="tracking-history-item" key={message.id}>
                <div>
                  <strong>{message.title}{!message.readAtUtc ? ' • Chưa đọc' : ''}</strong>
                  <p>{message.body}</p>
                  <small>{new Date(message.createdAtUtc).toLocaleString('vi-VN')}</small>
                  {message.emailDeliveryStatus === 'Sent' &&
                    <small> • Đã chuyển qua SMTP (chưa xác minh hộp thư đích)</small>}
                  {message.emailDeliveryStatus === 'Failed' &&
                    <small> • Email chưa gửi được, vẫn có thể xem tại đây</small>}
                  {(['Pending', 'Sending'] as const).includes(message.emailDeliveryStatus as 'Pending' | 'Sending') &&
                    <small> • Email đang được xử lý</small>}
                  <Link to={message.deepLink} className="tracking-back">Mở trang liên quan</Link>
                </div>
                {!message.readAtUtc && <button type="button" aria-label="Đánh dấu đã đọc"
                  disabled={markRead.isPending} onClick={() => markRead.mutate(message.id)}>
                  <CheckCheck size={18} /></button>}
              </div>
            ))}
          </div>}
        {(messages.data?.totalPages ?? 0) > 1 && <div className="tracking-pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {page} / {messages.data?.totalPages}</span>
          <button disabled={page === (messages.data?.totalPages ?? 1)}
            onClick={() => setPage(page + 1)}>Sau</button>
        </div>}
      </section>
    </main>
  )
}
