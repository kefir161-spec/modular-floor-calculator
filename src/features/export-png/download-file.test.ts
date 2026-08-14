import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { canvasToPngBlob, downloadBlob } from '@/features/export-png/download-file'

describe('downloadBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-url')
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('скачивает через blob, а не через data-URL: у него нет лимита размера', () => {
    const clicked: string[] = []
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicked.push(this.getAttribute('href') ?? '')
    }

    try {
      downloadBlob(new Blob(['x']), 'layout.png')
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
    }

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clicked).toEqual(['blob:mock-url'])
  })

  it('не оставляет ссылку в документе', () => {
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => undefined

    try {
      downloadBlob(new Blob(['x']), 'layout.png')
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
    }

    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('освобождает blob не сразу — иначе браузер не успевает начать скачивание', () => {
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = () => undefined

    try {
      downloadBlob(new Blob(['x']), 'layout.png')
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
    }

    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})

describe('canvasToPngBlob', () => {
  it('возвращает blob из холста', async () => {
    const blob = new Blob(['png'])
    const canvas = {
      toBlob: (cb: (b: Blob | null) => void) => cb(blob),
    } as unknown as HTMLCanvasElement

    await expect(canvasToPngBlob(canvas)).resolves.toBe(blob)
  })

  it('падает с понятной ошибкой, когда холст не отдал данные', async () => {
    const canvas = {
      toBlob: (cb: (b: Blob | null) => void) => cb(null),
    } as unknown as HTMLCanvasElement

    await expect(canvasToPngBlob(canvas)).rejects.toThrow(/Не удалось создать PNG/)
  })
})
