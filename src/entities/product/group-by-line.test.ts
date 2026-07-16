import { describe, it, expect } from 'vitest'
import type { ProductFamily } from '@/shared/types'
import { groupFamiliesByLine, getProductLineLabel } from '@/entities/product/group-by-line'

const family = (slug: string, name: string): ProductFamily => ({
  id: slug,
  slug,
  name,
  categoryId: '1255',
  categoryName: 'Плитка ПВХ',
  variants: [],
})

describe('groupFamiliesByLine', () => {
  it('groups sensor families together', () => {
    const groups = groupFamiliesByLine([
      family('sensor-tech', 'Sensor Tech'),
      family('sensor-avers', 'Sensor Avers'),
      family('aqua', 'Aqua'),
    ])
    const sensor = groups.find((g) => g.label === 'Sensor')
    const aqua = groups.find((g) => g.label === 'Aqua')
    expect(sensor?.families).toHaveLength(2)
    expect(aqua?.families).toHaveLength(1)
  })

  it('detects factor line', () => {
    expect(getProductLineLabel(family('factor-sport', 'Factor Sport'))).toBe('Factor')
  })
})
