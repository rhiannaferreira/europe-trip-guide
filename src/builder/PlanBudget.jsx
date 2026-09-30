import { cityById } from '../data/cities.js'
import { formatMoney } from '../utils/budgetCalculations.js'
import DataBadge from './DataBadge.jsx'

const STATUS = {
  fits: { text: 'Fits your budget', cls: 'note-good' },
  tight: { text: 'Only just fits your budget', cls: 'note-warn' },
  over: { text: 'Over your budget', cls: 'note-warn' },
}

// Where the money goes: rooms, transport, food, activities and extras, from each city's cost level.
export default function PlanBudget({ budget, travellers, onFix }) {
  const money = (n) => formatMoney(n, budget.currency)
  const status = STATUS[budget.status]
  return (
    <div className="plan-budget">
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Estimated total</span>
          <span className="stat-value">{money(budget.total)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Per person</span>
          <span className="stat-value">
            {money(budget.perPerson)} <small>{travellers} traveller{travellers === 1 ? '' : 's'}</small>
          </span>
        </div>
      </div>
      {status ? (
        <p className={`note ${status.cls}`}>
          {status.text}: {money(budget.total)} of {money(budget.budget)}
          {budget.remaining >= 0 ? `, about ${money(budget.remaining)} left over.` : `, about ${money(-budget.remaining)} over.`}
        </p>
      ) : (
        <p className="rule">Add a budget in the form to see whether this plan fits it.</p>
      )}
      <ul className="budget-rows">
        {budget.categories.map((c) => (
          <li key={c.id}>
            <span aria-hidden="true">{c.icon}</span>
            <span>
              <strong>{c.label}</strong>
              <small>{c.detail}</small>
            </span>
            <span className="budget-amount">{money(c.amount)}</span>
          </li>
        ))}
      </ul>
      {budget.suggestions.length > 0 && (
        <>
          <h3 className="subhead">Ways to spend less</h3>
          <ul className="notes">
            {budget.suggestions.map((s) => (
              <li key={s.text} className="note note-tip">
                {s.text}{' '}
                {s.fix && (
                  <button type="button" className="link-btn small" onClick={() => onFix(s.fix)}>
                    Try it
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="subhead">By city</h3>
      <ul className="budget-rows compact">
        {budget.perCity.map((c) => (
          <li key={c.cityId}>
            <span>{cityById[c.cityId].name}</span>
            <small>{c.level} prices</small>
            <span className="budget-amount">{c.perPersonDay ? `${money(c.perPersonDay)}/person/day` : 'no data'}</span>
          </li>
        ))}
      </ul>
      <p className="rule">
        <DataBadge kind="estimate" /> Rough planning numbers from each city’s cost level and distance-based train fares, not live prices.
        {budget.missingCost > 0 && ` ${budget.missingCost} planned place${budget.missingCost === 1 ? ' has' : 's have'} no price in the data.`} Saving the trip copies these into the Budget tab, where you can adjust them.
      </p>
    </div>
  )
}
