import type { ProductFamily } from '@/shared/types'

const LINE_RULES: { prefix: string; label: string }[] = [
  { prefix: 'sensor', label: 'Sensor' },
  { prefix: 'aqua', label: 'Aqua' },
  { prefix: 'factor', label: 'Factor' },
  { prefix: 'optima', label: 'Optima' },
  { prefix: 'veropol', label: 'Veropol' },
  { prefix: 'city', label: 'City' },
  { prefix: 'klever', label: 'Klever' },
  { prefix: 'canal', label: 'Canal' },
  { prefix: 'broneplast', label: 'Broneplast' },
]

export type ProductLineGroup = {
  id: string
  label: string
  families: ProductFamily[]
}

export function getProductLineLabel(family: ProductFamily): string {
  const slug = family.slug.toLowerCase()
  for (const rule of LINE_RULES) {
    if (slug.startsWith(rule.prefix)) return rule.label
  }
  const fromName = family.name.split(/[,\s]/)[0]?.trim()
  return fromName || family.slug
}

export function groupFamiliesByLine(families: ProductFamily[]): ProductLineGroup[] {
  const map = new Map<string, ProductFamily[]>()

  for (const family of families) {
    const label = getProductLineLabel(family)
    const list = map.get(label) ?? []
    list.push(family)
    map.set(label, list)
  }

  const order = [...LINE_RULES.map((r) => r.label), 'Прочие']
  const groups: ProductLineGroup[] = []

  for (const label of order) {
    const list = map.get(label)
    if (!list?.length) continue
    groups.push({
      id: label.toLowerCase().replace(/\./g, '-'),
      label,
      families: list.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    })
    map.delete(label)
  }

  for (const [label, list] of map) {
    groups.push({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      families: list.sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    })
  }

  return groups
}

export function getFamilyDisplayName(family: ProductFamily): string {
  const line = getProductLineLabel(family)
  const raw = family.name
    .replace(/^Плитка ПВХ\s*/i, '')
    .replace(/,?\s*Пластфактор$/i, '')
    .trim()

  if (raw.toLowerCase().startsWith(line.toLowerCase())) {
    return raw
  }
  return raw || family.name
}
