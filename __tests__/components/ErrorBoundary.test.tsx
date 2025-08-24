import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorDisplay } from '../../app/components/ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
  let consoleSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    // Suppress console.error during tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('حدث خطأ ما')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('can recover from error when Try Again is clicked', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click Try Again button
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
    await user.click(tryAgainButton);
    
    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    const CustomFallback = ({ error, resetError }: any) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={resetError}>Reset</button>
      </div>
    );
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error caught by boundary:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});

describe('ErrorDisplay Component', () => {
  it('renders error message correctly', () => {
    render(<ErrorDisplay error="Test error message" />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders with dismiss button when onDismiss is provided', async () => {
    const user = userEvent.setup();
    const mockDismiss = jest.fn();
    
    render(<ErrorDisplay error="Test error" onDismiss={mockDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: '×' });
    expect(dismissButton).toBeInTheDocument();
    
    await user.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('renders with retry button when onRetry is provided', async () => {
    const user = userEvent.setup();
    const mockRetry = jest.fn();
    
    render(<ErrorDisplay error="Test error" onRetry={mockRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    expect(retryButton).toBeInTheDocument();
    
    await user.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });

  it('renders with both dismiss and retry buttons', async () => {
    const user = userEvent.setup();
    const mockDismiss = jest.fn();
    const mockRetry = jest.fn();
    
    render(
      <ErrorDisplay 
        error="Test error" 
        onDismiss={mockDismiss}
        onRetry={mockRetry}
      />
    );
    
    expect(screen.getByRole('button', { name: '×' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: '×' }));
    expect(mockDismiss).toHaveBeenCalled();
    
    await user.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorDisplay error="Test error" className="custom-error-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-error-class');
  });

  it('displays Arabic text when available', () => {
    render(<ErrorDisplay error="Network error" />);
    
    expect(screen.getByText('خطأ في الشبكة')).toBeInTheDocument();
  });
});