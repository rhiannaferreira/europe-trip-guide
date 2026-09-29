import { useState } from 'react'
import { cityById } from '../data/cities.js'
import { countryByCode } from '../data/countries.js'
import { BUDGET_CATEGORIES, COST_LEVELS, CURRENCIES, perPersonDay } from '../data/costs.js'
import { autoEstimates, cityCostLevel, currencyOf, formatMoney, parseAmount, summarizeBudget } from '../utils/budgetCalculations.js'

function Tile({ label, value, tone }) {
  return (
    <div className={`stat budget-tile${tone ? ` ${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

// One category: its total, a bar sized against the largest category, and (opened) the estimate controls.
function CategoryRow({ cat, max, budget }) {
  const money = (n) => formatMoney(n, budget.currency)
  const ownInvalid = budget.estimates[cat.id]?.amount && cat.own === null
  return (
    <li className="budget-cat">
      <details>
        <summary>
          <span className="budget-cat-name">
            <span aria-hidden="true">{cat.icon}</span> {cat.label}
          </span>
          <span className="budget-cat-amount">{money(cat.total)}</span>
          <span className="budget-bar" aria-hidden="true">
            <span style={{ width: `${max ? (cat.total / max) * 100 : 0}%` }} title={`${cat.label}: ${money(cat.total)}`} />
          </span>
        </summary>
        <div className="budget-cat-body">
          {cat.auto ? (
            <>
              <p className="rule">
                Rough estimate: {money(cat.auto.amount)}. {cat.auto.detail}.
              </p>
              <label className="inline-field">
                Your estimate
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder={String(cat.auto.amount)}
                  value={budget.estimates[cat.id]?.amount ?? ''}
                  onChange={(e) => budget.setEstimate(cat.id, { amount: e.target.value })}
                  aria-invalid={ownInvalid || undefined}
                  disabled={cat.off}
                />
              </label>
            </>
          ) : (
            <label className="inline-field">
              Estimate
              <input
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={budget.estimates[cat.id]?.amount ?? ''}
                onChange={(e) => budget.setEstimate(cat.id, { amount: e.target.value })}
                aria-invalid={ownInvalid || undefined}
                disabled={cat.off}
              />
            </label>
          )}
          {ownInvalid && <p className="field-error">Use a positive number. Until then the rough estimate is used.</p>}
          <label className="check-field">
            <input type="checkbox" checked={!cat.off} onChange={(e) => budget.setEstimate(cat.id, { off: !e.target.checked })} />
            Count this estimate (untick if your expenses below already cover it)
          </label>
          {cat.items.length > 0 && (
            <p className="rule">
              Plus {cat.items.length} expense{cat.items.length === 1 ? '' : 's'}: {money(cat.expenses)}
            </p>
          )}
        </div>
      </details>
    </li>
  )
}

function AddExpense({ budget }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('accommodation')
  const [kind, setKind] = useState('estimate')
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null || value === 0) return setError('Enter an amount above zero.')
    budget.addExpense({ label: label.trim() || BUDGET_CATEGORIES.find((c) => c.id === category).label, amount: value, category, kind })
    setLabel('')
    setAmount('')
    setError('')
  }
  return (
    <form className="expense-form" onSubmit={submit}>
      <p className="subhead">Add an expense</p>
      <input type="text" placeholder="What is it? (e.g. Eurostar tickets)" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Expense name" />
      <div className="expense-form-row">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder={`Amount (${currencyOf(budget.currency).symbol})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
          aria-invalid={Boolean(error) || undefined}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {BUDGET_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="expense-form-row">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Estimated or paid">
          <option value="estimate">Estimated</option>
          <option value="paid">Paid / booked</option>
        </select>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </form>
  )
}

// Budget tab: total budget, estimated spending (built-in rough estimates + the user's own expenses), remaining.
export default function BudgetPlanner({ trip, legs, totalDays, budget }) {
  const autos = autoEstimates({ stops: trip.stops, totalDays, legs, levelOverrides: budget.cityLevels, travellers: budget.travellers, currency: budget.currency })
  const summary = summarizeBudget(budget, autos)
  const money = (n) => formatMoney(n, budget.currency)
  const max = Math.max(...summary.categories.map((c) => c.total))
  const totalInvalid = budget.total !== '' && summary.total === null
  const rate = currencyOf(budget.currency).perEuro

  return (
    <div className="budget">
      <div className="stats budget-tiles">
        <Tile label="Budget" value={summary.total === null ? '—' : money(summary.total)} />
        <Tile label="Estimated" value={money(summary.estimated)} />
        <Tile
          label="Remaining"
          value={summary.remaining === null ? '—' : money(summary.remaining)}
          tone={summary.remaining === null ? '' : summary.remaining < 0 ? 'over' : 'under'}
        />
      </div>
      {summary.remaining !== null && summary.remaining < 0 && <p className="note note-warn">The estimate is {money(-summary.remaining)} over your budget.</p>}
      {summary.paid > 0 && <p className="rule">Already paid or booked: {money(summary.paid)}</p>}

      <div className="budget-settings">
        <label>
          Total budget
          <span className="money-input">
            <select value={budget.currency} onChange={(e) => budget.setCurrency(e.target.value)} aria-label="Currency">
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 2500"
              value={budget.total}
              onChange={(e) => budget.setTotal(e.target.value)}
              aria-invalid={totalInvalid || undefined}
            />
          </span>
        </label>
        <label>
          Travellers
          <span className="stepper">
            <button type="button" onClick={() => budget.setTravellers(budget.travellers - 1)} disabled={budget.travellers <= 1} aria-label="One traveller fewer">
              −
            </button>
            <span className="stepper-value">{budget.travellers}</span>
            <button type="button" onClick={() => budget.setTravellers(budget.travellers + 1)} aria-label="One more traveller">
              +
            </button>
          </span>
        </label>
        {totalInvalid && <p className="field-error">The budget needs to be a positive number.</p>}
      </div>

      <section>
        <p className="subhead">Spending by category</p>
        <ul className="budget-cats">
          {summary.categories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} max={max} budget={budget} />
          ))}
        </ul>
        {autos.missingCost.length > 0 && <p className="note note-warn">No cost data for {autos.missingCost.join(', ')}, so it's left out of the estimates.</p>}
      </section>

      <AddExpense budget={budget} />

      {budget.expenses.length > 0 && (
        <section>
          <p className="subhead">Your expenses</p>
          <ul className="expense-list">
            {budget.expenses.map((e) => {
              const cat = BUDGET_CATEGORIES.find((c) => c.id === e.category)
              return (
                <li key={e.id}>
                  <span aria-hidden="true">{cat.icon}</span>
                  <span className="expense-label">{e.label}</span>
                  <button type="button" className={`kind-toggle${e.kind === 'paid' ? ' paid' : ''}`} onClick={() => budget.toggleExpenseKind(e.id)} title="Switch between estimated and paid">
                    {e.kind === 'paid' ? 'Paid' : 'Estimated'}
                  </button>
                  <span className="expense-amount">{money(parseAmount(e.amount) || 0)}</span>
                  <button type="button" className="remove-btn" onClick={() => budget.removeExpense(e.id)} aria-label={`Remove ${e.label}`}>
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {trip.stops.length > 0 && (
        <section>
          <p className="subhead">City cost levels</p>
          <ul className="city-costs">
            {trip.stops.map((s) => {
              const city = cityById[s.cityId]
              const level = cityCostLevel(s.cityId, budget.cityLevels)
              const overridden = budget.cityLevels[s.cityId] !== undefined
              return (
                <li key={s.cityId}>
                  <span>
                    {countryByCode[city.country].flag} {city.name}
                    <small>{level ? `~${money(perPersonDay(level) * rate)} a day per person` : 'No cost data'}</small>
                  </span>
                  <select
                    value={level ? level.level : ''}
                    onChange={(e) => budget.setCityLevel(s.cityId, Number(e.target.value) === city.costLevel ? null : Number(e.target.value))}
                    aria-label={`Cost level for ${city.name}`}
                  >
                    {!level && <option value="">Unknown</option>}
                    {Object.values(COST_LEVELS).map((l) => (
                      <option key={l.level} value={l.level}>
                        {l.label}
                        {l.level === city.costLevel ? ' (sample)' : ''}
                      </option>
                    ))}
                  </select>
                  {overridden && <small className="override-tag">your choice</small>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <p className="rule">
        All estimates are rough planning figures from hardcoded sample cost levels, not live prices. Train fares are guessed from distance.
        {budget.currency !== 'EUR' && ` Converted from euros at a fixed rough rate (€1 ≈ ${currencyOf(budget.currency).symbol}${rate}), not a live exchange rate.`} Nothing is
        connected to a bank or payment service; everything stays in this browser.
      </p>
    </div>
  )
}
