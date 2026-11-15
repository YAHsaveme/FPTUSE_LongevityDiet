import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const newSlots = [
  { day: 3, slot: 'breakfast', pages: [219], facts: 3 },
  { day: 3, slot: 'lunch', pages: [219], facts: 8 },
  { day: 3, slot: 'snack', pages: [219, 220], facts: 5 },
  { day: 3, slot: 'dinner', pages: [220], facts: 10 },
  { day: 4, slot: 'breakfast', pages: [221], facts: 4 },
  { day: 4, slot: 'lunch', pages: [221], facts: 11 },
  { day: 4, slot: 'snack', pages: [221, 222], facts: 2 },
  { day: 4, slot: 'dinner', pages: [222], facts: 11 },
] as const

const slot = (day: number, meal: string) => appendix.meals.find(
  m => m.week === 1 && m.day === day && m.slot === meal,
)!

describe('Appendix A W1 D3-D4 visual source-page audit, not clinical sign-off', () => {
  it('reports exactly eight additional source-checked slots without promoting other data', () => {
    expect(appendix.metadata.editorialBatchDay34).toMatchObject({
      status: 'source-page-crosschecked-not-clinically-approved',
      pdfPages: [219, 220, 221, 222],
      newlyCheckedMeals: 8,
      correctedLabels: 19,
    })
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.metadata.reviewedMeals).toBe(17)
    expect(appendix.metadata.reviewedQuantities).toBe(109)
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review')).toHaveLength(39)
    for (const x of newSlots) {
      const m = slot(x.day, x.slot)
      expect(m.verificationStatus).toBe('source-page-checked')
      expect(m.sourcePages).toEqual(x.pages)
      expect(m.facts).toHaveLength(x.facts)
      expect(m).toHaveProperty('sourceReview.method')
      expect(m).toHaveProperty('sourceReview.noteVi')
    }
    expect(appendix.metadata.sourceTokenAudit.matchedQuantityTokens).toBe(350)
  })
  it('does not confuse jam with honey or sum alternative snack options or farinata batch', () => {
    expect(slot(3, 'breakfast').facts[1]).toMatchObject({
      amount: '40', unit: 'g', labelVi: 'Mứt quả mọng hỗn hợp không thêm đường',
    })
    expect(slot(3, 'breakfast').facts[2]).toMatchObject({
      amount: '2', unit: 'tsp', labelVi: 'Mứt quả mọng hỗn hợp không thêm đường',
    })
    const snack = slot(3, 'snack')
    expect(snack.facts[0]).toHaveProperty('factType', 'alternative')
    expect(snack.facts[1]).toHaveProperty('factType', 'alternative')
    expect(snack.facts[2]).toHaveProperty('factType', 'recipe-batch')
    expect(snack.facts[3]).toHaveProperty('factType', 'recipe-batch')
    expect(snack.facts[4]).toHaveProperty('factType', 'recipe-batch')
    expect(snack).toHaveProperty('sourceReview.noteVi')
    expect(slot(4, 'breakfast').facts[2]).toHaveProperty('labelVi', 'Mứt mơ không thêm đường')
    expect(slot(4, 'breakfast').facts[3]).toHaveProperty('labelVi', 'Mứt mơ không thêm đường')
  })
  it('keeps context markers for prepared weight and side/dessert alternatives', () => {
    expect(slot(3, 'dinner').facts[1].labelVi).toContain('khối lượng ướt')
    expect(slot(4, 'dinner').facts[0].labelVi).toContain('để ráo')
    const day4snack = slot(4, 'snack').facts[1] as { factType?: string; comparison?: string }
    expect(day4snack.factType).toBe('composition-limit')
    expect(day4snack.comparison).toBe('less-than')
  })
})
