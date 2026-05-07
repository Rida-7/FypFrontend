import { render, screen } from '@testing-library/react'
import SignIn from '../pages/SignIn'
import { MemoryRouter } from 'react-router-dom'

test('renders sign in form', () => {
  render(<MemoryRouter><SignIn /></MemoryRouter>)
  expect(screen.getByText(/Sign in to AutoDocGen/i)).toBeInTheDocument()
})
