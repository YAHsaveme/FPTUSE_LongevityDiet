/**
 * Chuyển tên dị ứng thường gặp từ tiếng Việt sang mã API mà bộ lọc an toàn hiểu.
 * Không dịch hoặc tự suy đoán các chất gây dị ứng khác: yêu cầu rà soát khi chưa nhận diện.
 */
export const ALLERGEN_LABELS: Readonly<Record<string, string>> = {
  peanut: 'Đậu phộng',
  shellfish: 'Động vật có vỏ',
  fish: 'Cá',
  milk: 'Sữa',
  egg: 'Trứng',
  soy: 'Đậu nành',
  wheat: 'Lúa mì',
  'tree-nut': 'Các loại hạt cây',
  sesame: 'Mè (vừng)',
}

function normalizedText(text: string): string {
  return text.toLocaleLowerCase('vi-VN')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

const ALIASES: Readonly<Record<string, keyof typeof ALLERGEN_LABELS>> = {
  peanut: 'peanut', 'dau phong': 'peanut', 'lac': 'peanut',
  shellfish: 'shellfish', 'tom': 'shellfish', 'cua': 'shellfish',
  'tom cua': 'shellfish', 'tom / cua': 'shellfish', 'so': 'shellfish', 'dong vat co vo': 'shellfish',
  fish: 'fish', 'ca': 'fish',
  milk: 'milk', sua: 'milk',
  egg: 'egg', trung: 'egg',
  soy: 'soy', soja: 'soy', 'dau nanh': 'soy',
  wheat: 'wheat', 'lua mi': 'wheat',
  'tree-nut': 'tree-nut', 'tree nuts': 'tree-nut',
  'hat cay': 'tree-nut', 'cac loai hat cay': 'tree-nut', 'hat co vo cung': 'tree-nut',
  sesame: 'sesame', me: 'sesame', vung: 'sesame', 'me (vung)': 'sesame',
}

/** Chỉ trả mã đã biết. Mục chưa xác định phải được xử lý trước khi đánh dấu an toàn. */
export function parseAllergenInput(raw: string): { codes: string[]; unknown: string[] } {
  const codes: string[] = []
  const unknown: string[] = []
  for (const token of raw.split(/[,;\n]/).map(x => x.trim()).filter(Boolean)) {
    const key = normalizedText(token)
    const code = ALIASES[key] ?? Object.keys(ALLERGEN_LABELS).find(
      canonical => normalizedText(ALLERGEN_LABELS[canonical]) === key
    )
    if (!code) {
      if (!unknown.includes(token)) unknown.push(token)
    } else if (!codes.includes(code)) {
      codes.push(code)
    }
  }
  return { codes, unknown }
}

export function displayAllergens(codes: readonly string[]): string {
  return codes.map(code => ALLERGEN_LABELS[code] ?? code).join(', ')
}
