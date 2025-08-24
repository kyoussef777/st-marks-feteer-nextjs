import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock the database and auth
jest.mock('../../lib/database-hybrid', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orders: {},
}));

jest.mock('../../lib/middleware-auth', () => ({
  isAuthenticated: jest.fn(),
}));

// Helper function to create mock requests
function createMockRequest(method: string, body?: any, url = 'http://localhost:3000/api/orders') {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'auth-token=mock-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/orders', () => {
  let mockIsAuthenticated: jest.MockedFunction<any>;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { isAuthenticated } = require('../../lib/middleware-auth');
    const { db } = require('../../lib/database-hybrid');
    
    mockIsAuthenticated = isAuthenticated as jest.MockedFunction<any>;
    mockDb = db;

    // Default to authenticated
    mockIsAuthenticated.mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'admin',
      isAuthenticated: true,
    });
  });

  describe('GET /api/orders', () => {
    it('should return orders for authenticated users', async () => {
      const mockOrders = [
        {
          id: 1,
          customer_name: 'Test Customer',
          item_type: 'feteer',
          status: 'ordered',
          price: 15.50,
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      const { GET } = await import('../../app/api/orders/route');
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOrders);
    });

    it('should return 401 for unauthenticated users', async () => {
      mockIsAuthenticated.mockResolvedValue(null);

      const { GET } = await import('../../app/api/orders/route');
      const request = createMockRequest('GET');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const { GET } = await import('../../app/api/orders/route');
      const request = createMockRequest('GET');
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order with valid data', async () => {
      const orderData = {
        customer_name: 'New Customer',
        item_type: 'feteer',
        feteer_type: 'Cheese',
        has_cheese: true,
        extra_nutella: false,
        price: 15.50,
        status: 'ordered',
      };

      const mockNewOrder = { id: 1, ...orderData, created_at: new Date() };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNewOrder]),
        }),
      });

      const { POST } = await import('../../app/api/orders/route');
      const request = createMockRequest('POST', orderData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.customer_name).toBe(orderData.customer_name);
    });

    it('should create sweet order with default customer name', async () => {
      const orderData = {
        customer_name: '',
        item_type: 'sweet',
        sweet_type: 'Baklava',
        price: 8.00,
        status: 'completed',
      };

      const mockNewOrder = { 
        id: 1, 
        ...orderData, 
        customer_name: 'Sweet Customer',
        created_at: new Date(),
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockNewOrder]),
        }),
      });

      const { POST } = await import('../../app/api/orders/route');
      const request = createMockRequest('POST', orderData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.customer_name).toBe('Sweet Customer');
      expect(data.status).toBe('completed');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        customer_name: '',
        item_type: 'feteer', // Missing required feteer_type
        price: 'invalid', // Invalid price type
      };

      const { POST } = await import('../../app/api/orders/route');
      const request = createMockRequest('POST', invalidData);
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthenticated users', async () => {
      mockIsAuthenticated.mockResolvedValue(null);

      const { POST } = await import('../../app/api/orders/route');
      const request = createMockRequest('POST', { customer_name: 'Test' });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });
});