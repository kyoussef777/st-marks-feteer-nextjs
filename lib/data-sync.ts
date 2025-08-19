// Data synchronization utilities for consistent state management
import type { Order } from '@/types';

// Enhanced error types for better error handling
class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Request configuration with proper headers
const getRequestConfig = (method: string = 'GET', body?: unknown) => ({
  method,
  cache: 'no-store' as RequestCache,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    // Add timestamp to prevent caching
    'X-Timestamp': Date.now().toString()
  },
  ...(body && { body: JSON.stringify(body) })
});

// Centralized data fetching functions to ensure consistency
export const dataSync = {
  // Fetch orders with enhanced error handling and retry logic
  async fetchOrders(status?: string, retries: number = 2): Promise<Order[]> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = status ? `/api/orders?status=${status}&t=${Date.now()}` : `/api/orders?t=${Date.now()}`;
        console.log(`Fetching orders from: ${url} (attempt ${attempt + 1})`);
        
        const response = await fetch(url, getRequestConfig());
        
        console.log(`Orders fetch response: ${response.status} ${response.statusText}`);
        
        if (response.status === 401) {
          throw new AuthError('Authentication required. Please log in again.');
        }
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`Orders fetch error: ${response.status} - ${errorText}`);
          throw new NetworkError(`Failed to fetch orders: ${response.status}`, response.status);
        }
        
        const orders = await response.json();
        console.log(`Successfully fetched ${orders.length} orders`);
        
        // Validate the response structure
        if (!Array.isArray(orders)) {
          throw new Error('Invalid response format: expected array of orders');
        }
        
        return orders;
      } catch (error) {
        console.error(`Error fetching orders (attempt ${attempt + 1}):`, error);
        
        // Don't retry auth errors
        if (error instanceof AuthError) {
          throw error;
        }
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return [];
  },

  // Fetch analytics data
  async fetchAnalytics(days: number = 7) {
    try {
      const response = await fetch(`/api/analytics?days=${days}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  },

  // Update order status with enhanced error handling
  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    try {
      console.log(`Updating order ${orderId} status to: ${status}`);
      
      const response = await fetch(`/api/orders/${orderId}`, 
        getRequestConfig('PATCH', { status })
      );
      
      if (response.status === 401) {
        throw new AuthError('Authentication required. Please log in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new NetworkError(`Failed to update order: ${errorData.error}`, response.status);
      }
      
      console.log(`Successfully updated order ${orderId} status`);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Delete order with enhanced error handling
  async deleteOrder(orderId: number): Promise<void> {
    try {
      console.log(`Deleting order ${orderId}`);
      
      const response = await fetch(`/api/orders/${orderId}`, 
        getRequestConfig('DELETE')
      );
      
      if (response.status === 401) {
        throw new AuthError('Authentication required. Please log in again.');
      }
      
      if (response.status === 404) {
        console.warn(`Order ${orderId} not found (may have been already deleted)`);
        return; // Treat as success since the order is gone
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new NetworkError(`Failed to delete order: ${errorData.error}`, response.status);
      }
      
      console.log(`Successfully deleted order ${orderId}`);
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  },

  // Create new order with enhanced validation
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      console.log('Creating new order:', orderData);
      
      const response = await fetch('/api/orders', 
        getRequestConfig('POST', orderData)
      );
      
      if (response.status === 401) {
        throw new AuthError('Authentication required. Please log in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new NetworkError(`Failed to create order: ${errorData.error}`, response.status);
      }
      
      const newOrder = await response.json();
      
      // Validate the created order structure
      if (!newOrder.id || !newOrder.customer_name) {
        throw new Error('Invalid order response: missing required fields');
      }
      
      console.log(`Successfully created order ${newOrder.id}`);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },
  
  // Get order by ID with enhanced error handling
  async getOrderById(orderId: number): Promise<Order> {
    try {
      const response = await fetch(`/api/orders/${orderId}?t=${Date.now()}`, 
        getRequestConfig()
      );
      
      if (response.status === 401) {
        throw new AuthError('Authentication required. Please log in again.');
      }
      
      if (response.status === 404) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      if (!response.ok) {
        throw new NetworkError(`Failed to fetch order: ${response.status}`, response.status);
      }
      
      const order = await response.json();
      
      // Validate order structure
      if (!order.id || !order.customer_name) {
        throw new Error('Invalid order data received');
      }
      
      return order;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw error;
    }
  }
};

// Export error classes for use in components
export { NetworkError, AuthError };

// Consistent refresh intervals
export const REFRESH_INTERVALS = {
  HOME_PAGE: 5000,      // 5 seconds for active order queue
  ORDERS_PAGE: 5000,    // 5 seconds for order management
  ANALYTICS_PAGE: 30000 // 30 seconds for analytics (less frequent)
} as const;

// Auto-refresh hook factory
export function createAutoRefresh(
  fetchFunction: () => Promise<void>,
  interval: number
): () => void {
  let intervalId: NodeJS.Timeout;
  
  const startRefresh = () => {
    // Initial fetch
    fetchFunction();
    
    // Set up interval
    intervalId = setInterval(fetchFunction, interval);
  };
  
  const stopRefresh = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
  
  // Start immediately
  startRefresh();
  
  // Return cleanup function
  return stopRefresh;
}