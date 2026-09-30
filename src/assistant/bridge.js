// How the site-wide assistant reaches pages that are open, and how it hands work to pages that aren't
// open yet. Pages register what they offer; requests wait here until the page that handles them mounts.
//
//   open      whether the assistant panel is open
//   builder   { plan, days, weatherByDay, apply } while Build My Europe Trip shows a plan, else null
//   build     preferences waiting for the trip builder to generate from, or null
//   tool      a planner dialog waiting to be opened ('compare', 'quiz', 'surprise'), or null
import { useSyncExternalStore } from 'react'

let state = { open: false, builder: null, build: null, tool: null }
const listeners = new Set()

function set(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// `select` picks the part a component needs, so it only re-renders when that part changes.
const whole = (s) => s
export const useAssistantBridge = (select = whole) => useSyncExternalStore(subscribe, () => select(state), () => select(state))
export const getBridge = () => state

export const setAssistantOpen = (open) => set({ open })
export const setBuilder = (builder) => set({ builder })
export const requestBuild = (input) => set({ build: input })
export const requestTool = (tool) => set({ tool })

// Take (and clear) a waiting request.
export function takeBuild() {
  const input = state.build
  if (input) set({ build: null })
  return input
}
export function takeTool() {
  const tool = state.tool
  if (tool) set({ tool: null })
  return tool
}
