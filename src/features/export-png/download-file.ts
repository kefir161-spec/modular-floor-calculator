/**
 * Скачивание файла через blob.
 *
 * data:-URL для схемы не годится: PNG раскладки весит 8–50 МБ (2× от этого
 * в виде base64-строки), а браузеры ограничивают размер data:-URL в скачивании
 * и отдают обрезанный файл. Blob таких ограничений не имеет.
 */

/** Ссылку нельзя освобождать сразу: браузер ещё не начал читать blob. */
const REVOKE_DELAY_MS = 10_000

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url

  // Firefox игнорирует click() на элементе вне документа.
  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось создать PNG из схемы'))),
      'image/png',
    )
  })
}
