// A small Supabase client for sign-in and saved trips, using plain fetch (no SDK download).
//
// Accounts are optional. They switch on only when the site is built with both
//   VITE_SUPABASE_URL        https://<project>.supabase.co
//   VITE_SUPABASE_ANON_KEY   the project's publishable (or legacy anon) key. It's public by design: row-level security
//                            in supabase/schema.sql lets each person reach only their own trips.
// Without them the app hides sign-in and keeps everything in this browser, as before.
//
// Sign-in is an emailed magic link. Supabase sends the person back to the site with the session in the
// URL fragment (#access_token=...&refresh_token=...), which takeSessionFromUrl() reads and removes.
// The session is kept in localStorage (travel-app-session) and refreshed before it expires.
import { KEYS, readJSON } from './storage.js'

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const accountsEnabled = Boolean(URL_BASE && ANON_KEY) && !import.meta.env.VITE_PREVIEW

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// ----- Session -----

let session = readJSON(KEYS.session)
const listeners = new Set()

function setSession(next) {
  session = next
  try {
    if (next) localStorage.setItem(KEYS.session, JSON.stringify(next))
    else localStorage.removeItem(KEYS.session)
  } catch {
    // Storage blocked: the session lasts until the page is closed.
  }
  listeners.forEach((fn) => fn(session))
}

export const currentSession = () => session

export function onSessionChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Signing in or out in another tab applies here too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEYS.session) return
    session = readJSON(KEYS.session)
    listeners.forEach((fn) => fn(session))
  })
}

const now = () => Math.floor(Date.now() / 1000)

function fromTokenResponse(data) {
  if (!data?.access_token || !data?.refresh_token) throw new ApiError('Sign-in failed. Please try again.', 0)
  const expiresAt = Number(data.expires_at) || now() + (Number(data.expires_in) || 3600)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: data.user ? { id: data.user.id, email: data.user.email || '' } : session?.user || null,
  }
}

async function request(path, { method = 'GET', token, body, headers = {}, keepalive = false } = {}) {
  let res
  try {
    res = await fetch(`${URL_BASE}${path}`, {
      method,
      keepalive,
      headers: {
        apikey: ANON_KEY,
        // Signed out, only a legacy anon key (a JWT) goes here too; newer publishable keys go in apikey alone.
        ...(token || ANON_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${token || ANON_KEY}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0)
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const message = data?.msg || data?.error_description || data?.message || data?.error || `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return data
}

// One refresh at a time, however many requests notice the session is about to expire.
let refreshing = null
function refresh() {
  if (!session?.refresh_token) return Promise.resolve(null)
  if (!refreshing) {
    const token = session.refresh_token
    refreshing = request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: token } })
      .then((data) => {
        const next = fromTokenResponse(data)
        setSession(next)
        return next
      })
      .catch((err) => {
        // A rejected refresh token means the sign-in is over (signed out elsewhere, or revoked).
        // A network error keeps the session so it can refresh later.
        if (err.status >= 400 && err.status < 500 && session?.refresh_token === token) setSession(null)
        throw err
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

async function accessToken() {
  if (!session) throw new ApiError('Not signed in.', 401)
  if (session.expires_at - now() < 60) await refresh()
  if (!session) throw new ApiError('Not signed in.', 401)
  return session.access_token
}

// A request as the signed-in person. A 401 refreshes the session once and tries again.
export async function authed(path, options = {}) {
  const token = await accessToken()
  try {
    return await request(path, { ...options, token })
  } catch (err) {
    if (err.status !== 401) throw err
    await refresh()
    return request(path, { ...options, token: session?.access_token })
  }
}

// ----- Sign-in -----

// Emails a sign-in link. New email addresses get an account on first use.
export function sendMagicLink(email, redirectTo) {
  return request(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    body: { email: email.trim(), create_user: true },
  })
}

// Reads a session (or a sign-in error) from the URL after a magic link, then clears it from the address bar.
// Returns { error } when the link failed, { signedIn: true } when it worked, or null when the URL holds neither.
export async function takeSessionFromUrl() {
  const hash = window.location.hash.replace(/^#/, '')
  const search = window.location.search.replace(/^\?/, '')
  const params = new URLSearchParams(hash.includes('access_token=') || hash.includes('error=') ? hash : search)
  const hasToken = params.has('access_token')
  const hasError = params.has('error') || params.has('error_description')
  if (!hasToken && !hasError) return null

  // Remove the tokens from the address bar (and so from history and any link copied later).
  window.history.replaceState(window.history.state, '', window.location.pathname)

  if (hasError) {
    const code = params.get('error_code')
    const expired = code === 'otp_expired' || /expired/i.test(params.get('error_description') || '')
    return { error: expired ? 'That sign-in link has expired or was already used. Send yourself a new one.' : params.get('error_description') || 'Sign-in failed.' }
  }
  try {
    const partial = fromTokenResponse({
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      expires_at: params.get('expires_at'),
      expires_in: params.get('expires_in'),
    })
    const user = await request('/auth/v1/user', { token: partial.access_token })
    setSession({ ...partial, user: { id: user.id, email: user.email || '' } })
    return { signedIn: true }
  } catch (err) {
    return { error: err.message || 'Sign-in failed.' }
  }
}

export async function signOut() {
  const token = session?.access_token
  setSession(null)
  // Ends the session on the server too; if that fails, this browser is signed out anyway.
  if (token) request('/auth/v1/logout', { method: 'POST', token }).catch(() => {})
}
