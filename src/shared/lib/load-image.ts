/**
 * Загрузка фото с таймаутом и перебором источников.
 *
 * Тег <img> не сообщает об ошибке, если запрос молча отбрасывается
 * (файрвол, фильтрация провайдера, блокировщик рекламы): события load и error
 * не приходят никогда. Без таймаута такой источник навсегда оставляет
 * раскладку в состоянии загрузки, поэтому каждая попытка ограничена по времени,
 * а источники перебираются по очереди.
 */

export type ImageCandidate = {
  url: string
  /** Нужен для чтения пикселей: без него canvas становится tainted. */
  crossOrigin?: 'anonymous'
}

export type LoadImageOptions = {
  timeoutMs?: number
  signal?: AbortSignal
}

/** Запаса хватает медленному мобильному каналу, но зависший источник не блокирует UI. */
export const IMAGE_LOAD_TIMEOUT_MS = 7000

class AbortError extends Error {
  constructor() {
    super('Загрузка фото отменена')
    this.name = 'AbortError'
  }
}

export function loadImage(
  { url, crossOrigin }: ImageCandidate,
  { timeoutMs = IMAGE_LOAD_TIMEOUT_MS, signal }: LoadImageOptions = {},
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError())
      return
    }

    const image = new Image()
    let timer: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer)
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', onAbort)
    }

    // Пустой src прерывает запрос: браузер отменяет незавершённую загрузку.
    const abortRequest = () => {
      image.src = ''
    }

    const fail = (error: Error) => {
      cleanup()
      abortRequest()
      reject(error)
    }

    const onAbort = () => {
      fail(new AbortError())
    }

    image.onload = () => {
      cleanup()
      resolve(image)
    }

    image.onerror = () => {
      fail(new Error(`Не удалось загрузить фото: ${url}`))
    }

    signal?.addEventListener('abort', onAbort)

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        fail(new Error(`Таймаут загрузки фото: ${url}`))
      }, timeoutMs)
    }

    if (crossOrigin) image.crossOrigin = crossOrigin
    image.src = url
  })
}

export type LoadedImage = {
  image: HTMLImageElement
  candidate: ImageCandidate
}

/**
 * Первый источник, который удалось загрузить. Возвращает null, если не смог ни один
 * (раскладка тогда рисуется без текстуры, а не висит в загрузке).
 */
export async function loadFirstImage(
  candidates: readonly ImageCandidate[],
  options: LoadImageOptions = {},
): Promise<LoadedImage | null> {
  for (const candidate of candidates) {
    if (options.signal?.aborted) return null
    try {
      return { image: await loadImage(candidate, options), candidate }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return null
    }
  }
  return null
}
