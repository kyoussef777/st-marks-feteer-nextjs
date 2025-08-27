import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary, { ErrorDisplay } from '../../app/components/ErrorBoundary';

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
    expect(screen.getByText('حدث خطأ غير متوقع. يرجى تحديث الصفحة.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again / إعادة المحاولة' })).toBeInTheDocument();
  });

  it('can recover from error when Try Again is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click Try Again button
    const tryAgainButton = screen.getByRole('button', { name: 'Try Again / إعادة المحاولة' });
    await user.click(tryAgainButton);
    
    // After clicking Try Again, the error state should be reset
    // But since the component still throws, it should show error again
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays custom fallback when provided', () => {
    const customFallback = (
      <div>
        <p>Custom fallback error</p>
        <button>Reset</button>
      </div>
    );
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom fallback error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
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
    
    const dismissButton = screen.getByRole('button', { name: '✕' });
    expect(dismissButton).toBeInTheDocument();
    
    await user.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('renders with retry button when onRetry is provided', async () => {
    const user = userEvent.setup();
    const mockRetry = jest.fn();
    
    render(<ErrorDisplay error="Test error" onRetry={mockRetry} />);
    
    const retryButton = screen.getByRole('button', { name: 'Retry' });
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
    
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: '✕' }));
    expect(mockDismiss).toHaveBeenCalled();
    
    await user.click(screen.getByRole('button', { name: 'Retry' }));
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
    
    expect(screen.getByText('حدث خطأ')).toBeInTheDocument();
  });
});