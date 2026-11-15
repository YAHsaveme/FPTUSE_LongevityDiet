import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const verified = [
  { day: 5, slot: 'breakfast', pages: [223], facts: 6 },
  { day: 5, slot: 'lunch', pages: [223], facts: 9 },
  { day: 5, slot: 'snack', pages: [223, 224], facts: 2 },
  { day: 5, slot: 'dinner', pages: [224], facts: 11 },
  { day: 6, slot: 'breakfast', pages: [225], facts: 1 },
  { day: 6, slot: 'lunch', pages: [225], facts: 6 },
  { day: 6, slot: 'snack', pages: [225], facts: 2 },
  { day: 6, slot: 'dinner', pages: [225, 226], facts: 15 },
] as const

const meal = (day: number, slot: string) =>
  appendix.meals.find(m => m.week === 1 && m.day === day && m.slot === slot)!

describe('Appendix A W1D5-D6 source identity is not clinical nutrition approval', () => {
  it('tracks eight new PDF-page crosschecks and preserves 31 not-yet-reviewed meals', () => {
    expect(appendix.metadata.editorialBatchDay56).toMatchObject({
      status: 'source-page-crosschecked-not-clinically-approved',
      newlyCheckedMeals: 8,
      correctedLabels: 24,
      pdfPages: [223, 224, 225, 226],
    })
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.metadata.reviewedMeals).toBe(25)
    expect(appendix.metadata.reviewedQuantities).toBe(161)
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review')).toHaveLength(31)
    for (const x of verified) {
      const found = meal(x.day, x.slot)
      expect(found.verificationStatus).toBe('source-page-checked')
      expect(found.sourcePages).toEqual(x.pages)
      expect(found.facts).toHaveLength(x.facts)
      expect(found).toHaveProperty('sourceReview.noteVi')
      expect(found).toHaveProperty('sourceReview.method')
    }
  })

  it('does not double-count 90g oats and never confuses real honey with earlier jam', () => {
    const breakfast = meal(5, 'breakfast')
    expect(breakfast.facts[0]).toMatchObject({ amount: '90', unit: 'g' })
    expect(breakfast.facts[1]).toMatchObject({ amount: '90', unit: 'g', factType: 'source-duplicate' })
    expect(breakfast.facts[3].labelVi).toContain('mật ong')
    expect(breakfast.sourceReview?.noteVi).toContain('KHÔNG cộng thành 180 g')
  })

  it('treats 60 g focaccia plus oil as a composite, never as 60g oil', () => {
    const breakfast = meal(6, 'breakfast')
    expect(breakfast.facts).toHaveLength(1)
    expect(breakfast.facts[0]).toMatchObject({ amount: '60', unit: 'g', factType: 'composite' })
    expect(breakfast.facts[0].labelVi).toContain('món kết hợp')
  })

  it('preserves optional dessert and sugar composition instead of treating them as extra portions', () => {
    const dessert = meal(5, 'dinner')
    expect(dessert.facts[8]).toHaveProperty('factType', 'alternative')
    expect(dessert.facts[9]).toHaveProperty('factType', 'alternative')
    expect(dessert.facts[10].labelVi).toContain('lựa chọn')
    const bar = meal(6, 'snack')
    expect(bar.facts[1]).toMatchObject({ amount: '8', unit: 'g', factType: 'composition-limit', comparison: 'less-than' })
    const navy = meal(6, 'dinner')
    expect(navy.facts[0].labelVi).toContain('để ráo')
    expect(navy.facts[13].labelVi).toContain('tráng miệng gợi ý')
  })
})
