import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const slot = (day: number, kind: string) => appendix.meals.find(
  m => m.week === 2 && m.day === day && m.slot === kind,
)!

describe('Appendix A first-pass source-page coverage, never clinical certification', () => {
  it('checks all 56 source slots and 350 extracted token mentions without claiming book-wide approval', () => {
    expect(appendix.meals).toHaveLength(56)
    expect(appendix.meals.every(m => m.verificationStatus === 'source-page-checked')).toBe(true)
    expect(appendix.metadata.reviewedMeals).toBe(56)
    expect(appendix.metadata.reviewedQuantities).toBe(350)
    expect(appendix.metadata.sourceTokenAudit.matchedQuantityTokens).toBe(350)
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.metadata.appendixASourcePageReview).toMatchObject({
      slotCount: 56,
      numericUnitMentions: 350,
      latestBatchSlots: 15,
      status: 'AI-assisted-source-page-crosscheck-complete-not-editorially-or-clinically-certified',
    })
    expect(appendix.meals.every(m => 'sourceReview' in m && !!m.sourceReview)).toBe(true)
  })
  it('preserves half a red onion and source olive-oil grams; does not silently change grams to mL', () => {
    expect(slot(6, 'lunch').facts[4]).toMatchObject({
      amount: '1/2', unit: 'medium', factType: 'fraction-correction',
    })
    expect(slot(6, 'lunch').facts[5]).toMatchObject({ amount: '12', unit: 'g' })
    expect(slot(5, 'lunch').facts[5]).toMatchObject({ amount: '12', unit: 'g' })
    expect(slot(7, 'dinner').facts[8]).toMatchObject({ amount: '25', unit: 'g' })
  })
  it('does not multiply fish portions, turn bell peppers into ground pepper, or add cheese', () => {
    const pizza = slot(7, 'dinner')
    expect(pizza.facts[1]).toMatchObject({ amount: '90', unit: 'g', factType: 'composite' })
    expect(pizza.facts[1].labelVi).toContain('TỔNG CỘNG')
    expect(pizza.facts[6].labelVi).toContain('Ớt chuông')
    expect(pizza.titleVi).toContain('không phô mai')
    expect(pizza.sourceReview?.noteVi).toContain('KHÔNG phải đơn dùng tự động')
  })
  it('preserves goat yogurt allergen and composite focaccia instead of inventing amounts', () => {
    expect(slot(4, 'snack').facts[0].labelVi).toContain('dị nguyên sữa')
    expect(slot(4, 'lunch').facts[7]).toMatchObject({ amount: '40', unit: 'g', factType: 'composite' })
    expect(slot(6, 'dinner').facts[6]).toMatchObject({ amount: '60', unit: 'g', factType: 'composite' })
    expect(slot(5, 'breakfast').facts[0].labelVi).toContain('thành phẩm')
  })
})
