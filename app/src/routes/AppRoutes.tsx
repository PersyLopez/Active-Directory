import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { VaultProvider } from '../vault/VaultContext'
import { lazy, Suspense } from 'react'
import { Home } from './Home'
const CanvasPage = lazy(() => import('./CanvasPage').then(m => ({ default: m.CanvasPage })))
const PageMode = lazy(() => import('./PageMode').then(m => ({ default: m.PageMode })))
const GraphPage = lazy(() => import('./GraphPage').then(m => ({ default: m.GraphPage })))
const QuizPage = lazy(() => import('./QuizPage').then(m => ({ default: m.QuizPage })))
const StudyPage = lazy(() => import('./StudyPage').then(m => ({ default: m.StudyPage })))

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/canvas', element: <Suspense fallback={null}><CanvasPage /></Suspense> },
  { path: '/pages', element: <Suspense fallback={null}><PageMode /></Suspense> },
  { path: '/graph', element: <Suspense fallback={null}><GraphPage /></Suspense> },
  { path: '/quiz', element: <Suspense fallback={null}><QuizPage /></Suspense> },
  { path: '/study', element: <Suspense fallback={null}><StudyPage /></Suspense> },
])

export function AppRoutes() {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  )
}
