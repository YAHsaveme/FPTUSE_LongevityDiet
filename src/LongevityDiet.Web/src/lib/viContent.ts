import { ALLERGEN_LABELS } from './allergenNames'

/**
 * Vietnamese presentation labels for stable protocol values and historical seeded
 * catalog data. Never translate IDs, request payloads, source URLs, or user input.
 * Unknown values remain unchanged rather than fabricating a translation.
 */
const knownLabels: Record<string, string> = {
  AdultGeneral: 'Người trưởng thành',
  OlderAdult: 'Người lớn tuổi',
  AgeUnverified: 'Chưa xác minh tuổi',
  Adolescent: 'Người chưa thành niên',
  ProfessionalReviewRequired: 'Cần được nhân viên y tế đánh giá',
  WellbeingReviewRequired: 'Cần đánh giá lại tình trạng sức khỏe',
  fatigue: 'Mệt mỏi',
  bloating: 'Đầy bụng',
  nausea: 'Buồn nôn',
  abdominal_pain: 'Đau bụng',
  rash: 'Nổi mẩn',
  dizziness: 'Chóng mặt',
  headache: 'Đau đầu',
  breathing_difficulty: 'Khó thở',
  throat_swelling: 'Sưng họng',
  fainting: 'Ngất',
  other: 'Khác',
  Baseline: 'Trước lộ trình',
  During: 'Trong lộ trình',
  FollowUp: 'Theo dõi sau lộ trình',
  pregnancy: 'Đang mang thai',
  breastfeeding: 'Đang cho con bú',
  'Add your birth year in Profile before using the rolling plan.': 'Hãy bổ sung năm sinh trong hồ sơ trước khi sử dụng tính năng gợi ý thực đơn tự động.',
  'Children and adolescents need age-appropriate professional dietary advice.': 'Trẻ em và vị thành niên cần hướng dẫn dinh dưỡng phù hợp độ tuổi từ nhân viên y tế có chuyên môn.',
  'Do not self-prescribe a restrictive diet. Consult a qualified clinician or dietitian.': 'Không tự áp dụng chế độ ăn hạn chế. Hãy trao đổi với bác sĩ hoặc chuyên gia dinh dưỡng có chuyên môn.',
  'Older adults may have distinct protein and nutrient needs; review adequacy with a dietitian.': 'Người lớn tuổi có nhu cầu đạm và vi chất riêng. Cần đánh giá tính đầy đủ của thực đơn cùng chuyên gia dinh dưỡng.',
  'General wellness guidance only. This is not a treatment plan or a lifespan prediction.': 'Hướng dẫn sức khỏe mang tính tham khảo, không phải phác đồ điều trị hay dự đoán tuổi thọ.',
  'Reported severe symptoms can be an emergency. Seek immediate medical assistance; do not continue the diet experiment.': 'Triệu chứng nghiêm trọng có thể là tình huống cấp cứu. Hãy tìm trợ giúp y tế ngay và không tiếp tục thử nghiệm chế độ ăn.',
  'Several very-low wellbeing ratings were reported in the last week. Pause self-directed changes and ask a qualified professional to assess your situation.': 'Bạn đã ghi nhận nhiều ngày có mức sức khỏe rất thấp. Hãy tạm dừng thay đổi chế độ ăn và trao đổi với nhân viên y tế có chuyên môn.',
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
  Ready: 'Đã tạo xong',
  Pending: 'Đang xử lý',
  Queued: 'Đang chờ xử lý',
  Failed: 'Thất bại',
  Completed: 'Đã hoàn thành',
  InProgress: 'Đang thực hiện',
  'In Progress': 'Đang thực hiện',
  Superseded: 'Đã thay thế',
  Archived: 'Đã lưu trữ',
  PlantForward: 'Ưu tiên thực vật',
  Pescatarian: 'Chủ đạo thực vật, có cá',
  StrictlyPlantBased: 'Hoàn toàn từ thực vật',
  'Plant-forward': 'Ưu tiên thực vật',
  'Plant-based': 'Có nguồn gốc thực vật',
  Legume: 'Nhóm đậu',
  legume: 'Nhóm đậu',
  protein: 'Chất đạm',
  fiber: 'Chất xơ',
  vegetable: 'Rau củ',
  'plant-forward': 'Ưu tiên thực vật',
  fish: 'Cá',
  'Whole Grain': 'Ngũ cốc nguyên hạt',
  'whole-grain': 'Ngũ cốc nguyên hạt',
  Vegetable: 'Rau củ',
  Fish: 'Cá',
  Seafood: 'Hải sản',
  Main: 'Món chính',
  International: 'Quốc tế',
  Vietnamese: 'Việt Nam',
  Mediterranean: 'Địa Trung Hải',
  Breakfast: 'Bữa sáng',
  Lunch: 'Bữa trưa',
  Dinner: 'Bữa tối',
  Snack: 'Bữa phụ',
  unavailable: 'Chưa có dữ liệu',
  available: 'Sẵn có',
  Unknown: 'Chưa xác định',
  Draft: 'Bản nháp',
  Published: 'Đã xuất bản',
  Retired: 'Đã ngừng áp dụng',
  'In review': 'Đang chờ duyệt',
  Created: 'Đã tạo',
  Edited: 'Đã chỉnh sửa',
  Submitted: 'Đã gửi duyệt',
  Rejected: 'Bị từ chối',
  OfficialGuidance: 'Hướng dẫn chính thức',
  PeerReviewed: 'Đã bình duyệt',
  TeamDefined: 'Nhóm xây dựng',
  Moderate: 'Trung bình',
  High: 'Cao',
  Low: 'Thấp',
  'Cooked Lentils': 'Đậu lăng nấu chín',
  'Cooked Brown Rice': 'Gạo lứt nấu chín',
  'Cooked Salmon': 'Cá hồi nấu chín',
  'Steamed Broccoli': 'Bông cải xanh hấp',
  'Lentil Brown Rice Bowl': 'Cơm gạo lứt với đậu lăng và bông cải xanh',
  'Salmon Brown Rice Plate': 'Cá hồi với gạo lứt và bông cải xanh',
  'Team-authored bowl with lentils, brown rice and broccoli.':
    'Món ăn do nhóm xây dựng từ đậu lăng, gạo lứt và bông cải xanh.',
  'Team-authored plate with salmon, brown rice and broccoli.':
    'Món ăn do nhóm xây dựng từ cá hồi, gạo lứt và bông cải xanh.',
  Soy: 'Đậu nành',
  soy: 'Đậu nành',
  'Prefer a plant-forward pattern': 'Ưu tiên chế độ ăn chủ đạo thực vật',
  'Limit refined sugar': 'Hạn chế đường tinh luyện',
  'Favor vegetables, legumes and whole grains while keeping the rule educational and configurable.':
    'Ưu tiên rau củ, các loại đậu và ngũ cốc nguyên hạt; nguyên tắc mang tính giáo dục và có thể điều chỉnh.',
  'Use sugar as a ranking signal for everyday meal choices, not as medical advice.':
    'Sử dụng hàm lượng đường để xếp hạng gợi ý món ăn hằng ngày, không phải chỉ định y khoa.',
  'Fondazione Valter Longo, Longevity Diet for Adults':
    'Quỹ Valter Longo, hướng dẫn chế độ ăn trường thọ dành cho người lớn',
  'No meal logs recorded for the current week.':
    'Chưa có nhật ký bữa ăn trong tuần hiện tại.',
}
export function viContent(value: string | null | undefined): string {
  if (value == null) return ''
  return knownLabels[value.trim()] ?? ALLERGEN_LABELS[value.trim()] ?? value
}
export function viTokens(text: string | null | undefined): string {
  if (!text) return ''
  return text.split(',').map(part => viContent(part.trim())).join(', ')
}
export function viReason(code: string): string {
  const reasons: Record<string, string> = {
    PLANT_FORWARD: 'Ưu tiên nguồn thực vật',
    LEGUME_PROTEIN: 'Có chất đạm từ các loại đậu',
    COMPLEX_CARBS: 'Ngũ cốc nguyên hạt',
    MODERATE_FISH: 'Cá với tần suất được kiểm soát',
    LOW_SUGAR_SATFAT: 'Ưu tiên theo tiêu chí đường và chất béo bão hòa',
    REJECTED_HARD_ALLERGEN: 'Không phù hợp vì dị ứng đã khai báo',
    REJECTED_EXPLICIT_EXCLUSION: 'Thuộc danh sách thực phẩm muốn loại trừ',
    REJECTED_DIETARY_PATTERN_CONFLICT: 'Không phù hợp chế độ ăn',
    REJECTED_UNSAFE_STATE: 'Dữ liệu hoặc trạng thái món không hợp lệ',
    REJECTED_UNSUPPORTED_SLOT: 'Không phù hợp loại bữa ăn',
    REJECTED_INACTIVE_CANDIDATE: 'Món đã ngừng hoạt động',
  }
  return reasons[code] ?? code
}
export function viReportSummary(value: string): string {
  const old = /^Bạn đã ghi nhận dữ liệu (\d+)\/7 ngày; (\d+) ngày challenge được hoàn thành\.$/.exec(value)
  if (old) return 'Bạn đã ghi nhật ký trong '+old[1]+'/7 ngày; đã hoàn thành '+old[2]+' ngày thử thách. Đây là dữ liệu tự ghi, không thể suy luận hiệu quả sức khỏe khi chưa có đủ thông tin.'
  return viContent(value)
}
export function viReportMetric(key: string): string {
  const metrics: Record<string, string> = {
    logging_consistency: 'Tỷ lệ ghi nhật ký đầy đủ',
    average_calories: 'Năng lượng trung bình trên các ngày có nhật ký',
    eating_window_observed_days: 'Số ngày có dữ liệu khung giờ ăn',
    activity: 'Dữ liệu vận động',
    ldas: 'Chỉ số tuân thủ dinh dưỡng',
    challenge_completed_days: 'Số ngày hoàn thành thử thách',
    challenge_streak: 'Chuỗi ngày hoàn thành liên tiếp',
    eating_window_target_days: 'Số ngày đạt mục tiêu khung giờ ăn',
  }
  return metrics[key] ?? `Chỉ số chưa có nhãn tiếng Việt (mã ${key})`
}
export function viLegacyPlanExplanation(plan: {
  planExplanation: string; days: unknown[]; mealsPerDay: number; dietaryPattern: string;
  appliedAllergies: string[]; appliedExclusions: string[]; ruleSetVersion: string;
}): string {
  if (!/^A \d+-day meal idea schedule based on educational rule set /i.test(plan.planExplanation)) {
    return plan.planExplanation
  }
  const allergies = plan.appliedAllergies.length ? viTokens(plan.appliedAllergies.join(', ')) : 'không khai báo';
  const excluded = plan.appliedExclusions.length ? viTokens(plan.appliedExclusions.join(', ')) : 'không khai báo';
  return `Kế hoạch tham khảo ${plan.days.length} ngày, ${plan.mealsPerDay} bữa/ngày. ` +
    `Chế độ ăn: ${viContent(plan.dietaryPattern)}. Dị ứng đã khai báo: ${allergies}. ` +
    `Thực phẩm loại trừ: ${excluded}. Áp dụng bộ quy tắc ${plan.ruleSetVersion}. ` +
    'Hãy xem thành phần và định lượng trong từng bữa; không coi kế hoạch này là chỉ định điều trị. ' +
    'Dữ liệu dinh dưỡng minh họa chưa được xác thực cho mọi nhu cầu cá nhân và nguy cơ tiếp xúc chéo.'
}
