import { useState } from 'react'
import { cityById } from '../data/cities.js'
import { useAccount } from '../lib/account.jsx'

const STATUS_TEXT = {
  saved: 'Saved to your account',
  pending: 'Saving…',
  saving: 'Saving…',
  error: 'Not saved yet',
}

const citiesLabel = (cityIds) => {
  const names = cityIds.map((id) => cityById[id]?.name).filter(Boolean)
  if (!names.length) return 'No cities yet'
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')
}

const whenLabel = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// The header button: "Sign in", or how the trip's saving is going once signed in.
export function AccountButton({ cloud, onOpen }) {
  const account = useAccount()
  if (!account.enabled) return null
  let icon = '👤'
  let label = 'Sign in'
  if (account.user) {
    const busy = cloud.phase === 'connecting' || cloud.status === 'pending' || cloud.status === 'saving'
    icon = cloud.status === 'error' ? '⚠️' : busy ? '⏳' : '☁️'
    label = cloud.status === 'error' ? 'Not saved' : busy ? 'Saving' : 'Saved'
  }
  return (
    <button type="button" className="btn nav-btn account-btn" onClick={onOpen} aria-label={account.user ? `Account: ${label}` : 'Sign in'}>
      <span aria-hidden="true">{icon}</span> <span className="nav-label">{label}</span>
    </button>
  )
}

// A line under the header after coming back from a sign-in link, or when signing in changed the trip.
export function AccountNotice({ cloud, onOpen }) {
  const account = useAccount()
  if (!account.enabled) return null
  const signedIn = account.linkResult === 'signed-in' && account.user
  const failed = account.linkResult && account.linkResult !== 'signed-in'
  const text = failed
    ? account.linkResult
    : [signedIn && `Signed in as ${account.user.email}.`, account.user && cloud.notice].filter(Boolean).join(' ')
  if (!text) return null
  const dismiss = () => {
    account.clearLinkResult()
    cloud.dismissNotice?.()
  }
  return (
    <div className={`account-notice${failed ? ' error' : ''}`} role="status">
      <span>{text}</span>
      <span className="account-notice-actions">
        <button type="button" className="btn" onClick={onOpen}>
          {failed ? 'Try again' : 'Your trips'}
        </button>
        <button type="button" className="modal-close" onClick={dismiss} aria-label="Dismiss">
          ✕
        </button>
      </span>
    </div>
  )
}

// Inside the account dialog.
export default function AccountPanel({ cloud, currentName }) {
  const account = useAccount()
  return account.user ? <SignedIn account={account} cloud={cloud} currentName={currentName} /> : <SignIn account={account} />
}

function SignIn({ account }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle' })

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setState({ status: 'sending' })
    try {
      await account.sendLink(email)
      setState({ status: 'sent', email: email.trim() })
    } catch (err) {
      setState({ status: 'error', message: err.status === 429 ? 'Too many sign-in emails just now. Wait a minute and try again.' : err.message })
    }
  }

  if (state.status === 'sent') {
    return (
      <div className="account">
        <p className="account-sent" role="status">
          ✉️ We've sent a sign-in link to <strong>{state.email}</strong>. Open it on this device to sign in. You can close this window.
        </p>
        <p className="rule">No email after a few minutes? Check your spam folder, or send another link.</p>
        <button type="button" className="btn" onClick={() => setState({ status: 'idle' })}>
          Send another link
        </button>
      </div>
    )
  }

  return (
    <form className="account" onSubmit={submit}>
      <p>Sign in to keep your trips in your own account and open them on any device. There's no password: we email you a link.</p>
      <label className="account-label" htmlFor="account-email">
        Email
      </label>
      <input
        id="account-email"
        className="account-input"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state.status === 'sending'}
      />
      {state.status === 'error' && (
        <p className="error-text" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      <p className="rule">Signing in is optional. Your current trip comes with you, and without an account it stays saved in this browser.</p>
    </form>
  )
}

function SignedIn({ account, cloud, currentName }) {
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const signOut = () =>
    run(async () => {
      await cloud.flush?.()
      await account.signOut()
    })

  const currentListed = cloud.trips.some((t) => t.id === cloud.currentId)
  const status = cloud.phase === 'connecting' ? 'Connecting to your account…' : cloud.phase === 'off' ? cloud.error || 'Not connected' : STATUS_TEXT[cloud.status]

  return (
    <div className="account">
      <p>
        Signed in as <strong>{account.user.email}</strong>
      </p>
      <p className={`account-status ${cloud.status}`} role="status">
        {status}
        {cloud.status === 'error' && cloud.error ? ` (${cloud.error}). We'll keep trying, and your trip is safe in this browser.` : ''}
      </p>

      <h3 className="account-heading">Your trips</h3>
      <ul className="account-trips">
        {!currentListed && cloud.phase === 'on' && (
          <li className="account-trip current">
            <div>
              <strong>{currentName}</strong>
              <span className="rule">Open now · saved once you add something</span>
            </div>
          </li>
        )}
        {cloud.trips.map((t) => {
          const current = t.id === cloud.currentId
          return (
            <li key={t.id} className={`account-trip${current ? ' current' : ''}`}>
              <div>
                <strong>{t.name}</strong>
                <span className="rule">
                  {citiesLabel(t.cityIds)}
                  {whenLabel(t.updatedAt) && ` · ${whenLabel(t.updatedAt)}`}
                </span>
              </div>
              {current ? (
                <span className="account-open-now">Open now</span>
              ) : confirming === t.id ? (
                <span className="account-trip-actions">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(() => cloud.remove(t.id))}>
                    Delete
                  </button>
                  <button type="button" className="btn" disabled={busy} onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <span className="account-trip-actions">
                  <button type="button" className="btn" disabled={busy || cloud.phase !== 'on'} onClick={() => run(() => cloud.open(t.id))}>
                    Open
                  </button>
                  <button type="button" className="btn" disabled={busy || cloud.phase !== 'on'} onClick={() => setConfirming(t.id)} aria-label={`Delete ${t.name}`}>
                    🗑️
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="account-actions">
        <button type="button" className="btn" disabled={busy || cloud.phase !== 'on'} onClick={() => run(cloud.startNew)}>
          ➕ Start a new trip
        </button>
        <button type="button" className="btn" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
      <p className="rule">Opening another trip or starting a new one keeps this one in your account. Signing out leaves a copy of the open trip in this browser.</p>
    </div>
  )
}
