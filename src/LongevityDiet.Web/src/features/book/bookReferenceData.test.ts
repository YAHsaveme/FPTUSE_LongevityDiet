import { describe, expect, it } from 'vitest'
import {
  LONGO_BOOK, LONGO_BOOK_CHAPTERS, LONGO_BOOK_MICRONUTRIENTS,
  LONGO_BOOK_RULES, LONGO_BOOK_TWO_WEEK_MEALS,
} from './bookReferenceData'

describe('Nguồn chuẩn theo sách Valter Longo 2018', () => {
  it('nhận diện đúng bản sách do người dùng cung cấp', () => {
    expect(LONGO_BOOK.pdfPages).toBe(306)
    expect(LONGO_BOOK.isbn).toBe('9780525534075')
    expect(LONGO_BOOK.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(LONGO_BOOK.author).toBe('Valter Longo, PhD')
  })
  it('có 9 nguyên tắc với vị trí tra cứu và cảnh báo áp dụng', () => {
    expect(LONGO_BOOK_RULES).toHaveLength(9)
    for (const rule of LONGO_BOOK_RULES) {
      expect(rule.explanation.length).toBeGreaterThan(35)
      expect(rule.pdfPages).toMatch(/\d/)
      expect(rule.scope.length).toBeGreaterThan(20)
    }
  })
  it('đủ 14 ngày, 28 bữa trưa/tối và không tự tạo số kcal từng món', () => {
    expect(LONGO_BOOK_TWO_WEEK_MEALS).toHaveLength(14)
    const pairs = new Set(LONGO_BOOK_TWO_WEEK_MEALS.map(day => day.week + '-' + day.day))
    expect(pairs.size).toBe(14)
    for (const day of LONGO_BOOK_TWO_WEEK_MEALS) {
      expect(day.day).toBeGreaterThanOrEqual(1)
      expect(day.day).toBeLessThanOrEqual(7)
      expect(day.breakfast).toBeTruthy()
      expect(day.lunch).toBeTruthy()
      expect(day.dinner).toBeTruthy()
      expect(day.snack).toBeTruthy()
      expect(day.lunchPdfPage).toBeGreaterThanOrEqual(215)
      expect(day.dinnerPdfPage).toBeLessThanOrEqual(242)
      expect('caloriesKcal' in day).toBe(false)
      expect('instructions' in day).toBe(false)
    }
  })
  it('bao phủ nguồn vi chất và toàn bộ mục lục sách', () => {
    expect(LONGO_BOOK_MICRONUTRIENTS.map(item => item.label)).toContain('Vitamin B12')
    expect(LONGO_BOOK_MICRONUTRIENTS.map(item => item.label)).toContain('Omega-3')
    expect(LONGO_BOOK_MICRONUTRIENTS).toHaveLength(10)
    expect(LONGO_BOOK_CHAPTERS).toHaveLength(14)
  })
})
