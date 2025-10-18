export type ReviewState = {
  intervalMs: number
  easeFactor: number
  repetitions: number
  dueAt: number
}

export type ProgressStore = Record<string, ReviewState>

const STORAGE_KEY = 'srs_progress_v1'

function now(): number {
  return Date.now()
}

export function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressStore
  } catch {
    return {}
  }
}

export function saveProgress(store: ProgressStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getState(cardId: string, store: ProgressStore): ReviewState {
  return (
    store[cardId] ?? {
      intervalMs: 0,
      easeFactor: 2.5,
      repetitions: 0,
      dueAt: 0,
    }
  )
}

function computeNext(state: ReviewState, grade: 1 | 2 | 3 | 4): ReviewState {
  let { intervalMs, easeFactor, repetitions } = state
  const minutes = (m: number) => m * 60 * 1000
  const days = (d: number) => d * 24 * 60 * 60 * 1000

  if (grade < 3) {
    // Again/Hard -> quick retry
    repetitions = 0
    intervalMs = minutes(10)
  } else {
    repetitions += 1
    if (repetitions === 1) intervalMs = days(1)
    else if (repetitions === 2) intervalMs = days(6)
    else intervalMs = Math.round(intervalMs * easeFactor)
    // SM-2 ease update
    easeFactor = easeFactor + (0.1 - (4 - grade) * (0.08 + (4 - grade) * 0.02))
    if (easeFactor < 1.3) easeFactor = 1.3
  }

  return {
    intervalMs,
    easeFactor,
    repetitions,
    dueAt: now() + intervalMs,
  }
}

export function review(cardId: string, grade: 1 | 2 | 3 | 4, store: ProgressStore): ProgressStore {
  const current = getState(cardId, store)
  const next = computeNext(current, grade)
  return { ...store, [cardId]: next }
}

export function getDueCards(cardIds: string[], store: ProgressStore): string[] {
  const t = now()
  return cardIds.filter(id => getState(id, store).dueAt <= t)
}
