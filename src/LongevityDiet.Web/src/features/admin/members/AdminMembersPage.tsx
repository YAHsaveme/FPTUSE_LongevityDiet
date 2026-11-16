import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, ShieldCheck, Users } from 'lucide-react'
import { api } from '../../../lib/api'
import { getApiErrorMessage } from '../../../lib/apiError'
import './admin-members.css'

type Status = 'Active' | 'Disabled'
type Member = {
  id: string; displayName: string; email: string; status: Status
  emailVerified: boolean; profileCompleted: boolean
  createdAt: string; updatedAt: string
}
type Page = { items: Member[]; page: number; pageSize: number; totalItems: number; totalPages: number }
type Audit = {
  id: string; actorAdminId: string; previousStatus: Status
  newStatus: Status; reason: string; changedAt: string
}
const when = (date: string) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}).format(new Date(date))
const statusText = (s: Status) => s === 'Active' ? 'Đang hoạt động' : 'Đã khóa'

export function AdminMembersPage() {
  const cache = useQueryClient()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState('all')
  const [verified, setVerified] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [direction, setDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<Status | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  function resetList() { setPage(1); setSelectedId(null); setNewStatus(null); setMessage('') }

  const listing = useQuery({
    queryKey: ['admin-members', page, size, debounced, filter, verified, sortBy, direction],
    queryFn: async (): Promise<Page> => {
      const q = new URLSearchParams({
        page: String(page), pageSize: String(size), status: filter,
        sortBy, sortDirection: direction,
      })
      if (debounced) q.set('search', debounced)
      if (verified !== 'all') q.set('verified', verified === 'verified' ? 'true' : 'false')
      return (await api.get<Page>('/admin/members?' + q.toString())).data
    },
  })
  // Derive the default selection rather than synchronously setting state in an effect.
  const activeId = selectedId ?? listing.data?.items[0]?.id ?? null

  const detail = useQuery({
    queryKey: ['admin-member-detail', activeId],
    queryFn: async (): Promise<Member> =>
      (await api.get<Member>('/admin/members/' + activeId)).data,
    enabled: !!activeId,
  })
  const history = useQuery({
    queryKey: ['admin-member-history', activeId],
    queryFn: async (): Promise<Audit[]> =>
      (await api.get<Audit[]>('/admin/members/' + activeId + '/history')).data,
    enabled: !!activeId,
  })
  const update = useMutation({
    mutationFn: async (change: { id: string; status: Status; reason: string }) =>
      (await api.patch<Member>('/admin/members/' + change.id + '/status', {
        status: change.status, reason: change.reason,
      })).data,
    onSuccess: member => {
      setMessage('Đã cập nhật ' + member.email + ': ' + statusText(member.status) + '.')
      setReason(''); setNewStatus(null)
      void cache.invalidateQueries({ queryKey: ['admin-members'] })
      void cache.invalidateQueries({ queryKey: ['admin-member-detail', member.id] })
      void cache.invalidateQueries({ queryKey: ['admin-member-history', member.id] })
    },
  })
  const current = detail.data
  const canSubmit = !!current && !!newStatus && reason.trim().length >= 8
    && reason.trim().length <= 300 && !update.isPending

  return (
    <div className="members-admin">
      <header className="members-header">
        <div>
          <Link to="/admin/catalog" className="members-back"><ArrowLeft size={17} /> Quay lại quản trị</Link>
          <span className="members-eyebrow"><ShieldCheck size={17} /> QUẢN TRỊ NGƯỜI DÙNG</span>
          <h1>Quản lý tài khoản Member</h1>
          <p>Tra cứu, xem chi tiết, khóa hoặc mở khóa tài khoản. Không hiển thị dữ liệu sức khỏe riêng tư.</p>
        </div>
        <nav className="members-toplinks"><Link to="/admin/catalog">Thực phẩm · Công thức · Quy tắc</Link></nav>
      </header>

      <main className="members-layout">
        <section className="members-card" aria-labelledby="members-list-title">
          <div className="members-section-head">
            <h2 id="members-list-title"><Users size={20} /> Danh sách Member</h2>
            <span>{listing.data?.totalItems ?? 0} tài khoản</span>
          </div>
          <div className="members-controls">
            <label className="members-search">Tìm theo tên hoặc email
              <span className="members-searchbox"><Search size={17} />
                <input aria-label="Tìm Member" placeholder="Nhập tên hoặc email" maxLength={100}
                  value={search} onChange={e => { setSearch(e.target.value); resetList() }} />
              </span>
            </label>
            <label>Trạng thái
              <select aria-label="Lọc trạng thái Member" value={filter}
                onChange={e => { setFilter(e.target.value); resetList() }}>
                <option value="all">Tất cả</option><option value="active">Đang hoạt động</option>
                <option value="disabled">Đã khóa</option>
              </select>
            </label>
            <label>Xác minh email
              <select aria-label="Lọc xác minh email" value={verified}
                onChange={e => { setVerified(e.target.value); resetList() }}>
                <option value="all">Tất cả</option><option value="verified">Đã xác minh</option>
                <option value="unverified">Chưa xác minh</option>
              </select>
            </label>
            <label>Sắp xếp theo
              <select aria-label="Sắp xếp Member theo" value={sortBy}
                onChange={e => { setSortBy(e.target.value); resetList() }}>
                <option value="createdAt">Ngày tạo</option><option value="email">Email</option>
                <option value="name">Họ tên</option><option value="status">Trạng thái</option>
              </select>
            </label>
            <label>Thứ tự
              <select aria-label="Thứ tự sắp xếp Member" value={direction}
                onChange={e => { setDirection(e.target.value); resetList() }}>
                <option value="desc">Giảm dần</option><option value="asc">Tăng dần</option>
              </select>
            </label>
            <label>Số dòng mỗi trang
              <select aria-label="Số Member mỗi trang" value={size}
                onChange={e => { setSize(Number(e.target.value)); resetList() }}>
                <option value={10}>10</option><option value={20}>20</option>
                <option value={50}>50</option><option value={100}>100</option>
              </select>
            </label>
          </div>

          {listing.isLoading && <p role="status">Đang tải danh sách...</p>}
          {listing.isError && <p role="alert" className="members-error">{getApiErrorMessage(listing.error)}</p>}
          {listing.data?.items.length === 0 && <p role="status" className="members-empty">Không có Member phù hợp.</p>}
          {!!listing.data?.items.length && (
            <div className="members-table-wrap">
              <table><thead><tr><th>Member</th><th>Trạng thái</th><th>Xác minh</th><th>Ngày tạo</th><th>Chi tiết</th></tr></thead>
                <tbody>{listing.data.items.map(member => (
                  <tr key={member.id} className={activeId === member.id ? 'selected' : ''}>
                    <td><strong>{member.displayName}</strong><small>{member.email}</small></td>
                    <td><span className={'members-badge ' + (member.status === 'Active' ? 'active' : 'disabled')}>
                      {statusText(member.status)}</span></td>
                    <td>{member.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</td>
                    <td>{when(member.createdAt)}</td>
                    <td><button type="button" className="members-link"
                      onClick={() => { setSelectedId(member.id); setNewStatus(null); setMessage('') }}>Xem</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <div className="members-pages">
            <span>Trang {listing.data?.page ?? page}/{listing.data?.totalPages ?? 1}</span>
            <div>
              <button type="button" disabled={page <= 1 || listing.isFetching}
                onClick={() => { setPage(p => p - 1); setSelectedId(null) }}>Trang trước</button>
              <button type="button" disabled={page >= (listing.data?.totalPages ?? 1) || listing.isFetching}
                onClick={() => { setPage(p => p + 1); setSelectedId(null) }}>Trang sau</button>
            </div>
          </div>
        </section>

        <aside className="members-card" aria-labelledby="member-detail-title">
          <h2 id="member-detail-title">Chi tiết tài khoản</h2>
          {!activeId && <p>Chọn một Member trong danh sách.</p>}
          {activeId && detail.isLoading && <p role="status">Đang tải chi tiết...</p>}
          {detail.isError && <p role="alert" className="members-error">{getApiErrorMessage(detail.error)}</p>}
          {current && <>
            <dl className="members-facts">
              <div><dt>Họ tên</dt><dd>{current.displayName}</dd></div>
              <div><dt>Email</dt><dd>{current.email}</dd></div>
              <div><dt>Vai trò</dt><dd>Member</dd></div>
              <div><dt>Trạng thái</dt><dd>{statusText(current.status)}</dd></div>
              <div><dt>Xác minh email</dt><dd>{current.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</dd></div>
              <div><dt>Hồ sơ</dt><dd>{current.profileCompleted ? 'Đã thiết lập' : 'Chưa hoàn tất'}</dd></div>
              <div><dt>Đăng ký</dt><dd>{when(current.createdAt)}</dd></div>
              <div><dt>Cập nhật</dt><dd>{when(current.updatedAt)}</dd></div>
            </dl>
            {message && <p role="status" className="members-success">{message}</p>}
            {newStatus === null ? (
              <button className={current.status === 'Active' ? 'members-danger' : 'members-primary'}
                type="button" onClick={() => { setNewStatus(current.status === 'Active' ? 'Disabled' : 'Active'); setReason('') }}>
                {current.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
              </button>
            ) : (
              <form className="members-confirm" onSubmit={e => {
                e.preventDefault()
                if (canSubmit) update.mutate({ id: current.id, status: newStatus, reason: reason.trim() })
              }}>
                <h3>{newStatus === 'Disabled' ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}</h3>
                <p>Thao tác thay đổi trạng thái nhưng không xóa dữ liệu lịch sử.</p>
                <label>Lý do (8–300 ký tự)
                  <textarea aria-label="Lý do thay đổi trạng thái" value={reason}
                    minLength={8} maxLength={300} required rows={3}
                    onChange={e => setReason(e.target.value)} />
                </label>
                {update.isError && <p role="alert" className="members-error">{getApiErrorMessage(update.error)}</p>}
                <div className="members-confirm-buttons">
                  <button type="button" onClick={() => setNewStatus(null)}>Hủy</button>
                  <button type="submit" disabled={!canSubmit}
                    className={newStatus === 'Disabled' ? 'members-danger' : 'members-primary'}>
                    {update.isPending ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </form>
            )}
            <h3 className="members-history-heading">Lịch sử khóa / mở khóa</h3>
            {history.isLoading && <p>Đang tải lịch sử...</p>}
            {history.isError && <p role="alert" className="members-error">{getApiErrorMessage(history.error)}</p>}
            {history.data?.length === 0 && <p>Chưa có thay đổi.</p>}
            {!!history.data?.length && <ol className="members-history">
              {history.data.map(entry => <li key={entry.id}>
                <strong>{statusText(entry.newStatus)}</strong> <small>{when(entry.changedAt)}</small>
                <p>{entry.reason}</p>
              </li>)}
            </ol>}
          </>}
        </aside>
      </main>
    </div>
  )
}
