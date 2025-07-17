
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DatadogAPMForm from '../DatadogAPMForm';

describe('DatadogAPMForm', () => {
  test('renders form fields', () => {
    render(<DatadogAPMForm />);
    expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
  });

  test('submits with valid input', () => {
    render(<DatadogAPMForm />);
    fireEvent.change(screen.getByLabelText(/service name/i), { target: { value: 'my-service' } });
    fireEvent.change(screen.getByLabelText(/environment/i), { target: { value: 'production' } });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });
});
