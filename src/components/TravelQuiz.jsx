import { useState } from 'react'
import { countryByCode } from '../data/countries.js'
import { BUDGETS, DESTINATION_TYPES, PACES, PREFERENCE_INTERESTS, explainMatch, quizResults, stayForPace } from '../utils/matching.js'
import Thumb from './Thumb.jsx'

const QUESTIONS = [
  { key: 'interests', title: 'What are you most interested in?', hint: 'Pick as many as you like.', options: PREFERENCE_INTERESTS, multi: true },
  { key: 'pace', title: 'What kind of trip?', options: PACES },
  { key: 'budget', title: 'Budget?', options: BUDGETS },
  { key: 'type', title: 'What destinations do you prefer?', options: DESTINATION_TYPES },
]
const START = { interests: [], pace: '', budget: '', type: '' }

// A four-question destination quiz. Matching is simple scoring against the sample city data (see utils/matching.js).
export default function TravelQuiz({ tripCityIds, onViewCity, onAddCity }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(START)
  const done = step >= QUESTIONS.length

  if (done) {
    const results = quizResults(answers)
    return (
      <div className="quiz">
        <p className="subhead">Cities that match your answers</p>
        {results.length === 0 && <p className="empty">Nothing matched. Try picking a few more interests.</p>}
        <ol className="quiz-results">
          {results.map((r) => {
            const country = countryByCode[r.city.country]
            const inTrip = tripCityIds.includes(r.city.id)
            return (
              <li key={r.city.id} className="quiz-result">
                <Thumb id={r.city.id} image={r.city.image} emoji={r.city.emoji} alt={r.city.name} className="city-thumb" kind="city" item={r.city} width={120} />
                <div>
                  <h3>
                    {r.city.name} {country.flag}
                  </h3>
                  <p>{explainMatch(r, answers)}</p>
                  <p className="rule">
                    Suggested stay for a {answers.pace || 'balanced'} trip: {stayForPace(r.city, answers.pace)}
                  </p>
                  <div className="gem-actions">
                    <button type="button" className="btn" onClick={() => onViewCity(r.city.id)}>
                      View city
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => onAddCity(r.city.id)} disabled={inTrip}>
                      {inTrip ? '✓ In trip' : '+ Add to trip'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="rule">Matches come from simple points for each answer against the sample city data. It's a starting point, not a verdict.</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setAnswers(START)
            setStep(0)
          }}
        >
          ↺ Start again
        </button>
      </div>
    )
  }

  const q = QUESTIONS[step]
  const value = answers[q.key]
  const choose = (id) => {
    if (q.multi) {
      setAnswers((a) => ({ ...a, interests: a.interests.includes(id) ? a.interests.filter((x) => x !== id) : [...a.interests, id] }))
    } else {
      setAnswers((a) => ({ ...a, [q.key]: id }))
      setStep((s) => s + 1)
    }
  }
  const canContinue = q.multi ? value.length > 0 : Boolean(value)

  return (
    <div className="quiz">
      <p className="quiz-progress">
        Question {step + 1} of {QUESTIONS.length}
      </p>
      <h3 className="quiz-question">{q.title}</h3>
      {q.hint && <p className="rule">{q.hint}</p>}
      <div className="quiz-options" role="group" aria-label={q.title}>
        {q.options.map((o) => {
          const selected = q.multi ? value.includes(o.id) : value === o.id
          return (
            <button key={o.id} type="button" className={`quiz-option${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={() => choose(o.id)}>
              {o.icon && <span aria-hidden="true">{o.icon}</span>} {o.label}
            </button>
          )
        })}
      </div>
      <div className="quiz-nav">
        <button type="button" className="btn" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          ← Back
        </button>
        {(q.multi || value) && (
          <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            {step === QUESTIONS.length - 1 ? 'See matches' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}
