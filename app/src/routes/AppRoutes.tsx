import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { VaultProvider } from '../vault/VaultContext'
import { Home } from './Home'
import { CanvasPage } from './CanvasPage'
import { PageMode } from './PageMode'
import { GraphPage } from './GraphPage'
import { QuizPage } from './QuizPage'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/canvas', element: <CanvasPage /> },
  { path: '/pages', element: <PageMode /> },
  { path: '/graph', element: <GraphPage /> },
  { path: '/quiz', element: <QuizPage /> },
])

export function AppRoutes() {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  )
}
