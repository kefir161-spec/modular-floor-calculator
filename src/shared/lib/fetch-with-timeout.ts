/**
 * fetch, ограниченный по времени: запрос, который молча отбрасывается сетью,
 * иначе навсегда оставляет раскладку в состоянии загрузки.
 */
export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 7000, ...init }: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
