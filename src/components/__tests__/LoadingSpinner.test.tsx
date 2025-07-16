import React from 'react';
import { render, screen } from '../../__tests__/helpers';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('should render with custom message', () => {
    const customMessage = 'Loading subscriptions...';
    render(<LoadingSpinner message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should render with small size', () => {
    render(<LoadingSpinner size="small" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('should render with large size by default', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('should have proper accessibility attributes', () => {
    render(<LoadingSpinner message="Please wait" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });
}); 