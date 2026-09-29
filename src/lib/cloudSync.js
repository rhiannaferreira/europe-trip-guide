// Keeps the trip in this browser and the same trip in the signed-in person's account in step.
//
// The browser copy (localStorage) stays the one the app works from, so nothing changes for people who
// never sign in, and a signed-in trip still works offline. While signed in, every change is sent to
// the account shortly after it's made.
//
// On sign-in:
//   - this browser was already linked to one of the person's saved trips: carry on with it (taking
//     the account's copy if it changed elsewhere and this browser didn't, otherwise sending this one)
//   - this browser has a trip: it's uploaded as a new saved trip (never thrown away), unless the
//     account already holds exactly the same trip
//   - this browser's trip is empty: the most recently changed saved trip is opened
//
// The link (travel-app-cloud) is { userId, tripId, syncedHash, remoteUpdatedAt }: which saved trip this
// browser's trip is, a fingerprint of what was last saved, and the server time of that save. It
// survives signing out, so signing back in as the same person doesn't make a duplicate.
//
// This file has no React in it; useCloudSync.js connects it to the app. `options`:
//   api          { list, get, save(row, { keepalive }), remove(id) }   (lib/cloudTrips.js)
//   store        { read(), write(link) }                               where the link is kept
//   getLocal()   the browser's trip right now, as { trip, budget, extra_places }
//   normalize(row)  a saved row in the same shape getLocal() gives (so equal trips compare equal)
//   apply(data)  replace the browser's trip with `data` (the normalized shape)
//   isEmpty(data)   whether a trip holds nothing worth keeping
//   nameOf(data)    the trip's display name, stored alongside it for the trip list
//   newId()      a fresh uuid
//   onChange(state) called whenever the state below changes
//
// State: { phase, status, error, currentId, trips, notice }
//   phase   'off' (signed out) | 'connecting' | 'on'
//   status  'saved' | 'pending' | 'saving' | 'error'
//   trips   the account's saved trips, newest first: [{ id, name, updatedAt, cityIds }]
export const SAVE_DELAY = 1200
const RETRY_DELAYS = [5000, 15000, 60000]

// JSON with object keys sorted, so the same trip always gives the same text whatever order it was edited in.
export function json(data) {
  return JSON.stringify(data, (key, value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]])) : value,
  )
}

// A short fingerprint of a trip, so the link can remember what was last saved without a full copy.
export function fingerprint(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${text.length}:${(h >>> 0).toString(36)}`
}

export function createCloudSync(options) {
  const { api, store, getLocal, normalize, apply, isEmpty, nameOf, newId, onChange = () => {} } = options
  let state = { phase: 'off', status: 'saved', error: null, currentId: null, trips: [], notice: null }
  let user = null
  let link = null
  let lastJSON = null // what the account holds for the current trip, as far as this browser knows
  let timer = null
  let retry = 0
  let saving = null // the save in flight
  let generation = 0 // bumped on sign-out and account switches, so late answers are ignored

  const set = (patch) => {
    state = { ...state, ...patch }
    onChange(state)
  }

  const summary = (row, data = normalize(row)) => ({
    id: row.id,
    name: row.name || nameOf(data),
    updatedAt: row.updated_at,
    cityIds: (data.trip?.stops || []).map((s) => s.cityId),
  })

  const setLink = (patch) => {
    link = { ...link, ...patch }
    store.write(link)
  }

  const localJSON = () => json(getLocal())

  function clearTimer() {
    clearTimeout(timer)
    timer = null
  }

  // Replace the browser's trip with a saved one and remember it as in step.
  function adopt(row) {
    const data = normalize(row)
    apply(data)
    lastJSON = json(data)
    setLink({ userId: user.id, tripId: row.id, syncedHash: fingerprint(lastJSON), remoteUpdatedAt: row.updated_at })
    set({ currentId: row.id, status: 'saved', error: null })
  }

  function upsertSummary(entry) {
    const trips = [entry, ...state.trips.filter((t) => t.id !== entry.id)]
    trips.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    set({ trips })
  }

  // Send the browser's trip to the account now (if it changed). Resolves when done; never throws.
  async function flush({ keepalive = false } = {}) {
    clearTimer()
    if (state.phase !== 'on') return
    if (saving) await saving
    if (state.phase !== 'on') return
    const data = getLocal()
    const text = json(data)
    if (text === lastJSON) {
      if (state.status !== 'saved') set({ status: 'saved', error: null })
      return
    }
    // A new trip with nothing in it isn't worth a row in the account yet.
    if (lastJSON === null && isEmpty(data)) {
      set({ status: 'saved', error: null })
      return
    }
    const id = state.currentId
    const gen = generation
    set({ status: 'saving' })
    saving = (async () => {
      try {
        const row = await api.save({ id, user_id: user.id, name: nameOf(data), ...data }, { keepalive })
        if (gen !== generation) return
        lastJSON = text
        retry = 0
        const updatedAt = row?.updated_at || new Date().toISOString()
        if (id === state.currentId) setLink({ userId: user.id, tripId: id, syncedHash: fingerprint(text), remoteUpdatedAt: updatedAt })
        upsertSummary(summary({ id, name: nameOf(data), updated_at: updatedAt }, data))
        // More changes may have come in while this one was on its way.
        set({ status: localJSON() === lastJSON || id !== state.currentId ? 'saved' : 'pending', error: null })
        if (state.status === 'pending') schedule()
      } catch (err) {
        if (gen !== generation) return
        set({ status: 'error', error: err?.message || 'Could not save' })
        clearTimer()
        timer = setTimeout(flush, RETRY_DELAYS[Math.min(retry++, RETRY_DELAYS.length - 1)])
      } finally {
        saving = null
      }
    })()
    await saving
  }

  function schedule() {
    clearTimer()
    timer = setTimeout(flush, SAVE_DELAY)
  }

  const sync = {
    get state() {
      return state
    },

    // The person is signed in (on load, or just now). Works out which saved trip this browser's trip is.
    async signIn(nextUser) {
      if (user?.id === nextUser.id && state.phase !== 'off') return
      const gen = ++generation
      user = nextUser
      link = store.read()
      set({ phase: 'connecting', status: 'saved', error: null, notice: null })
      let rows
      try {
        rows = (await api.list()) || []
      } catch (err) {
        if (gen !== generation) return
        set({ phase: 'off', status: 'error', error: err?.message || 'Could not reach your account' })
        // Try again shortly; the app keeps working from this browser meanwhile.
        clearTimer()
        timer = setTimeout(() => {
          if (gen === generation) {
            user = null
            sync.signIn(nextUser)
          }
        }, RETRY_DELAYS[Math.min(retry++, RETRY_DELAYS.length - 1)])
        return
      }
      if (gen !== generation) return
      retry = 0
      const local = getLocal()
      const localText = json(local)
      const summaries = rows.map((r) => summary(r))
      set({ trips: summaries })
      const linked = link?.userId === user.id ? rows.find((r) => r.id === link.tripId) : null
      let notice = null

      if (linked) {
        const remoteText = json(normalize(linked))
        const localUnchanged = fingerprint(localText) === link.syncedHash
        state = { ...state, phase: 'on' }
        if (localText === remoteText) {
          lastJSON = remoteText
          setLink({ remoteUpdatedAt: linked.updated_at, syncedHash: fingerprint(remoteText) })
          set({ currentId: linked.id })
        } else if (localUnchanged) {
          adopt(linked)
        } else {
          // Changed here since the last save (offline, or while signed out): this browser's version wins.
          lastJSON = remoteText
          set({ currentId: linked.id })
        }
      } else if (isEmpty(local)) {
        state = { ...state, phase: 'on' }
        if (rows.length) {
          adopt(rows[0])
          notice = rows.length > 1 ? 'Opened your most recent trip. Your other trips are in your account.' : 'Opened your saved trip.'
        } else {
          lastJSON = null
          const id = newId()
          setLink({ userId: user.id, tripId: id, syncedHash: null, remoteUpdatedAt: null })
          set({ currentId: id })
        }
      } else {
        state = { ...state, phase: 'on' }
        const same = rows.find((r) => json(normalize(r)) === localText)
        if (same) {
          lastJSON = localText
          setLink({ userId: user.id, tripId: same.id, syncedHash: fingerprint(localText), remoteUpdatedAt: same.updated_at })
          set({ currentId: same.id })
        } else {
          lastJSON = null
          const id = newId()
          setLink({ userId: user.id, tripId: id, syncedHash: null, remoteUpdatedAt: null })
          set({ currentId: id })
          notice = 'Your trip is now saved to your account.'
        }
      }
      set({ phase: 'on', notice })
      await flush()
    },

    // Signed out (or the session ended). The trip stays in this browser; the link is kept.
    signOut() {
      generation++
      clearTimer()
      user = null
      lastJSON = null
      set({ phase: 'off', status: 'saved', error: null, currentId: null, trips: [], notice: null })
    },

    // The browser's trip changed.
    changed() {
      if (state.phase !== 'on') return
      if (localJSON() === lastJSON) {
        if (state.status === 'pending') set({ status: 'saved' })
        return
      }
      if (state.status !== 'saving' && state.status !== 'error') set({ status: 'pending' })
      if (state.status !== 'error') schedule()
    },

    flush,

    // Back on the page (tab focused again): pick up changes made on another device, unless this
    // browser has changes of its own still to send.
    async refresh() {
      if (state.phase !== 'on' || saving || timer || localJSON() !== lastJSON || lastJSON === null) return
      const gen = generation
      const id = state.currentId
      let row
      try {
        row = await api.get(id)
      } catch {
        return
      }
      if (gen !== generation || id !== state.currentId || !row) return
      if (row.updated_at !== link?.remoteUpdatedAt && localJSON() === lastJSON) adopt(row)
    },

    // Open another saved trip. The current one is saved first.
    async open(id) {
      if (state.phase !== 'on' || id === state.currentId) return
      await flush()
      const gen = generation
      const row = await api.get(id)
      if (gen !== generation) return
      if (!row) throw new Error('That trip is no longer in your account.')
      adopt(row)
      upsertSummary(summary(row))
    },

    // Start an empty trip. The current one is saved first and stays in the account.
    async startNew(emptyData) {
      if (state.phase !== 'on') return
      await flush()
      const id = newId()
      apply(emptyData)
      lastJSON = null
      setLink({ userId: user.id, tripId: id, syncedHash: null, remoteUpdatedAt: null })
      set({ currentId: id, status: 'saved', error: null })
    },

    // The browser's trip is about to be replaced by something else (a shared link): save the current
    // one, then treat what comes next as a new saved trip rather than writing over this one.
    async detach() {
      if (state.phase !== 'on') return
      await flush()
      const id = newId()
      lastJSON = null
      setLink({ userId: user.id, tripId: id, syncedHash: null, remoteUpdatedAt: null })
      set({ currentId: id })
    },

    // Delete a saved trip other than the open one.
    async remove(id) {
      if (state.phase !== 'on' || id === state.currentId) return
      await api.remove(id)
      set({ trips: state.trips.filter((t) => t.id !== id) })
    },

    dismissNotice() {
      set({ notice: null })
    },
  }
  return sync
}
