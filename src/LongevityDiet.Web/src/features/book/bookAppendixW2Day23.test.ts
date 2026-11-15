import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const slots = [
  { day: 2, slot: 'breakfast', pages: [231], facts: 4 },
  { day: 2, slot: 'lunch', pages: [231], facts: 7 },
  { day: 2, slot: 'snack', pages: [231, 232], facts: 4 },
  { day: 2, slot: 'dinner', pages: [232], facts: 11 },
  { day: 3, slot: 'breakfast', pages: [233], facts: 4 },
  { day: 3, slot: 'lunch', pages: [233], facts: 8 },
  { day: 3, slot: 'snack', pages: [233], facts: 2 },
  { day: 3, slot: 'dinner', pages: [234], facts: 11 },
] as const

const meal = (day: number, slot: string) =>
  appendix.meals.find(m => m.week === 2 && m.day === day && m.slot === slot)!

describe('W2D2–D3 source-page audit, reference data only', () => {
  it('records eight additional source-checked slots, not clinical certification', () => {
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.metadata.editorialBatchW2D2D3).toMatchObject({
      status: 'source-page-crosschecked-not-clinically-approved',
      newlyCheckedMeals: 8,
      correctedLabels: 34,
      pdfPages: [231, 232, 233, 234],
    })
    expect(appendix.metadata.reviewedMeals).toBe(41)
    expect(appendix.metadata.reviewedQuantities).toBe(256)
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review')).toHaveLength(15)
    for (const entry of slots) {
      const found = meal(entry.day, entry.slot)
      expect(found.sourcePages).toEqual(entry.pages)
      expect(found.facts).toHaveLength(entry.facts)
      expect(found.verificationStatus).toBe('source-page-checked')
      expect(found).toHaveProperty('sourceReview.noteVi')
    }
    expect(appendix.metadata.sourceTokenAudit.matchedQuantityTokens).toBe(350)
  })
  it('disambiguates strawberry and plum jam from real honey', () => {
    expect(meal(2, 'breakfast').facts[2].labelVi).toBe('Mứt dâu không thêm đường')
    expect(meal(2, 'breakfast').facts[3].labelVi).toBe('Mứt dâu không thêm đường')
    expect(meal(3, 'breakfast').facts[2].labelVi).toBe('Mứt mận không thêm đường')
    expect(meal(3, 'breakfast').facts[3].labelVi).toBe('Mứt mận không thêm đường')
  })
  it('keeps two toast slices as the bagel ALTERNATIVE, not two bagels', () => {
    const breakfast = meal(3, 'breakfast')
    expect(breakfast.facts[0]).toMatchObject({ amount: '2', unit: 'pieces' })
    expect(breakfast.facts[0].labelVi).toContain('Hai lát bánh mì nướng')
    expect(breakfast.sourceReview?.noteVi).toContain('không phải hai bagel')
  })
  it('does not add snack alternatives or turn composite focaccia into oil', () => {
    const snack = meal(2, 'snack')
    expect(snack.facts[0]).toHaveProperty('factType', 'alternative')
    expect(snack.facts[1]).toHaveProperty('factType', 'alternative')
    expect(snack.facts[2]).toHaveProperty('factType', 'alternative')
    expect(snack.facts[3]).toHaveProperty('factType', 'composition-limit')
    const dinner = meal(3, 'dinner')
    expect(dinner.facts[7]).toMatchObject({ amount: '40', unit: 'g', factType: 'composite' })
    expect(dinner.facts[7].labelVi).toContain('khối lượng món kết hợp')
  })
})
