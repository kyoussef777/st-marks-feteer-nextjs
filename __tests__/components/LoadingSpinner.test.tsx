import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import LoadingSpinner, { ButtonSpinner } from '../../app/components/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Custom loading message" />);
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders with Arabic message', () => {
    render(<LoadingSpinner messageAr="جاري التحميل..." />);
    
    expect(screen.getByText('جاري التحميل...')).toBeInTheDocument();
  });

  it('renders with both English and Arabic messages', () => {
    render(<LoadingSpinner message="Loading data" messageAr="جاري تحميل البيانات" />);
    
    expect(screen.getByText('Loading data')).toBeInTheDocument();
    expect(screen.getByText('جاري تحميل البيانات')).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { container: smallContainer } = render(<LoadingSpinner size="sm" />);
    expect(smallContainer.querySelector('.w-4')).toBeInTheDocument();

    const { container: mediumContainer } = render(<LoadingSpinner size="md" />);
    expect(mediumContainer.querySelector('.w-6')).toBeInTheDocument();

    const { container: largeContainer } = render(<LoadingSpinner size="lg" />);
    expect(largeContainer.querySelector('.w-8')).toBeInTheDocument();

    const { container: extraLargeContainer } = render(<LoadingSpinner size="xl" />);
    expect(extraLargeContainer.querySelector('.w-12')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders only message when specified', () => {
    render(<LoadingSpinner message="Only message" showSpinner={false} />);
    
    expect(screen.getByText('Only message')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('ButtonSpinner Component', () => {
  it('renders with default props', () => {
    const { container } = render(<ButtonSpinner />);
    
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(container.querySelector('.w-4')).toBeInTheDocument();
    expect(container.querySelector('.h-4')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ButtonSpinner className="w-6 h-6" />);
    
    expect(container.firstChild).toHaveClass('w-6');
    expect(container.firstChild).toHaveClass('h-6');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<ButtonSpinner />);
    
    const spinner = container.firstChild as HTMLElement;
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders SVG with correct structure', () => {
    const { container } = render(<ButtonSpinner />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
  });
});