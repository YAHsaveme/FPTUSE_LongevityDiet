import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecipeHistory, type RecipeCompositionRevision } from '../../catalog/catalogApi'
import './recipe-history.css'

type Composition = {
  isActive: boolean
  ingredients: { foodId: string; amount: number; unit: string; isOptional: boolean }[]
  allergens: { allergenId: string }[]
}

function decodeSnapshot(json: string): Composition | null {
  try {
    const value: unknown = JSON.parse(json)
    if (typeof value !== 'object' || value === null) return null
    const data = value as Record<string, unknown>
    if (typeof data.isActive !== 'boolean' || !Array.isArray(data.ingredients) || !Array.isArray(data.allergens)) return null
    if (!data.ingredients.every((ingredient) => {
      if (typeof ingredient !== 'object' || ingredient === null) return false
      const item = ingredient as Record<string, unknown>
      return typeof item.foodId === 'string' && typeof item.amount === 'number' &&
        Number.isFinite(item.amount) && typeof item.unit === 'string' && typeof item.isOptional === 'boolean'
    })) return null
    if (!data.allergens.every((allergen) =>
      typeof allergen === 'object' && allergen !== null &&
      typeof (allergen as Record<string, unknown>).allergenId === 'string')) return null
    return data as Composition
  } catch {
    return null
  }
}

const labels: Record<string, string> = {
  Created: 'Tạo công thức',
  Updated: 'Cập nhật công thức',
  Deactivated: 'Ngừng sử dụng',
  Imported: 'Nhập dữ liệu cũ',
  Seeded: 'Tạo dữ liệu mẫu',
}

function recordedAt(value: string) {
  // EF SQL Server datetime2 stores UTC without an offset; browsers otherwise
  // interpret that timestamp as device-local time and shift it a second time.
  const utc = /(?:Z|[+-]\d\d:\d\d)$/i.test(value) ? value : value + 'Z'
  const date = new Date(utc)
  return Number.isNaN(date.valueOf()) ? 'Không rõ thời điểm' :
    new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date)
}

function Revision({ revision }: { revision: RecipeCompositionRevision }) {
  const snapshot = decodeSnapshot(revision.snapshotJson)
  return (
    <li className="recipe-history-entry">
      <div className="recipe-history-entry-heading">
        <strong>{labels[revision.changeType] ?? revision.changeType}</strong>
        <time dateTime={revision.recordedAt}>{recordedAt(revision.recordedAt)}</time>
      </div>
      {revision.actorId && <p className="recipe-history-meta">Mã người thay đổi: <code>{revision.actorId}</code></p>}
      {snapshot ? (
        <div>
          <p className="recipe-history-meta">Trạng thái tại thời điểm lưu: {snapshot.isActive ? 'Đang sử dụng' : 'Ngừng sử dụng'}</p>
          <p className="recipe-history-meta"><strong>Nguyên liệu ({snapshot.ingredients.length})</strong></p>
          {snapshot.ingredients.length ? (
            <ul className="recipe-history-ingredients">
              {snapshot.ingredients.map((item) => (
                <li key={item.foodId}>
                  <span><code>{item.foodId}</code></span>
                  <strong>{item.amount} {item.unit}</strong>
                  {item.isOptional && <span> · tùy chọn</span>}
                </li>
              ))}
            </ul>
          ) : <p className="recipe-history-meta">Không có nguyên liệu được ghi nhận.</p>}
          <p className="recipe-history-meta"><strong>Chất gây dị ứng ({snapshot.allergens.length})</strong></p>
          {snapshot.allergens.length ? (
            <ul className="recipe-history-ingredients">
              {snapshot.allergens.map((item) => <li key={item.allergenId}><code>{item.allergenId}</code></li>)}
            </ul>
          ) : <p className="recipe-history-meta">Không có chất gây dị ứng được khai báo trong bản ghi.</p>}
        </div>
      ) : <p role="alert" className="recipe-history-error">Không thể hiển thị dữ liệu lịch sử của bản ghi này.</p>}
    </li>
  )
}

export function RecipeHistoryPanel({
  recipeId, recipeName, onClose,
}: {
  recipeId: string
  recipeName: string
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const history = useQuery({
    queryKey: ['admin', 'recipe-history', recipeId, page],
    queryFn: () => getRecipeHistory(recipeId, page, 5),
    retry: false,
  })
  const data = history.data
  return (
    <section className="recipe-history-panel" aria-label={'Lịch sử công thức ' + recipeName}>
      <div className="recipe-history-toolbar">
        <div>
          <h3>Lịch sử công thức</h3>
          <p className="recipe-history-meta">{recipeName} · Chỉ xem, không sửa dữ liệu lịch sử</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng lịch sử công thức">Đóng</button>
      </div>
      {history.isPending && <p role="status">Đang tải lịch sử công thức...</p>}
      {history.isError && <div role="alert">
        <p>Không thể tải lịch sử công thức.</p>
        <button type="button" onClick={() => void history.refetch()}>Thử lại</button>
      </div>}
      {data && (
        <>
          <p className="recipe-history-meta">Tổng cộng {data.totalItems} bản ghi</p>
          {data.items.length === 0 ? <p>Chưa có lịch sử công thức trên trang này.</p> :
            <ol className="recipe-history-entries">
              {data.items.map((item) => <Revision key={item.id} revision={item} />)}
            </ol>}
          <nav className="recipe-history-pagination" aria-label="Phân trang lịch sử công thức">
            <button type="button" disabled={page <= 1} onClick={() => setPage(v => Math.max(1, v - 1))}>Trang trước</button>
            <span>Trang {data.page} / {Math.max(1, data.totalPages)}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => setPage(v => v + 1)}>Trang sau</button>
          </nav>
        </>
      )}
    </section>
  )
}
