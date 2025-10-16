import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { VaultProvider } from '../vault/VaultContext'
import { Home } from './Home'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
])

export function AppRoutes() {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  )
}
