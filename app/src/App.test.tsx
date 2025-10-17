import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

it('increments counter on click', () => {
  render(<App />)
  const button = screen.getByRole('button', { name: /count is/i })
  fireEvent.click(button)
  expect(button).toHaveTextContent(/count is 1/i)
})
