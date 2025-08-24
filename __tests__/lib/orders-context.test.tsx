import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act, waitFor } from '@testing-library/react';
import { OrdersProvider, useOrders } from '../../lib/orders-context';

// Mock fetch
global.fetch = jest.fn();

// Mock navigation
const mockPush = jest.fn();
const mockPathname = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => mockPathname(),
}));

// Test component to use the context
const TestComponent = () => {
  const {
    orderedOrders,
    allOrders,
    loading,
    error,
    isOnline,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    refreshOrders,
    invalidateCache,
  } = useOrders();

  return (
    <div>
      <div data-testid="ordered-orders-count">{orderedOrders.length}</div>
      <div data-testid="all-orders-count">{allOrders.length}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="online">{isOnline.toString()}</div>
      <button onClick={() => createOrder({ customer_name: 'Test', item_type: 'feteer' })}>
        Create Order
      </button>
      <button onClick={() => updateOrderStatus(1, 'completed')}>
        Update Order
      </button>
      <button onClick={() => deleteOrder(1)}>
        Delete Order
      </button>
      <button onClick={refreshOrders}>
        Refresh
      </button>
      <button onClick={invalidateCache}>
        Invalidate Cache
      </button>
    </div>
  );
};

const mockOrders = [
  {
    id: 1,
    customer_name: 'Test Customer',
    item_type: 'feteer',
    status: 'ordered',
    price: 15.50,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    customer_name: 'Sweet Customer',
    item_type: 'sweet',
    status: 'completed',
    price: 8.00,
    created_at: '2024-01-01T11:00:00Z',
  },
];

describe('OrdersContext', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockPathname.mockReturnValue('/');

    // Mock successful fetch by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOrders,
    } as Response);

    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('provides initial state correctly', async () => {
    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('all-orders-count')).toHaveTextContent('2');
    expect(screen.getByTestId('ordered-orders-count')).toHaveTextContent('1'); // Only ordered status
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('online')).toHaveTextContent('true');
  });

  it('handles fetch errors correctly', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to load orders');
  });

  it('detects offline status', async () => {
    // Mock offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('false');
    });
  });

  it('creates new orders correctly', async () => {
    const newOrder = {
      id: 3,
      customer_name: 'New Customer',
      item_type: 'feteer',
      status: 'ordered',
      price: 20.00,
      created_at: '2024-01-01T12:00:00Z',
    };

    // Mock successful order creation
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newOrder,
      } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Create Order').click();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: 'Test', item_type: 'feteer' }),
    });
  });

  it('updates order status correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockOrders[0], status: 'completed' }),
      } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Update Order').click();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
  });

  it('deletes orders correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
      } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByText('Delete Order').click();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/orders/1', {
      method: 'DELETE',
    });
  });

  it('refreshes orders correctly', async () => {
    const updatedOrders = [...mockOrders, {
      id: 3,
      customer_name: 'New Order',
      item_type: 'sweet',
      status: 'ordered',
      price: 10.00,
      created_at: '2024-01-01T13:00:00Z',
    }];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrders,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedOrders,
      } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('all-orders-count')).toHaveTextContent('2');
    });

    await act(async () => {
      screen.getByText('Refresh').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('all-orders-count')).toHaveTextContent('3');
    });
  });

  it('invalidates cache and refetches on navigation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOrders,
    } as Response);

    const { rerender } = render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Simulate navigation change
    mockPathname.mockReturnValue('/different-page');
    
    rerender(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    // Should refetch due to navigation change
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + navigation refetch
    });
  });

  it('handles cache invalidation correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOrders,
    } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    // Clear mock calls from initial load
    mockFetch.mockClear();

    await act(async () => {
      screen.getByText('Invalidate Cache').click();
    });

    // Should trigger a refetch
    expect(mockFetch).toHaveBeenCalledWith('/api/orders');
  });

  it('filters ordered orders correctly', async () => {
    const mixedOrders = [
      { ...mockOrders[0], status: 'ordered' },
      { ...mockOrders[1], status: 'completed' },
      { id: 3, customer_name: 'Test', item_type: 'feteer', status: 'ordered', price: 10, created_at: '2024-01-01T12:00:00Z' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mixedOrders,
    } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('all-orders-count')).toHaveTextContent('3');
      expect(screen.getByTestId('ordered-orders-count')).toHaveTextContent('2'); // Only 'ordered' status
    });
  });

  it('handles 401 errors with redirect', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('handles network errors appropriately', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    render(
      <OrdersProvider>
        <TestComponent />
      </OrdersProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error. Please check your connection.');
    });
  });
});