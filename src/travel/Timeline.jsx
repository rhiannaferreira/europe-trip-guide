// Today's plan as a vertical timeline. Each stop says in words whether it's done, now, skipped or still to
// come (not only by colour); done ones fold down but stay. Done and Skip are one tap; the rest (move, edit
// the time, open the place, ask the copilot) is in the stop's sheet.
import { track } from '../lib/analytics.js'
import { markDone } from './travelActions.js'
import { hm } from './travelModel.js'
import { modeLabel } from './ui.jsx'

const STATE = {
  done: { icon: '✓', word: 'Done' },
  skipped: { icon: '⤼', word: 'Skipped' },
  current: { icon: '●', word: 'Now' },
  earlier: { icon: '○', word: 'Earlier, not marked' },
  upcoming: { icon: '○', word: 'Upcoming' },
}

export default function Timeline({ env }) {
  const { schedule, day, change, canMark, readOnly, openActivity, openSkip } = env
  const rows = []
  for (const e of schedule.entries) {
    const lunch = schedule.lunch.find((l) => e.start === l.end && e.timeSource === 'suggested')
    if (lunch) rows.push({ kind: 'lunch', id: `lunch-${lunch.start}`, start: lunch.start })
    rows.push(e)
  }
  if (day.leg && schedule.entries.some((e) => e.part === 'before')) {
    const i = rows.findIndex((r) => r.part === 'before')
    rows.splice(i, 0, { kind: 'label', id: 'before', text: 'Before the train' })
  }
  if (day.leg && schedule.entries.some((e) => e.part === 'after')) {
    const i = rows.findIndex((r) => r.part === 'after')
    rows.splice(i, 0, { kind: 'label', id: 'after', text: 'After arriving' })
  }

  const done = (e, on) => {
    change((t) => markDone(t, day.number, e.id, on))
    if (on) track('activity_completed', { today: env.isToday })
  }

  return (
    <ol className="tm-timeline">
      {rows.map((r) => {
        if (r.kind === 'label') return <li key={r.id} className="tm-tl-label">{r.text}</li>
        if (r.kind === 'lunch') {
          return (
            <li key={r.id} className="tm-tl tm-tl-break">
              <span className="tm-tl-time">{hm(r.start)}</span>
              <div className="tm-tl-body">
                <span className="tm-muted">Lunch break (suggested)</span>
              </div>
            </li>
          )
        }
        const s = STATE[r.state]
        if (r.kind === 'journey') {
          return (
            <li key={r.id} className={`tm-tl tm-tl-journey tm-${r.state}`}>
              <span className="tm-tl-time">{r.start != null ? hm(r.start) : '—'}</span>
              <div className="tm-tl-body">
                <strong>
                  {modeLabel(r.leg.mode)} to {r.leg.to.name}
                </strong>
                <span className="tm-muted">{r.start != null ? `arrives about ${hm(r.end)}` : 'set your departure time above'}</span>
              </div>
            </li>
          )
        }
        const p = r.place
        const settled = r.state === 'done' || r.state === 'skipped'
        return (
          <li key={r.id} className={`tm-tl tm-${r.state}`}>
            <span className="tm-tl-time">
              {r.start != null ? hm(r.start) : '—'}
              {r.timeSource === 'suggested' && <span className="tm-tl-sub">suggested</span>}
            </span>
            <div className="tm-tl-body">
              <button type="button" className="tm-tl-name" onClick={() => openActivity(r, 'details')}>
                {p.name}
              </button>
              <span className={`tm-state tm-state-${r.state}`}>
                <span aria-hidden="true">{s.icon}</span> {s.word}
              </span>
              {!readOnly && (
                <div className="tm-tl-actions">
                  {canMark && r.state !== 'done' && (
                    <button type="button" className="btn tm-btn-sm tm-done-btn" onClick={() => done(r, true)} aria-label={`Mark ${p.name} done`}>
                      ✓ Done
                    </button>
                  )}
                  {canMark && r.state === 'done' && (
                    <button type="button" className="link-btn tm-undo" onClick={() => done(r, false)} aria-label={`Undo done for ${p.name}`}>
                      Undo
                    </button>
                  )}
                  {!settled && (
                    <button type="button" className="btn tm-btn-sm" onClick={() => openSkip(r)} aria-label={`Skip ${p.name}`}>
                      Skip
                    </button>
                  )}
                  <button type="button" className="btn tm-btn-sm" onClick={() => openActivity(r, 'change')} aria-label={`Edit, move or ask about ${p.name}`}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
