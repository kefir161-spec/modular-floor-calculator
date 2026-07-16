import { jsPDF } from 'jspdf'
import type { CalculationResult, ProductVariant, RoomState } from '@/shared/types'
import { formatArea } from '@/shared/geometry/polygon'

export type PdfExportInput = {
  variant: ProductVariant
  room: RoomState
  calculation: CalculationResult
  canvasDataUrl?: string
  projectName: string
}

export async function exportToPdf(input: PdfExportInput): Promise<void> {
  const { variant, calculation, canvasDataUrl, projectName } = input
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const date = new Date().toLocaleDateString('ru-RU')
  let y = 15

  const addLine = (text: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(text, 15, y)
    y += 7
  }

  addLine('ПластФактор', true)
  addLine(`Дата: ${date}`)
  addLine(`Проект: ${projectName}`)
  y += 3
  addLine(`Товар: ${variant.name}`, true)
  addLine(`ID: ${variant.sourceId}`)
  if (variant.colorName) addLine(`Цвет: ${variant.colorName}`)
  if (variant.thicknessMm) addLine(`Толщина: ${variant.thicknessMm} мм`)
  if (variant.lengthMm && variant.widthMm) {
    addLine(`Размер модуля: ${variant.lengthMm}×${variant.widthMm} мм`)
  }
  y += 3
  addLine(`Площадь помещения: ${formatArea(calculation.roomAreaSqm)}`)
  addLine(`Рабочая площадь: ${formatArea(calculation.workingAreaSqm)}`)
  addLine(`Целых модулей: ${calculation.fullModulesCount}`)
  addLine(`Подрезок на схеме: ${calculation.cutModulesCount}`)
  addLine(`Плиток на подрезку: ${calculation.cutSourceModulesCount}`)
  addLine(`К заказу: ${calculation.modulesToPurchase}`)
  addLine(`Запас: ${calculation.wastePercent}%`)
  addLine(`Итого с запасом: ${calculation.modulesWithWasteCount}`)
  addLine(`Площадь покупки: ${formatArea(calculation.purchaseAreaSqm)}`)
  if (calculation.totalCost !== undefined) {
    addLine(`Стоимость: ${calculation.totalCost.toLocaleString('ru-RU')} ₽`)
  }
  if (calculation.totalWeightKg !== undefined) {
    addLine(`Вес: ${calculation.totalWeightKg.toFixed(1)} кг`)
  }

  if (calculation.warnings.length) {
    y += 3
    addLine('Предупреждения:', true)
    for (const w of calculation.warnings) {
      addLine(`• ${w.message}`)
    }
  }

  if (canvasDataUrl) {
    try {
      const imgY = Math.min(y + 5, 120)
      doc.addImage(canvasDataUrl, 'PNG', 15, imgY, 180, 100)
      y = imgY + 105
    } catch {
      // CORS or invalid image — skip
    }
  }

  y += 5
  doc.setFontSize(9)
  doc.text(
    'Расчёт является предварительным и требует проверки перед оформлением заказа.',
    15,
    Math.min(y, 285),
    { maxWidth: 180 },
  )

  doc.save(`plastfactor-${date}.pdf`)
}
