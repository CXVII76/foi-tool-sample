import { render, screen } from '@testing-library/react';
import App from '../src/App';  // ← Now from tests/ → src/
import '@testing-library/jest-dom';

test('renders FOI title', () => {
  render(<App />);
  const title = screen.getByText(/FOI Redaction Tool/i);
  expect(title).toBeInTheDocument();
});