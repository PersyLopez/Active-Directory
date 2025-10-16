import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { VaultProvider } from '../vault/VaultContext'
import { Home } from './Home'
import { CanvasPage } from './CanvasPage'
import { PageMode } from './PageMode'
import { GraphPage } from './GraphPage'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/canvas', element: <CanvasPage /> },
  { path: '/pages', element: <PageMode /> },
  { path: '/graph', element: <GraphPage /> },
])

export function AppRoutes() {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  )
}
