// Calling a provider: one timeout, and errors reduced to a few codes. Provider responses and error
// bodies never reach the browser or the logs as-is (they can echo keys in URLs).

export class ProviderError extends Error {
  // code: 'not_configured' | 'timeout' | 'unavailable' | 'rate_limited' | 'bad_response' | 'not_found' | 'cap_reached'
  constructor(code, { status = 0 } = {}) {
    super(code)
    this.code = code
    this.status = status
  }
}

export async function getJSON(url, { timeout = 8000, headers = {} } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let res
  try {
    res = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: controller.signal })
  } catch (e) {
    throw new ProviderError(e?.name === 'AbortError' ? 'timeout' : 'unavailable')
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 429) throw new ProviderError('rate_limited', { status: 429 })
  if (res.status === 404) throw new ProviderError('not_found', { status: 404 })
  if (res.status === 401 || res.status === 403) throw new ProviderError('not_configured', { status: res.status })
  if (!res.ok) throw new ProviderError(res.status >= 500 ? 'unavailable' : 'bad_response', { status: res.status })
  try {
    return await res.json()
  } catch {
    throw new ProviderError('bad_response', { status: res.status })
  }
}
