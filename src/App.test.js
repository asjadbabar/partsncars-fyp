import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  Routes: ({ children }) => children,
  Route: ({ path, element }) => path === '/Login' ? element : null,
  Link: ({ children }) => children,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/Login' }),
  useParams: () => ({}),
}), { virtual: true });

jest.mock('jspdf', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('jspdf-autotable', () => ({ __esModule: true, default: jest.fn() }));

import App from './App';

test('renders the PartsNCars sign-in page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /sign in to partsncars/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
});
