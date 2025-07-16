import React from 'react';
import { render, screen, fireEvent } from '../../__tests__/helpers';
import ErrorAlert from '../ErrorAlert';

describe('ErrorAlert', () => {
  const mockOnDismiss = jest.fn();
  const errorMessage = 'Something went wrong!';

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('should render error message', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should call onDismiss when close button is clicked', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should have proper accessibility attributes', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('should render close button with proper accessibility label', () => {
    render(<ErrorAlert message={errorMessage} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Dismiss error');
  });
}); 