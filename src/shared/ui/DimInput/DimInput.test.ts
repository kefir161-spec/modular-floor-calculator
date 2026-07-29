import { describe, it, expect } from 'vitest'
import { formatDimDraft, parseDimInput } from '@/shared/ui/DimInput/DimInput'

describe('parseDimInput', () => {
  it('принимает 0.5 и .5 в метрах', () => {
    expect(parseDimInput('0.5', 'm')).toBe(500)
    expect(parseDimInput('.5', 'm')).toBe(500)
    expect(parseDimInput('0,5', 'm')).toBe(500)
  })

  it('принимает целые мм', () => {
    expect(parseDimInput('10', 'mm')).toBe(10)
    expect(parseDimInput('3500', 'mm')).toBe(3500)
  })

  it('отклоняет пустое и мусор', () => {
    expect(parseDimInput('', 'm')).toBeNull()
    expect(parseDimInput('.', 'm')).toBeNull()
    expect(parseDimInput('abc', 'mm')).toBeNull()
    expect(parseDimInput('0', 'm')).toBeNull()
  })

  it('принимает 0 при allowZero', () => {
    expect(parseDimInput('0', 'mm', { allowZero: true })).toBe(0)
    expect(parseDimInput('0', 'm', { allowZero: true })).toBe(0)
  })
})

describe('formatDimDraft', () => {
  it('не отдаёт длинный float', () => {
    expect(formatDimDraft(7009.621585348925, 'm')).toBe('7.01')
    expect(formatDimDraft(7009.621585348925, 'mm')).toBe('7010')
  })
})
