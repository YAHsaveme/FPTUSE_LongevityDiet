import { describe, expect, it } from 'vitest'
import { displayAllergens, parseAllergenInput } from './allergenNames'

describe('Chuẩn hóa dị ứng tiếng Việt nhưng giữ mã an toàn cho API', () => {
  it.each([
    ['đậu phộng, tôm, sữa', ['peanut', 'shellfish', 'milk']],
    ['Lạc; đậu nành; Mè', ['peanut', 'soy', 'sesame']],
    ['peanut, shellfish, soy', ['peanut', 'shellfish', 'soy']],
    ['Cá, trứng, lúa mì, các loại hạt cây', ['fish', 'egg', 'wheat', 'tree-nut']],
  ])('nhận diện các từ đồng nghĩa: %s', (input, codes) => {
    expect(parseAllergenInput(input)).toEqual({ codes, unknown: [] })
  })

  it('đọc lại chính xác từ mã chuẩn sang tên tiếng Việt và ngược lại', () => {
    const original = ['peanut', 'shellfish', 'milk', 'egg', 'soy', 'wheat', 'tree-nut', 'sesame']
    expect(parseAllergenInput(displayAllergens(original))).toEqual({ codes: original, unknown: [] })
  })

  it('không bỏ qua âm thầm dị ứng chưa nhận diện được', () => {
    expect(parseAllergenInput('đậu phộng, hạt bí')).toEqual({
      codes: ['peanut'], unknown: ['hạt bí'],
    })
  })

  it('loại trùng khi dùng cả tiếng Anh và tiếng Việt', () => {
    expect(parseAllergenInput('peanut, lạc, Đậu phộng')).toEqual({
      codes: ['peanut'], unknown: [],
    })
  })
})
