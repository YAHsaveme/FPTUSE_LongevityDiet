import { describe, expect, it } from 'vitest'
import quantityInventory from './bookAppendixQuantities.json'
import {
  LONGO_BOOK, LONGO_BOOK_CHAPTERS, LONGO_BOOK_MICRONUTRIENTS,
  LONGO_BOOK_RULES, LONGO_BOOK_TWO_WEEK_MEALS,
} from './bookReferenceData'

describe('Nguồn chuẩn theo sách Valter Longo 2018', () => {
  it('tách đủ 56 bữa / 14 ngày, gắn nguồn từng dữ kiện định lượng mà không công bố đã xác minh', () => {
    expect(quantityInventory.metadata.status).toBe('unverified-machine-extraction')
    expect(quantityInventory.meals).toHaveLength(56)
    const reviewed = quantityInventory.meals.filter(m => m.verificationStatus === 'source-page-checked')
    expect(reviewed).toHaveLength(9)
    expect(reviewed.flatMap(m => m.facts)).toHaveLength(55)
    expect(quantityInventory.meals.filter(m => m.verificationStatus === 'needs-human-review'))
      .toHaveLength(47)
    const dinner = reviewed.find(m => m.week === 2 && m.day === 4 && m.slot === 'dinner')
    expect(dinner).toBeDefined()
    expect(dinner!.facts[2]).toMatchObject({ labelVi: 'cà chua bi', amount: '150', unit: 'g' })
    expect(dinner!.facts[3]).toMatchObject({ labelVi: 'tôm', amount: '60', unit: 'g' })
    expect(quantityInventory.meals.reduce((total, meal) => total + meal.facts.length, 0))
      .toBe(350)
    for (const week of [1, 2]) {
      for (let day = 1; day <= 7; day++) {
        const slots = quantityInventory.meals.filter(meal => meal.week === week && meal.day === day)
        expect(slots.map(meal => meal.slot).sort()).toEqual(
          ['breakfast', 'dinner', 'lunch', 'snack'])
        for (const meal of slots) {
          expect(meal.sourcePages.every(page => page >= 215 && page <= 242)).toBe(true)
          expect(meal.facts.every(fact => fact.pdfPage >= 215 && fact.pdfPage <= 242)).toBe(true)
          expect(meal.facts.every(fact => fact.amount && fact.unit)).toBe(true)
        }
      }
    }
  })

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
