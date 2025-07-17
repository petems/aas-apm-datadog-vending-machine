import React from 'react';
import { render, screen } from '../../__tests__/helpers';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props (large size, default label)', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('renders with custom message', () => {
    const customMessage = 'Loading subscriptions...';
    render(<LoadingSpinner message={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="small" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size explicitly', () => {
    render(<LoadingSpinner size="large" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('renders with medium size explicitly', () => {
    render(<LoadingSpinner size="medium" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner message="Please wait" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  it('renders with various messages (table test)', () => {
    const messages = [
      'Fetching data...',
      'Please wait',
      '',
      undefined,
    ];
    messages.forEach((msg) => {
      render(<LoadingSpinner message={msg as string} />);
      if (msg) {
        expect(screen.getByText(msg)).toBeInTheDocument();
      }
    });
  });

  it('renders with invalid/edge size values gracefully (no size class)', () => {
    // @ts-expect-error: purposely passing invalid size
    render(<LoadingSpinner size="giant" />);
    const spinner = screen.getByRole('status');
    // Should not have any w- or h- class
    expect(spinner.className).not.toMatch(/w-\d+/);
    expect(spinner.className).not.toMatch(/h-\d+/);
  });
});