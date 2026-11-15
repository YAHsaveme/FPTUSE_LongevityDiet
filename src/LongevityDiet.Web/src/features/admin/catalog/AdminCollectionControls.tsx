import { useEffect } from 'react'
import type { CollectionQuery, Kind, Status, Feature } from './useAdminCollection'

export function AdminCollectionControls({ query, kind }: { query: CollectionQuery; kind: Kind }) {
  return <div className="admin-list-filters" aria-label="Tìm kiếm, lọc và sắp xếp">
    <label>Tìm kiếm
      <input aria-label="Tìm theo tên" value={query.search} placeholder="Tìm theo tên..."
        onChange={event => query.updateSearch(event.target.value)} />
    </label>
    <label>Danh mục
      <input aria-label="Lọc theo danh mục" value={query.category} placeholder="Nhập danh mục..."
        onChange={event => query.updateCategory(event.target.value)} />
    </label>
    <label>Trạng thái
      <select aria-label="Lọc trạng thái" value={query.status} onChange={event => query.updateStatus(event.target.value as Status)}>
        <option value="all">Tất cả</option><option value="active">Đang hoạt động</option><option value="inactive">Ngừng sử dụng</option>
      </select>
    </label>
    <label>Đặc điểm
      <select aria-label="Lọc đặc điểm" value={query.feature} onChange={event => query.updateFeature(event.target.value as Feature)}>
        <option value="all">Tất cả</option><option value="plant">Ưu tiên thực vật</option>
        <option value="legume">Có các loại đậu</option><option value="grain">Ngũ cốc nguyên hạt</option>
        <option value="fish">Có cá</option>
      </select>
    </label>
    <label>Sắp xếp
      <select aria-label="Trường sắp xếp" value={query.sortBy} onChange={event => query.updateSortBy(event.target.value)}>
        <option value="name">Tên</option><option value="category">Danh mục</option>
        {kind === 'food' ? <option value="calories">Năng lượng</option> :
          <><option value="cuisine">Ẩm thực</option><option value="prepMinutes">Thời gian chuẩn bị</option></>}
        <option value="createdAt">Ngày tạo</option>
      </select>
    </label>
    <label>Thứ tự
      <select aria-label="Thứ tự sắp xếp" value={query.sortDirection}
        onChange={event => query.updateSortDirection(event.target.value as 'asc' | 'desc')}>
        <option value="asc">Tăng dần</option><option value="desc">Giảm dần</option>
      </select>
    </label>
    <button className="admin-filter-reset" type="button" onClick={query.reset}>Xóa bộ lọc</button>
  </div>
}

export function AdminCollectionPagination({ query, totalItems, totalPages }: {
  query: CollectionQuery; totalItems: number; totalPages: number
}) {
  const pages = Math.max(1, totalPages)
  const from = totalItems === 0 ? 0 : (query.page - 1) * query.pageSize + 1
  const to = Math.min(query.page * query.pageSize, totalItems)
  // After deleting the last item on the final page, recover to the new last page.
  const setPage = query.setPage
  useEffect(() => {
    if (query.page <= pages) return
    const handle = window.setTimeout(() => setPage(pages), 0)
    return () => window.clearTimeout(handle)
  }, [pages, query.page, setPage])
  return <nav className="admin-page-navigation" aria-label="Phân trang danh sách">
    <span>{from}–{to} / {totalItems} bản ghi</span>
    <label>Số dòng/trang
      <select aria-label="Số dòng mỗi trang" value={query.pageSize}
        onChange={event => query.updatePageSize(Number(event.target.value))}>
        {[10, 20, 50, 100].map(count => <option value={count} key={count}>{count}</option>)}
      </select>
    </label>
    <div className="admin-page-buttons">
      <button type="button" aria-label="Trang đầu" disabled={query.page <= 1} onClick={() => query.setPage(1)}>«</button>
      <button type="button" aria-label="Trang trước" disabled={query.page <= 1} onClick={() => query.setPage(p => p - 1)}>‹</button>
      <span>Trang {query.page}/{pages}</span>
      <button type="button" aria-label="Trang sau" disabled={query.page >= pages} onClick={() => query.setPage(p => p + 1)}>›</button>
      <button type="button" aria-label="Trang cuối" disabled={query.page >= pages} onClick={() => query.setPage(pages)}>»</button>
    </div>
  </nav>
}
