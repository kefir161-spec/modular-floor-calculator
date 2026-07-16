import { XMLParser } from 'fast-xml-parser'
import { APP_CONFIG } from '@/shared/config'
import type { CatalogSource, RawCatalog } from './types'

export class XmlCatalogSource implements CatalogSource {
  constructor(private readonly url: string = APP_CONFIG.catalogUrl) {}

  async load(): Promise<RawCatalog> {
    const xmlText = await this.fetchXml()
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      isArray: (name) => ['category', 'offer', 'param'].includes(name),
    })
    return parser.parse(xmlText) as RawCatalog
  }

  private async fetchXml(): Promise<string> {
    const response = await fetch(this.url)
    if (!response.ok) {
      throw new Error(`Не удалось загрузить каталог: HTTP ${response.status}`)
    }
    return response.text()
  }
}

export function loadCatalogFromString(xmlText: string): RawCatalog {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['category', 'offer', 'param'].includes(name),
  })
  return parser.parse(xmlText) as RawCatalog
}
