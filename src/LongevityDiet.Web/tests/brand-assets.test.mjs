import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')

test('LongevityDiet declares its own first-party favicon', () => {
  const html = read('../index.html')
  const favicon = read('../public/longevity-favicon.svg')

  assert.match(html, /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="\/longevity-favicon\.svg\?v=1"/)
  assert.match(html, /<meta name="application-name" content="LongevityDiet"/)
  assert.match(favicon, /<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.match(favicon, /LongevityDiet/)
  assert.match(favicon, /#25805c/)
  assert.doesNotMatch(html + favicon, /livento/i)
})
