import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'

const batch = [
  { week: 1, day: 1, slot: 'breakfast', page: 215, facts: 4 },
  { week: 1, day: 1, slot: 'snack', page: 215, facts: 2 },
  { week: 1, day: 1, slot: 'dinner', page: 216, facts: 10 },
  { week: 1, day: 2, slot: 'breakfast', page: 217, facts: 2 },
  { week: 1, day: 2, slot: 'lunch', page: 217, facts: 7 },
  { week: 1, day: 2, slot: 'snack', page: 217, facts: 2 },
  { week: 1, day: 2, slot: 'dinner', page: 218, facts: 8 },
] as const

describe('Appendix A first two days: visual source-page audit, not medical certification', () => {
  it('records seven new page-crosschecked meals and still excludes unreviewed meals from certified status', () => {
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
    expect(appendix.metadata.editorialBatch20261115).toMatchObject({
      newlyCheckedMeals: 7,
      correctedLabels: 12,
      pdfPages: [215, 216, 217, 218],
      status: 'source-page-crosschecked-not-clinically-approved',
    })
    expect(appendix.metadata.reviewedMeals).toBeGreaterThanOrEqual(9)
    expect(appendix.metadata.reviewedQuantities).toBeGreaterThanOrEqual(55)
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review').length).toBeLessThanOrEqual(47)
    for (const row of batch) {
      const meal = appendix.meals.find(m => m.week === row.week && m.day === row.day && m.slot === row.slot)
      expect(meal).toBeDefined()
      expect(meal!.verificationStatus).toBe('source-page-checked')
      expect(meal!.sourcePages).toEqual([row.page])
      expect(meal!.facts).toHaveLength(row.facts)
      expect(meal!.facts.every(f => f.pdfPage === row.page)).toBe(true)
      expect(meal).toHaveProperty('sourceReview.noteVi')
      expect(meal).toHaveProperty('sourceReview.method')
    }
  })

  it('corrects source identity of blueberry jam, not honey, without changing any numeric PDF token', () => {
    const breakfast = appendix.meals.find(m => m.week === 1 && m.day === 1 && m.slot === 'breakfast')!
    expect(breakfast.facts[2]).toMatchObject({ amount: '20', unit: 'g', labelVi: 'Mứt việt quất không thêm đường' })
    expect(breakfast.facts[3]).toMatchObject({ amount: '1', unit: 'tbsp', labelVi: 'Mứt việt quất không thêm đường' })
    expect(breakfast.titleVi).toContain('mứt việt quất')
    const snack = appendix.meals.find(m => m.week === 1 && m.day === 1 && m.slot === 'snack')!
    expect(snack.facts[1]).toMatchObject({ amount: '8', unit: 'g', factType: 'composition-limit', comparison: 'less-than' })
    expect(appendix.metadata.sourceTokenAudit.matchedQuantityTokens).toBe(350)
  })
})
