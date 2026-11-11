import { expect, test } from '@playwright/test'

// Rendered browser layout checks catch clipped Vietnamese text and horizontal
// scrolling on both narrow and full-width screens.
const cases = [
  { label: '320px handset', width: 320, height: 740 },
  { label: '390px handset', width: 390, height: 844 },
  { label: '1365px desktop', width: 1365, height: 768 },
]

for (const viewport of cases) {
  for (const route of ['/', '/login', '/register']) {
    test(route + ' renders without clipping at ' + viewport.label, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(route)
      if (route === '/') {
        await expect(page.locator('.hero-copy h1')).toBeVisible()
      } else {
        await expect(page.locator('.auth-form')).toBeVisible()
      }

      const measurements = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth
        const rootScrollWidth = document.documentElement.scrollWidth
        const selectors = [
          '.hero-copy h1',
          '.auth-copy h1',
          '.form-heading h2',
          '.hero-description',
          '.auth-copy p',
          '.auth-form',
          '.field-control',
          '.topbar',
        ]
        const overflows = selectors.flatMap((selector) =>
          [...document.querySelectorAll<HTMLElement>(selector)].flatMap((node) => {
            const rect = node.getBoundingClientRect()
            const range = document.createRange()
            range.selectNodeContents(node)
            const rects = [...range.getClientRects()]
            const first = Math.min(rect.left, ...rects.map((item) => item.left))
            const last = Math.max(rect.right, ...rects.map((item) => item.right))
            return first < -2 || last > clientWidth + 2
              ? [{ selector, first, last, clientWidth }]
              : []
          }),
        )
        return {
          lang: document.documentElement.lang,
          clientWidth,
          rootScrollWidth,
          overflows,
          inputs: document.querySelectorAll('input').length,
          labels: document.querySelectorAll('label').length,
        }
      })

      expect(measurements.lang).toBe('vi')
      expect(measurements.rootScrollWidth).toBeLessThanOrEqual(measurements.clientWidth + 2)
      expect(measurements.overflows, JSON.stringify(measurements.overflows)).toEqual([])
      if (route !== '/') {
        expect(measurements.labels).toBeGreaterThanOrEqual(measurements.inputs)
      }
    })
  }
}
