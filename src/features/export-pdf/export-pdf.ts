import { jsPDF } from 'jspdf'
import type { CalculationResult, ProductVariant, RoomState } from '@/shared/types'
import { formatArea, formatLength } from '@/shared/geometry/polygon'
import { totalOpeningsLengthMm } from '@/shared/geometry/obstacles'
import { resolvePublicUrl } from '@/shared/lib/urls'

export type PdfExportInput = {
  variant: ProductVariant
  room: RoomState
  calculation: CalculationResult
  canvasDataUrl?: string
  projectName: string
}

let fontReady: Promise<string | null> | null = null

async function loadCyrillicFontBase64(): Promise<string | null> {
  if (!fontReady) {
    fontReady = (async () => {
      try {
        const url = resolvePublicUrl('/fonts/NotoSans-Regular.ttf')
        const res = await fetch(url)
        if (!res.ok) return null
        const buffer = await res.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        const parts: string[] = []
        const chunk = 0x2000
        for (let i = 0; i < bytes.length; i += chunk) {
          const slice = bytes.subarray(i, i + chunk)
          parts.push(String.fromCharCode.apply(null, Array.from(slice)))
        }
        return btoa(parts.join(''))
      } catch {
        return null
      }
    })()
  }
  return fontReady
}

function addWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[]
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

export async function exportToPdf(input: PdfExportInput): Promise<void> {
  const { variant, room, calculation, canvasDataUrl, projectName } = input
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const date = new Date().toLocaleDateString('ru-RU')
  let y = 16

  const fontData = await loadCyrillicFontBase64()
  if (fontData) {
    doc.addFileToVFS('NotoSans-Regular.ttf', fontData)
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal')
    doc.setFont('NotoSans', 'normal')
  } else {
    doc.setFont('helvetica', 'normal')
  }

  const ensureSpace = (need: number) => {
    if (y + need > 280) {
      doc.addPage()
      if (fontData) doc.setFont('NotoSans', 'normal')
      y = 16
    }
  }

  const line = (text: string, size = 11) => {
    ensureSpace(8)
    doc.setFontSize(size)
    y = addWrapped(doc, text, 15, y, 180, size * 0.45)
    y += 2
  }

  doc.setFontSize(16)
  line('ПластФактор — расчёт покрытия', 16)
  line(`Дата: ${date}`)
  line(`Проект: ${projectName}`)
  y += 2

  line('Товар', 13)
  line(`Название: ${variant.name}`)
  line(`ID: ${variant.sourceId}`)
  if (variant.colorName) line(`Цвет: ${variant.colorName}`)
  if (variant.thicknessMm) line(`Толщина: ${variant.thicknessMm} мм`)
  if (variant.lengthMm && variant.widthMm) {
    line(`Размер модуля: ${variant.lengthMm}×${variant.widthMm} мм`)
  }
  y += 2

  line('Помещение', 13)
  line(`Форма: ${room.shapeType === 'rectangle' ? 'прямоугольник' : 'многоугольник'}`)
  line(`Зазор от стен: ${room.gapMm} мм`)
  line(`Площадь помещения: ${formatArea(calculation.roomAreaSqm)}`)
  line(`Площадь укладки: ${formatArea(calculation.workingAreaSqm)}`)
  if (calculation.obstaclesAreaSqm > 0) {
    line(`Площадь препятствий: ${formatArea(calculation.obstaclesAreaSqm)}`)
  }
  const openingsLen =
    calculation.openingsLengthMm || totalOpeningsLengthMm(room.openings ?? [])
  if (openingsLen > 0) {
    line(`Открытые края (проёмы): ${formatLength(openingsLen, 'mm')}`)
  }
  const obstacles = room.obstacles ?? []
  if (obstacles.length > 0) {
    line(`Препятствий: ${obstacles.length}`)
    for (const obs of obstacles) {
      line(
        `• ${Math.round(obs.widthMm)}×${Math.round(obs.lengthMm)} мм @ (${Math.round(obs.x)}; ${Math.round(obs.y)})`,
      )
    }
  }
  y += 2

  line('Результат', 13)
  line(`Целых модулей: ${calculation.fullModulesCount}`)
  line(`Подрезок на схеме: ${calculation.cutModulesCount}`)
  line(`Плиток на подрезку: ${calculation.cutSourceModulesCount}`)
  line(`К заказу без запаса: ${calculation.modulesToPurchase}`)
  line(`Запас: ${calculation.wastePercent}%`)
  line(`Итого к покупке: ${calculation.modulesWithWasteCount} плиток`)
  line(`Площадь покупки: ${formatArea(calculation.purchaseAreaSqm)}`)
  if (calculation.totalCost !== undefined) {
    line(`Стоимость: ${calculation.totalCost.toLocaleString('ru-RU')} ₽`)
  }
  if (calculation.totalWeightKg !== undefined) {
    line(`Вес: ${calculation.totalWeightKg.toFixed(1)} кг`)
  }

  if (calculation.warnings.length) {
    y += 2
    line('Предупреждения', 13)
    for (const w of calculation.warnings) {
      line(`• ${w.message}`)
    }
  }

  if (canvasDataUrl) {
    try {
      ensureSpace(110)
      const imgW = 180
      const imgH = 100
      // сохраняем пропорции по большей стороне бокса
      const props = doc.getImageProperties(canvasDataUrl)
      const ratio = props.width / props.height
      let drawW = imgW
      let drawH = imgW / ratio
      if (drawH > imgH) {
        drawH = imgH
        drawW = imgH * ratio
      }
      doc.addImage(canvasDataUrl, 'PNG', 15, y, drawW, drawH)
      y += drawH + 8
    } catch {
      // skip image
    }
  }

  ensureSpace(20)
  doc.setFontSize(9)
  y = addWrapped(
    doc,
    'Расчёт является предварительным и требует проверки перед оформлением заказа. ПластФактор.',
    15,
    y,
    180,
    4,
  )

  doc.save(`plastfactor-${date.replace(/\./g, '-')}.pdf`)
}
