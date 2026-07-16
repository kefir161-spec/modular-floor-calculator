import { describe, it, expect } from 'vitest'
import {
  extractFamilySlug,
  parseDimensionsCm,
  parseDimensionsFromParam,
} from '@/shared/api/catalog/normalize'

describe('catalog normalize', () => {
  it('extracts family slug from URL', () => {
    expect(
      extractFamilySlug('https://plastfactor.com/catalog/detail/factor/?oID=5200'),
    ).toBe('factor')
  })

  it('parses dimensions from cm', () => {
    const dims = parseDimensionsCm('37.5/37.5/0.6')
    expect(dims).toEqual({ lengthMm: 375, widthMm: 375, thicknessMm: 6 })
  })

  it('parses dimensions from param mm', () => {
    const dims = parseDimensionsFromParam('300x300', 'мм')
    expect(dims).toEqual({ lengthMm: 300, widthMm: 300, thicknessMm: undefined })
  })
})
