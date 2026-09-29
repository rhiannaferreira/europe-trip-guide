// Saved trips in the signed-in person's account (the `trips` table in supabase/schema.sql).
// Row-level security means these requests only ever see the signed-in person's own rows.
import { authed } from './supabase.js'

const COLUMNS = 'id,name,trip,budget,extra_places,updated_at'

export const cloudTrips = {
  list: () => authed(`/rest/v1/trips?select=${COLUMNS}&order=updated_at.desc`),

  get: async (id) => (await authed(`/rest/v1/trips?select=${COLUMNS}&id=eq.${encodeURIComponent(id)}`))?.[0] || null,

  // Insert or update by id. Returns the saved row (with the server's updated_at).
  save: async (row, { keepalive = false } = {}) =>
    (
      await authed('/rest/v1/trips?on_conflict=id', {
        method: 'POST',
        body: row,
        keepalive,
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      })
    )?.[0] || null,

  remove: (id) => authed(`/rest/v1/trips?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
