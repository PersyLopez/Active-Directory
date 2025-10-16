import { isFeatureEnabled, setFeatureFlags } from './FeatureFlags'

it('feature flags default to false', () => {
  expect(isFeatureEnabled('experimental-canvas')).toBe(false)
})

it('allows enabling a flag at runtime', () => {
  setFeatureFlags({ 'experimental-canvas': true })
  expect(isFeatureEnabled('experimental-canvas')).toBe(true)
})
