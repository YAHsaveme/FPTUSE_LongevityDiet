import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const slots = [
  { week: 1, day: 7, slot: 'breakfast', pages: [227], facts: 3 },
  { week: 1, day: 7, slot: 'lunch', pages: [227], facts: 10 },
  { week: 1, day: 7, slot: 'snack', pages: [227, 228], facts: 2 },
  { week: 1, day: 7, slot: 'dinner', pages: [228], facts: 8 },
  { week: 2, day: 1, slot: 'breakfast', pages: [229], facts: 3 },
  { week: 2, day: 1, slot: 'lunch', pages: [229], facts: 8 },
  { week: 2, day: 1, slot: 'snack', pages: [229], facts: 2 },
  { week: 2, day: 1, slot: 'dinner', pages: [230], facts: 8 },
] as const
const meal = (w: number, d: number, s: string) =>
  appendix.meals.find(m => m.week === w && m.day === d && m.slot === s)!

describe('Week transition W1D7/W2D1 PDF-source audit, reference only', () => {
  it('records eight source-page comparisons while keeping the rest unapproved', () => {
    expect(appendix.metadata.editorialBatchWeekTurn).toMatchObject({
      status: 'source-page-crosschecked-not-clinically-approved',
      pdfPages: [227, 228, 229, 230],
      newlyCheckedMeals: 8,
      correctedLabels: 28,
    })
    expect(appendix.metadata.reviewedMeals).toBe(33)
    expect(appendix.metadata.reviewedQuantities).toBe(205)
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review')).toHaveLength(23)
    for (const x of slots) {
      const m = meal(x.week, x.day, x.slot)
      expect(m.verificationStatus).toBe('source-page-checked')
      expect(m.sourcePages).toEqual(x.pages)
      expect(m.facts).toHaveLength(x.facts)
      expect(m).toHaveProperty('sourceReview.method')
      expect(m).toHaveProperty('sourceReview.noteVi')
    }
  })
  it('keeps clams and mussels at 60 g TOTAL and wine as cooking ingredient', () => {
    const dinner = meal(1, 7, 'dinner')
    expect(dinner.facts[0]).toMatchObject({ amount: '60', unit: 'g', factType: 'composite' })
    expect(dinner.facts[0].labelVi).toContain('tổng cộng')
    expect(dinner.facts[2].labelVi).toContain('nấu ăn')
    expect(dinner.sourceReview?.noteVi).toContain('không phải mỗi loại 60 g')
  })
  it('distinguishes goat dairy from milk-free snack-bar criteria', () => {
    const snack = meal(1, 7, 'snack')
    expect(snack.facts[0].labelVi).toContain('sữa động vật')
    expect(snack.facts[1]).toMatchObject({
      amount: '8', unit: 'g', factType: 'composition-limit', comparison: 'less-than',
    })
  })
  it('preserves source gaps: unweighted chocolate/nuts and bread vs raw flour', () => {
    const breakfast = meal(2, 1, 'breakfast')
    expect(breakfast.facts).toHaveLength(3)
    expect(breakfast.sourceReview?.noteVi).toContain('KHÔNG GHI gram')
    const dinner = meal(2, 1, 'dinner')
    expect(dinner.facts[5]).toMatchObject({ amount: '60', unit: 'g' })
    expect(dinner.facts[5].labelVi).toContain('không phải khối lượng bột')
    expect(meal(1, 7, 'lunch').facts[3]).toMatchObject({ amount: '1', unit: 'tsp' })
  })
})
