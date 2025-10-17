import type { PropsWithChildren } from 'react'
import { isFeatureEnabled } from './FeatureFlags'

export function FeatureGate({ name, children }: PropsWithChildren<{ name: string }>) {
  if (!isFeatureEnabled(name)) return null
  return <>{children}</>
}
