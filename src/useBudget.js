import { useEffect, useState } from 'react'
import { CURRENCIES, COST_LEVELS, BUDGET_CATEGORIES } from './data/costs.js'
import { KEYS, readJSON, writeJSON } from './lib/storage.js'

// Budget shape (localStorage key travel-app-budget):
//   {
//     version: 1,
//     total: '',            what the user typed for their total budget (kept as text so a half-typed value isn't lost)
//     currency: 'EUR',      EUR, USD or GBP
//     travellers: 1,
//     cityLevels: { [cityId]: 1 | 2 | 3 },               the user's cost level for a city, overriding the sample one
//     estimates: { [category]: { amount: '', off } },    the user's own estimate for a category, or off to leave it out
//     expenses: [{ id, category, label, amount, kind }], kind: 'estimate' (expected) or 'paid'
//   }
const categoryIds = BUDGET_CATEGORIES.map((c) => c.id)
export const emptyBudget = () => ({ version: 1, total: '', currency: 'EUR', travellers: 1, cityLevels: {}, estimates: {}, expenses: [] })

// A saved budget (from localStorage or the account), checked and filled in.
export function normalizeBudget(saved) {
  if (!saved || typeof saved !== 'object') return emptyBudget()
  return {
    version: 1,
    total: typeof saved.total === 'string' || typeof saved.total === 'number' ? String(saved.total) : '',
    currency: CURRENCIES[saved.currency] ? saved.currency : 'EUR',
    travellers: Number.isInteger(saved.travellers) && saved.travellers > 0 ? saved.travellers : 1,
    cityLevels: Object.fromEntries(Object.entries(saved.cityLevels || {}).filter(([, l]) => COST_LEVELS[l])),
    estimates: Object.fromEntries(Object.entries(saved.estimates || {}).filter(([id]) => categoryIds.includes(id))),
    expenses: Array.isArray(saved.expenses)
      ? saved.expenses.filter((e) => e && categoryIds.includes(e.category)).map((e) => ({ ...e, kind: e.kind === 'paid' ? 'paid' : 'estimate' }))
      : [],
  }
}

const load = () => normalizeBudget(readJSON(KEYS.budget))

// Whether a budget holds nothing worth keeping (settings like the currency don't count).
export const isEmptyBudget = (b) => !String(b.total).trim() && b.expenses.length === 0

let nextId = Date.now()

export function useBudget() {
  const [budget, setBudget] = useState(load)
  useEffect(() => writeJSON(KEYS.budget, budget), [budget])

  const set = (patch) => setBudget((b) => ({ ...b, ...patch }))
  return {
    ...budget,
    // The budget exactly as saved, and a way to swap in one from the account (see useCloudSync.js).
    raw: budget,
    load: (data) => setBudget(normalizeBudget(data)),
    setTotal: (total) => set({ total }),
    setCurrency: (currency) => CURRENCIES[currency] && set({ currency }),
    setTravellers: (n) => set({ travellers: Math.min(20, Math.max(1, Math.round(n) || 1)) }),
    setCityLevel: (cityId, level) =>
      setBudget((b) => {
        const cityLevels = { ...b.cityLevels }
        if (level === null) delete cityLevels[cityId]
        else cityLevels[cityId] = level
        return { ...b, cityLevels }
      }),
    setEstimate: (category, patch) =>
      setBudget((b) => ({ ...b, estimates: { ...b.estimates, [category]: { ...b.estimates[category], ...patch } } })),
    addExpense: (expense) => setBudget((b) => ({ ...b, expenses: [...b.expenses, { ...expense, id: `e${nextId++}` }] })),
    removeExpense: (id) => setBudget((b) => ({ ...b, expenses: b.expenses.filter((e) => e.id !== id) })),
    toggleExpenseKind: (id) =>
      setBudget((b) => ({ ...b, expenses: b.expenses.map((e) => (e.id === id ? { ...e, kind: e.kind === 'paid' ? 'estimate' : 'paid' } : e)) })),
  }
}
