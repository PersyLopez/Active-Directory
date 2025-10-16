import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { VaultProvider } from '../vault/VaultContext'
import { Home } from './Home'
import { CanvasPage } from './CanvasPage'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/canvas', element: <CanvasPage /> },
])

export function AppRoutes() {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  )
}
