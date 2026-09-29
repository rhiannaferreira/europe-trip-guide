import { createContext, useContext, useEffect, useState } from 'react'
import { accountsEnabled, currentSession, onSessionChange, sendMagicLink, signOut, takeSessionFromUrl } from './supabase.js'
import { HASH_MODE, navigate } from './router.jsx'

// Who is signed in, for the whole app. With accounts off (no Supabase settings) this is always
// { enabled: false } and nothing about accounts shows anywhere.
const AccountContext = createContext({ enabled: false, user: null })

export const useAccount = () => useContext(AccountContext)

export function AccountProvider({ children }) {
  const [session, setSession] = useState(() => (accountsEnabled ? currentSession() : null))
  // What happened when coming back from a sign-in link: null, 'signed-in', or an error message.
  const [linkResult, setLinkResult] = useState(null)

  useEffect(() => {
    if (!accountsEnabled) return
    const stop = onSessionChange(setSession)
    takeSessionFromUrl().then((result) => {
      if (!result) return
      setLinkResult(result.error || 'signed-in')
      // A sign-in link can land on the home page (Supabase's fallback); the account lives in the planner.
      if (!HASH_MODE && window.location.pathname === '/') navigate('/trip', { replace: true })
    })
    return stop
  }, [])

  const value = accountsEnabled
    ? {
        enabled: true,
        user: session?.user || null,
        linkResult,
        clearLinkResult: () => setLinkResult(null),
        // The link brings the person back to the page they asked from.
        sendLink: (email) => sendMagicLink(email, `${window.location.origin}${window.location.pathname}`),
        signOut,
      }
    : { enabled: false, user: null }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
