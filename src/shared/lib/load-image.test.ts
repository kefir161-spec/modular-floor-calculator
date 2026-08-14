import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { loadFirstImage, loadImage } from './load-image'

type FakeImage = {
  src: string
  crossOrigin?: string | null
  onload: (() => void) | null
  onerror: (() => void) | null
}

/**
 * Заглушка <img>: «мёртвый» адрес не вызывает ни load, ни error — так ведёт себя
 * запрос, который сеть молча отбрасывает (файрвол, фильтрация, блокировщик).
 */
function stubImage(behaviour: (url: string) => 'load' | 'error' | 'hang'): FakeImage[] {
  const created: FakeImage[] = []

  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      crossOrigin: string | null = null
      #src = ''

      constructor() {
        created.push(this as unknown as FakeImage)
      }

      get src() {
        return this.#src
      }

      set src(value: string) {
        this.#src = value
        if (!value) return

        const outcome = behaviour(value)
        if (outcome === 'hang') return
        setTimeout(() => {
          if (outcome === 'load') this.onload?.()
          else this.onerror?.()
        }, 10)
      }
    },
  )

  return created
}

describe('loadImage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('возвращает фото после события load', async () => {
    stubImage(() => 'load')

    const promise = loadImage({ url: 'https://cdn.test/tile.jpg' })
    await vi.advanceTimersByTimeAsync(10)

    await expect(promise).resolves.toMatchObject({ src: 'https://cdn.test/tile.jpg' })
  })

  it('проставляет crossOrigin до присвоения src', async () => {
    const created = stubImage(() => 'load')

    const promise = loadImage({ url: 'https://cdn.test/tile.jpg', crossOrigin: 'anonymous' })
    await vi.advanceTimersByTimeAsync(10)
    await promise

    expect(created[0].crossOrigin).toBe('anonymous')
  })

  it('падает по таймауту, если источник не отвечает', async () => {
    stubImage(() => 'hang')

    const promise = loadImage({ url: 'https://blocked.test/tile.jpg' }, { timeoutMs: 1000 })
    const assertion = expect(promise).rejects.toThrow(/Таймаут/)
    await vi.advanceTimersByTimeAsync(1000)

    await assertion
  })

  it('прерывает запрос при таймауте, чтобы не держать соединение', async () => {
    const created = stubImage(() => 'hang')

    const promise = loadImage({ url: 'https://blocked.test/tile.jpg' }, { timeoutMs: 1000 })
    promise.catch(() => undefined)
    await vi.advanceTimersByTimeAsync(1000)

    expect(created[0].src).toBe('')
  })

  it('прерывается по signal', async () => {
    stubImage(() => 'hang')
    const controller = new AbortController()

    const promise = loadImage({ url: 'https://slow.test/tile.jpg' }, { signal: controller.signal })
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort()

    await assertion
  })
})

describe('loadFirstImage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('переходит к запасному источнику, когда основной завис', async () => {
    stubImage((url) => (url.includes('wsrv.nl') ? 'hang' : 'load'))

    const promise = loadFirstImage(
      [
        { url: 'https://wsrv.nl/?url=blocked', crossOrigin: 'anonymous' },
        { url: 'https://plastfactor.com/tile.jpg' },
      ],
      { timeoutMs: 1000 },
    )
    await vi.advanceTimersByTimeAsync(1100)

    await expect(promise).resolves.toMatchObject({
      candidate: { url: 'https://plastfactor.com/tile.jpg' },
    })
  })

  it('переходит к запасному источнику после ошибки основного', async () => {
    stubImage((url) => (url.includes('wsrv.nl') ? 'error' : 'load'))

    const promise = loadFirstImage([
      { url: 'https://wsrv.nl/?url=blocked' },
      { url: 'https://plastfactor.com/tile.jpg' },
    ])
    await vi.advanceTimersByTimeAsync(50)

    await expect(promise).resolves.toMatchObject({
      candidate: { url: 'https://plastfactor.com/tile.jpg' },
    })
  })

  it('возвращает null, когда недоступны все источники', async () => {
    stubImage(() => 'hang')

    const promise = loadFirstImage(
      [{ url: 'https://a.test/tile.jpg' }, { url: 'https://b.test/tile.jpg' }],
      { timeoutMs: 500 },
    )
    await vi.advanceTimersByTimeAsync(1200)

    await expect(promise).resolves.toBeNull()
  })

  it('не перебирает источники после отмены', async () => {
    const created = stubImage(() => 'hang')
    const controller = new AbortController()

    const promise = loadFirstImage(
      [{ url: 'https://a.test/tile.jpg' }, { url: 'https://b.test/tile.jpg' }],
      { signal: controller.signal },
    )
    controller.abort()

    await expect(promise).resolves.toBeNull()
    expect(created).toHaveLength(1)
  })
})
