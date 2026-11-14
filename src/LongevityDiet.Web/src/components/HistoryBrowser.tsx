import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/apiError'
import './history-browser.css'

type Kind = 'meal-plan' | 'meal-log' | 'challenge'
type HistoryItem = {
  id: string
  title?: string
  status?: string | number
  dietaryPattern?: string
  startDate?: string
  endDate?: string
  localDate?: string
  eatenAt?: string
  generatedAt?: string
  revisionNumber?: number
  totalCaloriesKcal?: number
  mealType?: string
  progressPercent?: number
}
type HistoryPage = {
  items: HistoryItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

function statusLabel(kind: Kind, value: string | number) {
  const statuses = kind === 'meal-plan'
    ? ['Đang áp dụng', 'Đã thay thế', 'Đã lưu trữ']
    : ['Đang thực hiện', 'Hoàn thành', 'Đã ngừng']
  const asNumber = Number(value)
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 3) return statuses[asNumber - 1]
  const byName: Record<string, string> = {
    Active: statuses[0], Superseded: 'Đã thay thế', Archived: 'Đã lưu trữ',
    Completed: 'Hoàn thành', Abandoned: 'Đã ngừng',
  }
  return byName[String(value)] ?? String(value)
}

const configuration = {
  'meal-plan': {
    endpoint: '/meal-plans/page',
    title: 'Lịch sử thực đơn',
    description: 'Tra cứu các phiên bản thực đơn, gồm cả bản đã lưu trữ.',
    sortDefault: 'generatedAt',
    sorts: [['generatedAt', 'Ngày tạo'], ['startDate', 'Ngày bắt đầu'], ['revisionNumber', 'Phiên bản']],
    statuses: [['Active', 'Đang áp dụng'], ['Superseded', 'Được thay thế'], ['Archived', 'Đã lưu trữ']],
  },
  'meal-log': {
    endpoint: '/meal-logs/page',
    title: 'Toàn bộ nhật ký bữa ăn',
    description: 'Tìm kiếm lịch sử đã ghi, không hiển thị các bản ghi đã xóa mềm.',
    sortDefault: 'eatenAt',
    sorts: [['eatenAt', 'Thời gian ăn'], ['localDate', 'Ngày'], ['calories', 'Năng lượng'], ['title', 'Tên bữa']],
    statuses: [],
  },
  challenge: {
    endpoint: '/challenges/history/page',
    title: 'Lịch sử thử thách',
    description: 'Xem quá trình đã tham gia, hoàn thành hoặc ngừng.',
    sortDefault: 'startDate',
    sorts: [['startDate', 'Ngày bắt đầu'], ['endDate', 'Ngày kết thúc'], ['updatedAt', 'Cập nhật gần nhất']],
    statuses: [['Active', 'Đang thực hiện'], ['Completed', 'Hoàn thành'], ['Abandoned', 'Đã ngừng']],
  },
} as const

export function HistoryBrowser({ kind }: { kind: Kind }) {
  const config = configuration[kind]
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [slotType, setSlotType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<string>(config.sortDefault)
  const [sortDirection, setSortDirection] = useState('desc')

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(handle)
  }, [search])

  const invalidDates = !!fromDate && !!toDate && fromDate > toDate
  const history = useQuery({
    queryKey: ['history-browser', kind, page, pageSize, debouncedSearch, status,
      slotType, fromDate, toDate, sortBy, sortDirection],
    queryFn: async () => (await api.get<HistoryPage>(config.endpoint, {
      params: {
        page, pageSize, search: debouncedSearch.trim() || undefined,
        status: status || undefined, slotType: kind === 'meal-log' ? slotType || undefined : undefined,
        fromDate: fromDate || undefined, toDate: toDate || undefined,
        sortBy, sortDirection,
      },
    })).data,
    enabled: expanded && !invalidDates,
  })
  useEffect(() => {
    if (!history.data || page <= Math.max(1, history.data.totalPages)) return
    const handle = window.setTimeout(() => setPage(Math.max(1, history.data?.totalPages ?? 1)), 0)
    return () => window.clearTimeout(handle)
  }, [history.data, page])

  const changePage = (value: number) => setPage(value)
  const reset = () => {
    setPage(1); setPageSize(10); setSearch(''); setDebouncedSearch('')
    setStatus(''); setSlotType(''); setFromDate(''); setToDate('')
    setSortBy(config.sortDefault); setSortDirection('desc')
  }
  const onChange = (setter: (value: string) => void, value: string) => {
    setter(value); setPage(1)
  }
  const totalPages = Math.max(1, history.data?.totalPages ?? 1)
  return <section className="surface-card history-browser" aria-label={config.title}>
    <div className="history-browser-title">
      <div><h2>{config.title}</h2><p>{config.description}</p></div>
      <button type="button" className="secondary-button" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn' : 'Mở lịch sử'}</button>
    </div>
    {expanded && <>
      <div className="history-browser-controls">
        <label>Tìm kiếm<input aria-label="Tìm trong lịch sử" value={search}
          placeholder={kind === 'meal-plan' ? 'Kiểu ăn...' : 'Tên hoặc nội dung...'}
          onChange={event => onChange(setSearch, event.target.value)} /></label>
        <label>Từ ngày<input aria-label="Lọc từ ngày" type="date" value={fromDate}
          onChange={event => onChange(setFromDate, event.target.value)} /></label>
        <label>Đến ngày<input aria-label="Lọc đến ngày" type="date" value={toDate}
          onChange={event => onChange(setToDate, event.target.value)} /></label>
        {kind === 'meal-log' ? <label>Loại bữa<select aria-label="Lọc loại bữa"
          value={slotType} onChange={event => onChange(setSlotType, event.target.value)}>
          <option value="">Tất cả</option><option value="Breakfast">Bữa sáng</option>
          <option value="Lunch">Bữa trưa</option><option value="Dinner">Bữa tối</option>
          <option value="Snack">Bữa phụ</option></select></label> :
          <label>Trạng thái<select aria-label="Lọc trạng thái lịch sử"
            value={status} onChange={event => onChange(setStatus, event.target.value)}>
            <option value="">Tất cả</option>
            {config.statuses.map(([code, label]) => <option value={code} key={code}>{label}</option>)}
          </select></label>}
        <label>Sắp xếp<select aria-label="Trường sắp xếp lịch sử" value={sortBy}
          onChange={event => onChange(setSortBy, event.target.value)}>
          {config.sorts.map(([code, label]) => <option value={code} key={code}>{label}</option>)}
        </select></label>
        <label>Thứ tự<select aria-label="Thứ tự lịch sử" value={sortDirection}
          onChange={event => onChange(setSortDirection, event.target.value)}>
          <option value="desc">Mới trước / giảm dần</option><option value="asc">Cũ trước / tăng dần</option>
        </select></label>
        <label>Số dòng/trang<select aria-label="Số dòng lịch sử" value={pageSize}
          onChange={event => { setPage(1); setPageSize(Number(event.target.value)) }}>
          {[10, 20, 50, 100].map(size => <option value={size} key={size}>{size}</option>)}
        </select></label>
        <button type="button" className="secondary-button" onClick={reset}>Xóa bộ lọc</button>
      </div>
      {invalidDates && <p role="alert">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
      {history.isLoading && <p role="status">Đang tải lịch sử...</p>}
      {history.isError && <p role="alert">{getApiErrorMessage(history.error, 'Không thể tải lịch sử.')}</p>}
      {history.data && history.data.items.length === 0 && <p role="status">Không tìm thấy dữ liệu phù hợp.</p>}
      <div className="history-browser-items">
        {history.data?.items.map(item => <article key={item.id} className="history-browser-item">
          <strong>{item.title || item.dietaryPattern || item.localDate || item.startDate || 'Bản ghi lịch sử'}</strong>
          <span>{item.localDate || item.startDate || ''}{item.endDate ? ' – ' + item.endDate : ''}</span>
          {item.status !== undefined && <small>Trạng thái: {statusLabel(kind, item.status)}</small>}
          {item.revisionNumber !== undefined && <small>Phiên bản: {item.revisionNumber}</small>}
          {item.totalCaloriesKcal !== undefined && <small>Năng lượng ghi nhận: {item.totalCaloriesKcal} kcal</small>}
          {item.progressPercent !== undefined && <small>Tiến độ: {item.progressPercent}%</small>}
        </article>)}
      </div>
      {history.data && <nav className="history-browser-pagination" aria-label="Điều hướng lịch sử">
        <span>{history.data.totalItems} bản ghi · Trang {page}/{totalPages}</span>
        <button type="button" disabled={page <= 1 || history.isFetching} onClick={() => changePage(1)}>Đầu</button>
        <button type="button" disabled={page <= 1 || history.isFetching} onClick={() => changePage(page - 1)}>Trước</button>
        <button type="button" disabled={page >= totalPages || history.isFetching} onClick={() => changePage(page + 1)}>Sau</button>
        <button type="button" disabled={page >= totalPages || history.isFetching} onClick={() => changePage(totalPages)}>Cuối</button>
      </nav>}
    </>}
  </section>
}
