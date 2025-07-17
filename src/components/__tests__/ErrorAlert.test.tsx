import React from 'react';
import { render, screen, fireEvent } from '../../test-helpers';
import ErrorAlert from '../ErrorAlert';

describe('ErrorAlert', () => {
  const mockOnDismiss = jest.fn();
  const errorMessage = 'Something went wrong!';

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('renders error message and alert role', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders close button with proper accessibility label', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Dismiss error');
  });

  it('renders with different error messages (table test)', () => {
    const messages = [
      'Network error occurred',
      'Invalid credentials',
      'Unexpected error: 500',
      '',
      undefined,
    ];
    messages.forEach(msg => {
      render(<ErrorAlert message={msg as string} onDismiss={mockOnDismiss} />);
      if (msg) {
        expect(screen.getByText(msg)).toBeInTheDocument();
      }
    });
  });

  it('does not render close button when onDismiss is missing', () => {
    render(<ErrorAlert message="Error" onDismiss={undefined as any} />);
    // The close button should not be in the document
    const closeButton = screen.queryByRole('button', { name: /dismiss/i });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('is accessible via keyboard', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    closeButton.focus();
    expect(closeButton).toHaveFocus();
    // fireEvent.keyDown does not trigger onClick in jsdom; use click to simulate activation
    fireEvent.click(closeButton);
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});
