export type FeatureFlags = Record<string, boolean>

const DEFAULT_FLAGS: FeatureFlags = {
  'experimental-canvas': false,
  'experimental-graph': false,
}

let flags: FeatureFlags = { ...DEFAULT_FLAGS }

export function setFeatureFlags(overrides: Partial<FeatureFlags>): void {
  const next: FeatureFlags = { ...flags }
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'boolean') next[key] = value
  }
  flags = next
}

export function isFeatureEnabled(name: keyof FeatureFlags | string): boolean {
  return Boolean(flags[name as string])
}
