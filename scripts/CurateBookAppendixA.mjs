// Read-only book provenance curation from user-supplied Valter Longo 2018 PDF.
// This script checks two samples against the source-page text, not all 56 meals.
// Do NOT upgrade another meal without independent page verification.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const file = resolve(root, 'src/LongevityDiet.Web/src/features/book/bookAppendixQuantities.json')
const data = JSON.parse(readFileSync(file, 'utf8'))
if (data.metadata?.bookId !== 'longo-2018-the-longevity-diet') {
  throw new Error('Book fingerprint differs; review this script against the correct edition')
}
const verifiedMeals = [
  {
    week: 1, day: 1, slot: 'lunch', page: 215,
    labels: [
      'rau bina', 'hạt thông', 'hạt thông', 'nho khô',
      'nho khô', 'dầu ô-liu', 'dầu ô-liu', 'bánh cracker lúa mì spelt ăn kèm',
    ],
    values: ['150 g', '9 g', '1 tbsp', '9 g', '1 tbsp', '12 mL', '1 tbsp', '40 g'],
  },
  {
    week: 2, day: 4, slot: 'dinner', page: 236,
    labels: [
      'gạo đen (gạo Venus)', 'bí ngòi', 'cà chua bi', 'tôm',
      'phô mai Parmesan', 'phô mai Parmesan', 'nhụy hoa nghệ tây',
      'dầu ô-liu', 'dầu ô-liu', 'rau trộn ăn kèm',
      'nam việt quất sấy gợi ý tráng miệng', 'hạt óc chó gợi ý tráng miệng',
    ],
    values: ['40 g', '250 g', '150 g', '60 g', '5 g', '1 tbsp', '4 g',
      '25 mL', '2 tbsp', '200 g', '20 g', '25 g'],
  },
]
for (const meal of data.meals) {
  meal.verificationStatus = 'needs-human-review'
  delete meal.verificationPage
}
for (const checked of verifiedMeals) {
  const match = data.meals.find(meal =>
    meal.week === checked.week && meal.day === checked.day && meal.slot === checked.slot)
  if (!match || match.facts.length !== checked.values.length ||
      match.sourcePages.some(page => page !== checked.page)) {
    throw new Error('Cannot verify changed meal/page: '+JSON.stringify(checked))
  }
  for (let i = 0; i < match.facts.length; i++) {
    const fact = match.facts[i]
    if (`${fact.amount} ${fact.unit}` !== checked.values[i] ||
      fact.pdfPage !== checked.page) {
      throw new Error('Source amount/unit mismatch on page '+checked.page+' fact '+i)
    }
    fact.labelVi = checked.labels[i]
  }
  match.verificationStatus = 'source-page-checked'
  match.verificationPage = checked.page
}
data.metadata.reviewedMeals = verifiedMeals.length
data.metadata.reviewedQuantities = verifiedMeals.reduce((n, m) => n + m.values.length, 0)
data.metadata.reviewMethod = 'Manual verification against the supplied PDF parsed page text; no clinical review'
data.metadata.reviewDate = '2026-11-14'
writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log(`Checked ${data.metadata.reviewedMeals} meals and ${data.metadata.reviewedQuantities} quantities; remaining meals not verified.`)
