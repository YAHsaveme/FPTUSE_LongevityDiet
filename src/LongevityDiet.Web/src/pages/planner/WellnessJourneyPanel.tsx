import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/apiError'

type WellnessCheckIn = {
  id: string
  localDate: string
  phase: 'Baseline' | 'During' | 'FollowUp'
  energy: number
  mood: number
  digestion: number
  sleepQuality: number
  symptoms: string[]
  bodyChanges: string[]
  weightKg: number | null
  notes: string | null
  urgentHelpRecommended: boolean
}
type WellnessOverview = {
  today: string
  timeZone: string
  segment: string
  requiresProfessionalReview: boolean
  screeningComplete: boolean
  dailyCheckInDue: boolean
  urgentHelpRecommended: boolean
  riskFlags: string[]
  allergies: string[]
  guidance: string
  recentCheckIns: WellnessCheckIn[]
  trend: {
    daysReported: number
    daysDuring: number
    averageEnergyDuring: number | null
    averageMoodDuring: number | null
    averageDigestionDuring: number | null
    averageSleepDuring: number | null
    baselineEnergy: number | null
    latestEnergy: number | null
    energyChangeFromBaseline: number | null
    weightChangeFromBaselineKg: number | null
    repeatedLowWellbeing: boolean
  }
}
const healthFlags = [
  ['pregnancy', 'Đang mang thai'],
  ['breastfeeding', 'Đang cho con bú'],
  ['diabetes_medication', 'Đang dùng thuốc điều trị đái tháo đường'],
  ['kidney_disease', 'Có bệnh thận'],
  ['eating_disorder_history', 'Có tiền sử rối loạn ăn uống'],
  ['frailty', 'Suy yếu hoặc nguy cơ mất cơ'],
  ['unintentional_weight_loss', 'Giảm cân ngoài ý muốn'],
  ['complex_chronic_condition', 'Có tình trạng sức khỏe mạn tính phức tạp'],
  ['swallowing_difficulty', 'Khó nhai hoặc nuốt'],
] as const
const allergenPresets = [
  ['peanut', 'Đậu phộng / lạc'], ['shellfish', 'Tôm / cua'],
  ['fish', 'Cá'], ['milk', 'Sữa'], ['egg', 'Trứng'],
  ['soy', 'Đậu nành'], ['wheat', 'Lúa mì'],
  ['tree-nut', 'Các loại hạt cây'], ['sesame', 'Mè / vừng'],
] as const

const symptomOptions = [
  ['fatigue', 'Mệt mỏi'], ['bloating', 'Đầy bụng'], ['nausea', 'Buồn nôn'],
  ['abdominal_pain', 'Đau bụng'], ['rash', 'Nổi mẩn'], ['dizziness', 'Chóng mặt'],
  ['headache', 'Đau đầu'], ['breathing_difficulty', 'Khó thở'],
  ['throat_swelling', 'Sưng họng'], ['fainting', 'Ngất'], ['other', 'Khác'],
] as const
const changeOptions = [
  ['more_energy', 'Nhiều năng lượng hơn'], ['less_energy', 'Ít năng lượng hơn'],
  ['better_sleep', 'Ngủ tốt hơn'], ['worse_sleep', 'Ngủ kém hơn'],
  ['improved_digestion', 'Tiêu hóa tốt hơn'], ['worse_digestion', 'Tiêu hóa kém hơn'],
  ['weight_change', 'Cân nặng thay đổi'], ['other', 'Khác'],
] as const

function toggle(value: string, selected: string[], update: (next: string[]) => void) {
  update(selected.includes(value) ? selected.filter((x) => x !== value) : [...selected, value])
}

export function WellnessJourneyPanel({ todayIso }: { todayIso: string }) {
  const client = useQueryClient()
  const [screenDraft, setScreenDraft] = useState<{
    allergiesText: string
    riskFlags: string[]
    reviewed: boolean
  } | null>(null)
  const [phase, setPhase] = useState<'Baseline' | 'During' | 'FollowUp'>('During')
  const [energy, setEnergy] = useState(3)
  const [mood, setMood] = useState(3)
  const [digestion, setDigestion] = useState(3)
  const [sleepQuality, setSleepQuality] = useState(3)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [bodyChanges, setBodyChanges] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const overviewQuery = useQuery({
    queryKey: ['wellness-overview', todayIso],
    queryFn: async () => (await api.get<WellnessOverview>('/wellness/overview')).data,
  })
  const overview = overviewQuery.data
  const currentDraft = screenDraft ?? {
    allergiesText: overview?.allergies.join(', ') ?? '',
    riskFlags: overview?.riskFlags.filter((x) => x !== 'none') ?? [],
    reviewed: overview?.screeningComplete ?? false,
  }
  const { allergiesText, riskFlags, reviewed } = currentDraft
  const setAllergiesText = (value: string) => setScreenDraft({ ...currentDraft, allergiesText: value })
  const setRiskFlags = (value: string[]) => setScreenDraft({ ...currentDraft, riskFlags: value })
  const setReviewed = (value: boolean) => setScreenDraft({ ...currentDraft, reviewed: value })

  const screeningMutation = useMutation({
    mutationFn: async () =>
      (
        await api.put<WellnessOverview>('/wellness/screening', {
          allergies: allergiesText.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean),
          riskFlags,
          allergiesReviewed: reviewed,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['wellness-overview'] })
      await client.invalidateQueries({ queryKey: ['meal-plan-preferences'] })
    },
  })

  const checkInMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/wellness/check-ins', {
          localDate: overview?.today ?? todayIso,
          phase,
          energy,
          mood,
          digestion,
          sleepQuality,
          symptoms,
          bodyChanges,
          notes: notes.trim() || null,
          weightKg: weightKg.trim() ? Number(weightKg) : null,
        })
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['wellness-overview'] })
      setNotes('')
      setSymptoms([])
      setBodyChanges([])
    },
  })

  const coverage = useQuery({
    queryKey: [
      'wellness-rolling-plan',
      overview?.today,
      overview?.segment,
      overview?.allergies.join(','),
      overview?.riskFlags.join(','),
    ],
    enabled: Boolean(
      overview?.screeningComplete &&
      !overview?.requiresProfessionalReview &&
      !overview?.urgentHelpRecommended,
    ),
    queryFn: async () => (await api.post('/meal-plans/ensure-current')).data,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  })
  useEffect(() => {
    if (coverage.isSuccess) {
      void client.invalidateQueries({ queryKey: ['meal-plan-current'] })
    }
  }, [coverage.isSuccess, coverage.dataUpdatedAt, client])

  const recent = overview?.recentCheckIns ?? []
  const message = screeningMutation.isError
    ? getApiErrorMessage(screeningMutation.error)
    : checkInMutation.isError
      ? getApiErrorMessage(checkInMutation.error)
      : coverage.isError
        ? getApiErrorMessage(coverage.error)
        : null

  return (
    <section className="workspace-section" id="wellness-journey" aria-label="Theo dõi sức khỏe hàng ngày">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LỘ TRÌNH SỨC KHỎE LIÊN TỤC</span>
          <h2>Thực đơn mỗi ngày & nhật ký sức khỏe trước – trong – sau</h2>
          <p>Ghi lại cảm nhận của bạn mỗi ngày. Kết quả là thông tin tự khai, không phải chẩn đoán y khoa.</p>
        </div>
      </div>
      {overviewQuery.isLoading ? <p>Đang tải bảng hỏi sức khỏe…</p> : null}
      {overviewQuery.isError ? <p role="alert">{getApiErrorMessage(overviewQuery.error)}</p> : null}
      {overview ? (
        <>
          <div className="surface-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3>1. Kiểm tra nhóm đối tượng và dị ứng trước khi lên thực đơn</h3>
            <p>Nhóm hiện tại: <strong>{overview.segment}</strong>. {overview.guidance}</p>
            <label className="field">
              <span>Dị ứng thực phẩm (ngăn cách bằng dấu phẩy; để trống nếu đã xác nhận không có)</span>
              <input className="plain-input" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="Ví dụ: peanut, shellfish, soy, milk, egg, fish, wheat, sesame" />
            </label>
            <p>Chọn nhanh nhóm dị ứng thường gặp (vẫn có thể nhập tên khác ở trên):</p>
            <div style={{ display: 'grid', gap: '.45rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {allergenPresets.map(([code, label]) => {
                const selected = allergiesText.split(/[,;\n]/).map((x) => x.trim())
                return (
                  <label key={code}>
                    <input type="checkbox" checked={selected.includes(code)}
                      onChange={() => toggle(code, selected.filter(Boolean), (next) => setAllergiesText(next.join(', ')))} />
                    {' '}{label}
                  </label>
                )
              })}
            </div>
            <p>Tình trạng cần chú ý (chọn tất cả mục phù hợp; không chọn nếu không có):</p>
            <div style={{ display: 'grid', gap: '.45rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {healthFlags.map(([code, label]) => (
                <label key={code}><input type="checkbox" checked={riskFlags.includes(code)}
                  onChange={() => toggle(code, riskFlags, setRiskFlags)} /> {label}</label>
              ))}
            </div>
            <label style={{ display: 'block', marginTop: '.8rem' }}>
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              {' '}Tôi đã rà soát cả dị ứng và các tình trạng sức khỏe ở trên;
              nếu không chọn mục nào nghĩa là tôi không biết mình có tình trạng đó.
            </label>
            <button className="primary-button" type="button" disabled={screeningMutation.isPending}
              onClick={() => screeningMutation.mutate()}>Lưu sàng lọc an toàn</button>
            {!overview.screeningComplete ? <p role="status">Cần xác nhận dị ứng trước khi hệ thống nối tiếp kế hoạch 14 ngày.</p> : null}
            {overview.requiresProfessionalReview ? (
              <p role="alert"><strong>Cần chuyên gia đánh giá:</strong> hệ thống không tự thiết lập chế độ ăn hạn chế cho nhóm này.</p>
            ) : null}
          </div>

          <div className="surface-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3>2. Bảng hỏi thăm sức khỏe hôm nay — {overview.today}</h3>
            <p>{overview.dailyCheckInDue ? 'Hôm nay bạn chưa ghi nhận tình trạng sức khỏe.' : 'Đã có đánh giá trong ngày; bạn có thể cập nhật lại.'}</p>
            {overview.urgentHelpRecommended ? (
              <p role="alert"><strong>Cảnh báo khẩn:</strong> triệu chứng được báo cáo có thể nghiêm trọng. Hãy tìm trợ giúp y tế ngay.</p>
            ) : null}
            <label className="field"><span>Giai đoạn</span>
              <select className="plain-input" value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)}>
                <option value="Baseline">Trước khi bắt đầu (mốc ban đầu)</option>
                <option value="During">Trong lộ trình (mỗi ngày)</option>
                <option value="FollowUp">Sau chu kỳ (theo dõi tiếp)</option>
              </select>
            </label>
            <div style={{ display: 'grid', gap: '.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {([
                ['Năng lượng', energy, setEnergy],
                ['Tinh thần', mood, setMood],
                ['Tiêu hóa', digestion, setDigestion],
                ['Giấc ngủ', sleepQuality, setSleepQuality],
              ] as const).map(([label, value, setter]) => (
                <label key={label} className="field"><span>{label} (1 kém – 5 tốt)</span>
                  <select className="plain-input" value={value} onChange={(e) => setter(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p>Triệu chứng bạn cảm thấy:</p>
            <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>
              {symptomOptions.map(([code, label]) => (
                <label key={code}><input type="checkbox" checked={symptoms.includes(code)}
                  onChange={() => toggle(code, symptoms, setSymptoms)} /> {label}</label>
              ))}
            </div>
            <p>Cơ thể thay đổi như thế nào?</p>
            <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>
              {changeOptions.map(([code, label]) => (
                <label key={code}><input type="checkbox" checked={bodyChanges.includes(code)}
                  onChange={() => toggle(code, bodyChanges, setBodyChanges)} /> {label}</label>
              ))}
            </div>
            <label className="field"><span>Cân nặng tự ghi nhận (kg, tùy chọn)</span>
              <input className="plain-input" type="number" min="20" max="350" step=".1"
                value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </label>
            <label className="field"><span>Cảm nhận khác (tùy chọn)</span>
              <textarea className="plain-input" maxLength={500} rows={3}
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Ăn uống, ngủ nghỉ, vận động, tác dụng không mong muốn…" />
            </label>
            <button type="button" className="primary-button" disabled={checkInMutation.isPending}
              onClick={() => checkInMutation.mutate()}>Lưu nhật ký sức khỏe</button>
            {checkInMutation.isSuccess ? <p role="status">Đã lưu nhật ký của bạn.</p> : null}
          </div>

          <div className="surface-card" style={{ padding: '1.25rem' }}>
            <h3>3. Lộ trình và diễn biến 30 ngày gần nhất</h3>
            <p>Hệ thống kiểm tra và nối tiếp đủ 14 ngày kể từ hôm nay khi bạn mở trang, nếu đã sàng lọc an toàn.</p>
            {coverage.isFetching ? <p>Đang kiểm tra các ngày kế tiếp…</p> : null}
            {coverage.isSuccess ? <p role="status">Lộ trình liên tục đã được kiểm tra. Xem thực đơn từng ngày ở mục bên dưới.</p> : null}
            <p>Đã ghi nhận <strong>{overview.trend.daysReported}</strong> ngày trong tối đa 365 ngày gần nhất;
              <strong> {overview.trend.daysDuring}</strong> ngày trong lộ trình.</p>
            {overview.trend.averageEnergyDuring !== null ? (
              <p>Điểm trung bình tự ghi trong lộ trình (thang 1–5):
                năng lượng {overview.trend.averageEnergyDuring},
                tinh thần {overview.trend.averageMoodDuring},
                tiêu hóa {overview.trend.averageDigestionDuring},
                giấc ngủ {overview.trend.averageSleepDuring}.
                {overview.trend.energyChangeFromBaseline !== null
                  ? ' Thay đổi năng lượng so với mốc trước: ' + overview.trend.energyChangeFromBaseline
                  : ''}
                {overview.trend.weightChangeFromBaselineKg !== null
                  ? ' Chênh lệch cân nặng tự ghi: ' + overview.trend.weightChangeFromBaselineKg + ' kg.'
                  : ''}
              </p>
            ) : null}
            {overview.trend.repeatedLowWellbeing ? (
              <p role="alert">Bạn đã nhiều lần đánh giá sức khỏe ở mức rất thấp trong tuần.
                Cân nhắc tạm dừng thay đổi ăn uống và trao đổi với chuyên gia y tế.</p>
            ) : null}
            <ul>
              {recent.slice(0, 14).map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.localDate}</strong> ({entry.phase}) — Năng lượng {entry.energy}/5,
                  tinh thần {entry.mood}/5, tiêu hóa {entry.digestion}/5, ngủ {entry.sleepQuality}/5
                  {entry.symptoms.length ? '; triệu chứng: ' + entry.symptoms.join(', ') : ''}
                  {entry.urgentHelpRecommended ? ' — CẦN HỖ TRỢ Y TẾ' : ''}
                </li>
              ))}
              {recent.length === 0 ? <li>Chưa có nhật ký. Bạn có thể ghi lại mốc trước khi bắt đầu.</li> : null}
            </ul>
            <small>Điểm tự đánh giá chỉ dùng để theo dõi xu hướng; không chứng minh tác động của món ăn hay dự đoán tuổi thọ.</small>
          </div>
          {message ? <p role="alert">{message}</p> : null}
        </>
      ) : null}
    </section>
  )
}
