/// <reference types="node" />
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import appendix from './bookAppendixQuantities.json'
import { LONGO_BOOK } from './bookReferenceData'

// Independent text-layer extraction of Appendix A from the user-supplied PDF:
// 306 pages; SHA256 c4e762039b877d185ae1f44035cace4ba95f1791adbafb8097a0764dd26757d6.
// Each digest is SHA256(JSON.stringify([[PDF page, amount, unit], ...])).slice(0, 22).
// These are source-token integrity witnesses, NOT editorial or clinical approval.
const digestRows = [
  '1-1-breakfast:16df0fe569018632f7a9a5', '1-1-lunch:b005d06fb588be1f33cacb',
  '1-1-snack:d5e616e9e6b44b8c031b37', '1-1-dinner:783411dbff3cb72d90730e',
  '1-2-breakfast:1f87bfaf76cfd4fe46fb1f', '1-2-lunch:637a8f96f45adb71da2673',
  '1-2-snack:d5261eba26413e7eca8274', '1-2-dinner:dc1846fb3d29119b0249b8',
  '1-3-breakfast:7056007cdd4e0d281d1cce', '1-3-lunch:461a29301f1f2f0c5efadc',
  '1-3-snack:868ed965a086bbdc7f9ce1', '1-3-dinner:b2cd443386b83cda5be65c',
  '1-4-breakfast:f47d70a44e776d38d26d99', '1-4-lunch:ce38a118713ee5096328f5',
  '1-4-snack:d7007a2da3571d50ba64bf', '1-4-dinner:6f40933a896974147af3de',
  '1-5-breakfast:76e1b3f936988e5b807d5e', '1-5-lunch:8926c06c98f9505ff2c154',
  '1-5-snack:ec38bfb6a374eb041f4c71', '1-5-dinner:0f6b7e402e6d80d2e84c5e',
  '1-6-breakfast:627707b43320ad79439b0e', '1-6-lunch:c198895288156abbee27ca',
  '1-6-snack:7b7fa3c1be6e815a028de4', '1-6-dinner:867d4c5ecb55706acb11ef',
  '1-7-breakfast:fd0d062d8784438ea2690c', '1-7-lunch:b611aca5e090e0e3e82e9a',
  '1-7-snack:6fff5d0d07ba8206995153', '1-7-dinner:3c154b9573b2dd5f075c3a',
  '2-1-breakfast:8d31995eb9b5c2d7635d87', '2-1-lunch:6565dab513a9d50ddd9fad',
  '2-1-snack:846821398080f99f8f14f2', '2-1-dinner:663c1aa47f5aa09a76d444',
  '2-2-breakfast:4d6142c5f06fb44e4b6c59', '2-2-lunch:3549ccdd39f80135aeddd2',
  '2-2-snack:d2b8fbb7ec0cd9e1419da2', '2-2-dinner:e479a753ce20ef9f34c265',
  '2-3-breakfast:13ed650d928f2d55638a31', '2-3-lunch:f9d19f2d6bd73f1c5d3fcb',
  '2-3-snack:cf78b7edcfc6f4bf236654', '2-3-dinner:83f16ec28dbf0c59b52762',
  '2-4-breakfast:f10aafda65d95d8cfeed4a', '2-4-lunch:4d8d504d12d15afcb9616d',
  '2-4-snack:0b657d44c67bac7c3e2e0b', '2-4-dinner:9cfa2495a10bc8d565d5bb',
  '2-5-breakfast:73058fa5b0db07c0481dcc', '2-5-lunch:c91ffb8bb0788cbc41b9a8',
  '2-5-snack:6da7d7a51a2e24eb948891', '2-5-dinner:8317d9a33f1d3f6aec9a40',
  '2-6-breakfast:183ebcc4c63ad81ba9938f', '2-6-lunch:f59d47d1a5b7eb9b53548f',
  '2-6-snack:ec0c6ec72817d43e5a1c5c', '2-6-dinner:c48c89c1bd9a125c0f0c24',
  '2-7-breakfast:7a11456568b13112c2f02b', '2-7-lunch:7e4f063745ae34b85e9641',
  '2-7-snack:504d07c1414bf3ece179d6', '2-7-dinner:d01d980e4c800735cf27d1',
]
const sourceDigests = Object.fromEntries(digestRows.map(row => row.split(':')))

describe('independent Appendix A PDF token audit (nonclinical)', () => {
  it('matches all 56 ordered meal token sequences against PDF-derived signatures', () => {
    expect(LONGO_BOOK.sha256).toBe(appendix.metadata.sourceTokenAudit.sourcePdfSha256)
    expect(Object.keys(sourceDigests)).toHaveLength(56)
    expect(appendix.metadata.sourceTokenAudit.matchedQuantityTokens).toBe(350)
    for (const meal of appendix.meals) {
      const key = meal.week + '-' + meal.day + '-' + meal.slot
      const digest = createHash('sha256')
        .update(JSON.stringify(meal.facts.map(f => [f.pdfPage, f.amount, f.unit])))
        .digest('hex').slice(0, 22)
      expect(digest, 'Source token drift in ' + key).toBe(sourceDigests[key])
    }
  })

  it('keeps 13 sugar ceilings distinct from food amounts, without upgrading review flags', () => {
    expect(appendix.meals.flatMap(m => m.facts).every(f => !!f.labelVi?.trim())).toBe(true)
    const sugarLimits = appendix.meals.flatMap(m => m.facts)
      .filter(f => 'factType' in f && f.factType === 'composition-limit')
    expect(sugarLimits).toHaveLength(13)
    expect(sugarLimits.every(f => f.amount === '8' && f.unit === 'g'
      && 'comparison' in f && f.comparison === 'less-than')).toBe(true)
    expect(appendix.meals.filter(m => m.verificationStatus === 'source-page-checked')).toHaveLength(2)
    expect(appendix.meals.filter(m => m.verificationStatus === 'needs-human-review')).toHaveLength(54)
    expect(appendix.metadata.status).toBe('unverified-machine-extraction')
  })
})
