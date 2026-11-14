import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Clock3, Edit3, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/apiError'
import { viContent } from '../../lib/viContent'
import type { CandidateMealDto, MealPlanDayDto, MealPlanDto, PlannedMealDto } from './PlannerWorkspacePage'
import './meal-plan-editor.css'

const SLOT_NAMES: Record<string, string> = {
  Breakfast: 'Bữa sáng',
  Lunch: 'Bữa trưa',
  Dinner: 'Bữa tối',
  Snack: 'Bữa phụ',
}

type MealForm = {
  slotType: string
  candidateCode: string
  plannedTime: string
}
const emptyForm: MealForm = { slotType: 'Snack', candidateCode: '', plannedTime: '16:00' }

type Props = {
  plan: MealPlanDto
  day: MealPlanDayDto
  candidates: CandidateMealDto[]
  onUpdated: (value: MealPlanDto) => void
  onArchived: () => void
}

export function MealPlanEditor({ plan, day, candidates, onUpdated, onArchived }: Props) {
  const queryClient = useQueryClient()
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MealForm>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const safeSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  const filteredCandidates = candidates.filter(candidate =>
    candidate.supportedSlots.includes(form.slotType),
  )
  const availableSlots = safeSlots.filter(slot =>
    slot === 'Snack' ||
    !day.meals.some(meal => meal.slotType === slot && meal.id !== editingId),
  )
  const timeValue = /^\d{2}:\d{2}$/.test(form.plannedTime) ? form.plannedTime + ':00' : form.plannedTime

  const save = useMutation({
    mutationFn: async () => {
      const payload = { candidateCode: form.candidateCode, slotType: form.slotType, plannedTime: timeValue }
      const url = editingId
        ? `/meal-plans/${plan.id}/meals/${editingId}`
        : `/meal-plans/${plan.id}/days/${day.id}/meals`
      const response = editingId
        ? await api.put<MealPlanDto>(url, payload)
        : await api.post<MealPlanDto>(url, payload)
      return response.data
    },
    onSuccess: (updated) => {
      onUpdated(updated)
      setNotice(editingId ? 'Đã cập nhật bữa ăn và lưu vào database.' : 'Đã thêm bữa ăn mới vào thực đơn.')
      setError(null)
      setShowEditor(false)
      setEditingId(null)
      setForm(emptyForm)
      void queryClient.invalidateQueries({ queryKey: ['recommendations-for-meal'] })
    },
    onError: (err) => {
      setNotice(null)
      setError(getApiErrorMessage(err, 'Không thể lưu bữa ăn. Hãy kiểm tra nguyên liệu và dị ứng.'))
    },
  })
  const remove = useMutation({
    mutationFn: async (mealId: string) => (
      await api.delete<MealPlanDto>(`/meal-plans/${plan.id}/meals/${mealId}`)
    ).data,
    onSuccess: (updated) => {
      onUpdated(updated)
      setConfirmDeleteId(null)
      setNotice('Đã xóa bữa ăn khỏi thực đơn. Nhật ký đã ăn được quản lý riêng.')
      setError(null)
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Không thể xóa bữa ăn.')),
  })
  const archive = useMutation({
    mutationFn: async () => api.delete(`/meal-plans/${plan.id}`),
    onSuccess: () => {
      setConfirmArchive(false)
      onArchived()
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Không thể lưu trữ thực đơn.')),
  })

  const edit = (meal: PlannedMealDto) => {
    setEditingId(meal.id)
    setForm({
      slotType: meal.slotType,
      candidateCode: meal.candidateCode,
      plannedTime: meal.plannedTime.slice(0, 5),
    })
    setShowEditor(true)
    setError(null)
    setNotice(null)
    setConfirmDeleteId(null)
  }

  const beginNew = () => {
    setEditingId(null)
    setForm({ ...emptyForm, slotType: availableSlots.includes('Snack') ? 'Snack' : availableSlots[0] ?? 'Snack' })
    setShowEditor(true)
    setError(null)
    setNotice(null)
    setConfirmDeleteId(null)
  }

  return (
    <section className="meal-editor surface-card" aria-label="Quản lý bữa ăn trong thực đơn">
      <header className="meal-editor-head">
        <div>
          <span className="micro-label">THỰC ĐƠN TÙY CHỈNH · CRUD</span>
          <h4>Quản lý bữa ăn ngày {day.dayNumber}</h4>
          <p>Thêm, sửa giờ và đổi món từ danh mục. Hệ thống kiểm tra dị ứng trước khi lưu.</p>
        </div>
        <button type="button" className="secondary-button" onClick={beginNew} disabled={day.meals.length >= 4}>
          <Plus size={18} /> Thêm bữa ăn
        </button>
      </header>

      <div className="meal-editor-list">
        {day.meals.map(meal => (
          <div className="meal-editor-row" key={meal.id}>
            <div>
              <strong>{viContent(meal.title)}</strong>
              <span>{SLOT_NAMES[meal.slotType] ?? meal.slotType} · {meal.plannedTime.slice(0, 5)} · {meal.caloriesKcal} kcal</span>
            </div>
            <div className="meal-editor-row-actions">
              <button type="button" onClick={() => edit(meal)} aria-label={`Sửa ${meal.title}`}>
                <Edit3 size={17} /> Sửa
              </button>
              {confirmDeleteId === meal.id ? (
                <>
                  <button type="button" className="danger" disabled={remove.isPending} onClick={() => remove.mutate(meal.id)}>
                    Xác nhận xóa
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} aria-label="Hủy xóa">
                    <X size={16} /> Hủy
                  </button>
                </>
              ) : (
                <button type="button" className="danger" disabled={day.meals.length <= 1} title={day.meals.length <= 1 ? 'Mỗi ngày cần ít nhất một bữa' : undefined}
                  onClick={() => setConfirmDeleteId(meal.id)} aria-label={`Xóa ${meal.title}`}>
                  <Trash2 size={16} /> Xóa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showEditor && (
        <form className="meal-editor-form" onSubmit={(event) => { event.preventDefault(); save.mutate() }}>
          <div className="meal-editor-form-title">
            <strong>{editingId ? 'Chỉnh sửa bữa ăn' : 'Tạo bữa ăn trong thực đơn'}</strong>
            <button type="button" onClick={() => { setShowEditor(false); setEditingId(null) }} aria-label="Đóng biểu mẫu"><X size={18} /></button>
          </div>
          <div className="meal-editor-fields">
            <label>
              <span>Loại bữa</span>
              <select required value={form.slotType}
                onChange={event => setForm({ ...form, slotType: event.target.value, candidateCode: '' })}>
                {safeSlots.map(slot => (
                  <option key={slot} value={slot} disabled={!availableSlots.includes(slot)}>
                    {SLOT_NAMES[slot]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Giờ ăn dự kiến</span>
              <input type="time" required value={form.plannedTime}
                onChange={event => setForm({ ...form, plannedTime: event.target.value })} />
            </label>
            <label className="meal-editor-food">
              <span>Chọn món đã có trong danh mục</span>
              <select required value={form.candidateCode}
                onChange={event => setForm({ ...form, candidateCode: event.target.value })}>
                <option value="">Chọn món (không tự tạo dữ liệu dinh dưỡng)</option>
                {filteredCandidates.map(candidate => (
                  <option key={candidate.candidateCode} value={candidate.candidateCode}>
                    {viContent(candidate.title)} · {candidate.caloriesKcal} kcal
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="meal-editor-caution">
            Giá trị dinh dưỡng của món do danh mục cung cấp. Chỉ món còn hoạt động, có nguyên liệu
            và phù hợp ràng buộc dị ứng mới được lưu; không có bảo đảm tránh lây nhiễm chéo.
          </p>
          <div className="meal-editor-actions">
            <button type="submit" className="primary-button" disabled={save.isPending || !form.candidateCode || !form.plannedTime}>
              <Check size={18} /> {save.isPending ? 'Đang lưu...' : editingId ? 'Lưu chỉnh sửa' : 'Thêm vào thực đơn'}
            </button>
          </div>
        </form>
      )}

      {notice && <p role="status" className="form-success">{notice}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}

      <footer className="meal-editor-footer">
        <a href="https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/" target="_blank" rel="noreferrer">
          <Clock3 size={16} /> Nguyên tắc dinh dưỡng trường thọ — nguồn chính thức
        </a>
        {confirmArchive ? (
          <div className="meal-editor-confirm">
            <span>Đưa thực đơn vào lịch sử? Bạn vẫn có thể tạo thực đơn mới.</span>
            <button type="button" className="danger" disabled={archive.isPending} onClick={() => archive.mutate()}>Xác nhận lưu trữ</button>
            <button type="button" onClick={() => setConfirmArchive(false)}>Hủy</button>
          </div>
        ) : (
          <button type="button" className="meal-editor-archive" onClick={() => setConfirmArchive(true)}>
            <Trash2 size={16} /> Lưu trữ thực đơn
          </button>
        )}
      </footer>
    </section>
  )
}
