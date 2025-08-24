import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrdersList from '../../app/components/OrdersList';

// Mock the orders context
const mockUseOrders = {
  updateOrderStatus: jest.fn(),
  deleteOrder: jest.fn(),
  refreshOrders: jest.fn(),
};

jest.mock('../../lib/orders-context', () => ({
  useOrders: () => mockUseOrders,
}));

// Mock window methods
const mockWindowOpen = jest.fn();
const mockWindowFocus = jest.fn();
const mockConfirm = jest.fn();
const mockAlert = jest.fn();

Object.assign(window, {
  open: mockWindowOpen,
  focus: mockWindowFocus,
  confirm: mockConfirm,
  alert: mockAlert,
});

// Mock fetch
global.fetch = jest.fn();

const mockOrders = [
  {
    id: 1,
    customer_name: 'Test Customer',
    item_type: 'feteer' as const,
    feteer_type: 'Cheese',
    sweet_type: undefined,
    sweet_selections: undefined,
    meat_selection: undefined,
    has_cheese: true,
    extra_nutella: false,
    notes: 'Extra crispy',
    status: 'ordered' as const,
    price: 15.50,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    customer_name: 'Sweet Customer',
    item_type: 'sweet' as const,
    feteer_type: undefined,
    sweet_type: 'Baklava',
    sweet_selections: undefined,
    meat_selection: undefined,
    has_cheese: false,
    extra_nutella: false,
    notes: undefined,
    status: 'completed' as const,
    price: 8.00,
    created_at: '2024-01-01T11:00:00Z',
  },
];

describe('OrdersList Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup();
    mockConfirm.mockReturnValue(true);
    
    // Mock successful fetch for print label check
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  it('renders orders list correctly', () => {
    render(<OrdersList orders={mockOrders} />);
    
    expect(screen.getByText('Active Orders (2)')).toBeInTheDocument();
    expect(screen.getByText('#1 - Test Customer')).toBeInTheDocument();
    expect(screen.getByText('#2 - Sweet Customer')).toBeInTheDocument();
    expect(screen.getByText('Cheese')).toBeInTheDocument();
    expect(screen.getByText('Baklava')).toBeInTheDocument();
  });

  it('displays correct status colors', () => {
    render(<OrdersList orders={mockOrders} />);
    
    const orderedStatus = screen.getByText('ORDERED');
    const completedStatus = screen.getByText('COMPLETED');
    
    expect(orderedStatus).toHaveClass('text-blue-800');
    expect(completedStatus).toHaveClass('text-green-800');
  });

  it('shows empty state when no orders', () => {
    render(<OrdersList orders={[]} />);
    
    expect(screen.getByText('No Active Orders')).toBeInTheDocument();
    expect(screen.getByText('All orders completed!')).toBeInTheDocument();
    expect(screen.getByText('تم الانتهاء من جميع الطلبات!')).toBeInTheDocument();
  });

  it('handles order status update', async () => {
    mockUseOrders.updateOrderStatus.mockResolvedValue(undefined);
    
    render(<OrdersList orders={mockOrders} />);
    
    const completeButton = screen.getByRole('button', { name: /Mark Complete/i });
    await user.click(completeButton);
    
    expect(mockUseOrders.updateOrderStatus).toHaveBeenCalledWith(1, 'completed');
  });

  it('handles order deletion with confirmation', async () => {
    mockUseOrders.deleteOrder.mockResolvedValue(undefined);
    mockConfirm.mockReturnValue(true);
    
    render(<OrdersList orders={mockOrders} />);
    
    const deleteButtons = screen.getAllByText('🗑️');
    await user.click(deleteButtons[0]);
    
    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this order?');
    expect(mockUseOrders.deleteOrder).toHaveBeenCalledWith(1);
  });

  it('cancels deletion when user declines confirmation', async () => {
    mockConfirm.mockReturnValue(false);
    
    render(<OrdersList orders={mockOrders} />);
    
    const deleteButtons = screen.getAllByText('🗑️');
    await user.click(deleteButtons[0]);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockUseOrders.deleteOrder).not.toHaveBeenCalled();
  });

  it('handles print label for feteer orders', async () => {
    const mockPrintWindow = {
      print: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      onload: null as any,
    };
    
    mockWindowOpen.mockReturnValue(mockPrintWindow);
    
    render(<OrdersList orders={mockOrders} />);
    
    const printButton = screen.getByRole('button', { name: /Print/i });
    await user.click(printButton);
    
    expect(global.fetch).toHaveBeenCalledWith('/api/orders/1');
    expect(mockWindowOpen).toHaveBeenCalledWith(
      '/api/orders/1/label',
      '_blank',
      'width=800,height=600'
    );
  });

  it('shows print button only for feteer orders', () => {
    render(<OrdersList orders={mockOrders} />);
    
    // Should have one print button for the feteer order
    const printButtons = screen.getAllByText('🖨️ Print');
    expect(printButtons).toHaveLength(1);
    
    // Sweet order should not have print button
    const sweetOrderCard = screen.getByText('#2 - Sweet Customer').closest('.bg-white');
    expect(sweetOrderCard).not.toContain(screen.queryByText('🖨️ Print'));
  });

  it('handles refresh button click', async () => {
    mockUseOrders.refreshOrders.mockResolvedValue(undefined);
    
    render(<OrdersList orders={mockOrders} />);
    
    const refreshButton = screen.getByRole('button', { name: '🔄' });
    await user.click(refreshButton);
    
    expect(mockUseOrders.refreshOrders).toHaveBeenCalled();
  });

  it('displays loading states during actions', async () => {
    // Mock a delayed response
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockUseOrders.updateOrderStatus.mockReturnValue(updatePromise);
    
    render(<OrdersList orders={mockOrders} />);
    
    const completeButton = screen.getByRole('button', { name: /Mark Complete/i });
    await user.click(completeButton);
    
    // Should show loading state
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByText('جاري التحديث...')).toBeInTheDocument();
    
    // Resolve the promise
    resolveUpdate!();
    await waitFor(() => {
      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });

  it('formats time correctly', () => {
    const recentOrder = {
      ...mockOrders[0],
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    };
    
    render(<OrdersList orders={[recentOrder]} />);
    
    expect(screen.getByText('30m ago')).toBeInTheDocument();
  });

  it('displays mixed meat selections correctly', () => {
    const mixedMeatOrder = {
      ...mockOrders[0],
      feteer_type: 'Mixed Meat',
      meat_selection: 'Chicken,Beef',
    };
    
    render(<OrdersList orders={[mixedMeatOrder]} />);
    
    expect(screen.getByText('Mixed Meat')).toBeInTheDocument();
    expect(screen.getByText('🥩 Chicken, Beef')).toBeInTheDocument();
    expect(screen.getByText('✓ Cheese')).toBeInTheDocument();
  });

  it('displays sweet selections from JSON string', () => {
    const sweetOrder = {
      ...mockOrders[1],
      sweet_selections: '{"Baklava": 2, "Knafeh": 1}',
    };
    
    render(<OrdersList orders={[sweetOrder]} />);
    
    expect(screen.getByText('Baklava (2), Knafeh (1)')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    const errorMessage = 'Network error. Please check your connection and try again.';
    mockUseOrders.updateOrderStatus.mockRejectedValue(new Error(errorMessage));
    
    render(<OrdersList orders={mockOrders} />);
    
    const completeButton = screen.getByRole('button', { name: /Mark Complete/i });
    await user.click(completeButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});