import { describe, expect, it } from 'vitest'
import { viContent, viLegacyPlanExplanation, viReason, viReportMetric, viReportSummary } from './viContent'

describe('Hiển thị tiếng Việt cho dữ liệu đã biết', () => {
  it('dịch nhãn trạng thái, món ăn, thực phẩm và chỉ số', () => {
    expect(viContent('Published')).toBe('Đã xuất bản')
    expect(viContent('Cooked Lentils')).toBe('Đậu lăng nấu chín')
    expect(viContent('PlantForward')).toBe('Ưu tiên thực vật')
    expect(viReason('REJECTED_HARD_ALLERGEN')).toContain('dị ứng')
    expect(viReportMetric('challenge_streak')).toBe('Chuỗi ngày hoàn thành liên tiếp')
  })

  it('không tự ý biến đổi tên món chưa được kiểm chứng', () => {
    expect(viContent('Món nhóm tự tạo')).toBe('Món nhóm tự tạo')
    expect(viContent('NEW-UNKNOWN-CODE')).toBe('NEW-UNKNOWN-CODE')
  })

  it('hiển thị bản diễn giải tiếng Việt cho thực đơn lịch sử', () => {
    const result = viLegacyPlanExplanation({
      planExplanation: 'A 7-day meal idea schedule based on educational rule set 2026.11.',
      days: Array(7).fill({}),
      mealsPerDay: 3,
      dietaryPattern: 'PlantForward',
      appliedAllergies: ['fish'],
      appliedExclusions: ['soy'],
      ruleSetVersion: '2026.11',
    })
    expect(result).toContain('Kế hoạch tham khảo 7 ngày')
    expect(result).toContain('Cá')
    expect(result).toContain('Đậu nành')
    expect(result).not.toContain('A 7-day')
  })

  it('dịch cả tóm tắt báo cáo đã lưu từ phiên bản cũ', () => {
    expect(viReportSummary('Bạn đã ghi nhận dữ liệu 2/7 ngày; 1 ngày challenge được hoàn thành.'))
      .toContain('1 ngày thử thách')
  })
})
