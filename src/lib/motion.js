// Map movements respect "reduce motion": the map jumps straight to the new view instead of flying.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const motion = (options = {}) => (reduced() ? { ...options, animate: false } : options)
