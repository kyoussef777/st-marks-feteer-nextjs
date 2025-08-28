import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('../../lib/database-neon', () => ({
  db: {
    select: jest.fn(),
  },
  orders: {},
}));

jest.mock('../../lib/middleware-auth', () => ({
  isAuthenticated: jest.fn(),
}));

function createMockRequest(url = 'http://localhost:3000/api/analytics?days=7') {
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Cookie': 'auth-token=mock-token',
    },
  });
}

describe('/api/analytics', () => {
  let mockIsAuthenticated: jest.MockedFunction<any>;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { isAuthenticated } = require('../../lib/middleware-auth');
    const { db } = require('../../lib/database-hybrid');
    
    mockIsAuthenticated = isAuthenticated as jest.MockedFunction<any>;
    mockDb = db;

    mockIsAuthenticated.mockResolvedValue({
      id: 1,
      username: 'admin',
      role: 'admin',
      isAuthenticated: true,
    });
  });

  it('should return analytics data for authenticated users', async () => {
    const mockOrders = [
      {
        id: 1,
        item_type: 'feteer',
        price: 15.50,
        status: 'completed',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        id: 2,
        item_type: 'sweet',
        price: 8.00,
        status: 'completed',
        created_at: '2024-01-02T11:00:00Z',
      },
      {
        id: 3,
        item_type: 'feteer',
        price: 18.00,
        status: 'ordered',
        created_at: '2024-01-03T12:00:00Z',
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(mockOrders),
      }),
    });

    const { GET } = await import('../../app/api/analytics/route');
    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalRevenue');
    expect(data).toHaveProperty('feteerRevenue');
    expect(data).toHaveProperty('sweetRevenue');
    expect(data).toHaveProperty('totalOrders');
    expect(data).toHaveProperty('feteerOrders');
    expect(data).toHaveProperty('sweetOrders');
    expect(data).toHaveProperty('completedOrders');
    expect(data).toHaveProperty('averageOrderValue');
    expect(data).toHaveProperty('dailyStats');

    // Test calculated values
    expect(data.totalOrders).toBe(3);
    expect(data.feteerOrders).toBe(2);
    expect(data.sweetOrders).toBe(1);
    expect(data.completedOrders).toBe(2);
    expect(data.totalRevenue).toBe(41.50);
    expect(data.feteerRevenue).toBe(33.50);
    expect(data.sweetRevenue).toBe(8.00);
  });

  it('should handle different time periods', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const { GET } = await import('../../app/api/analytics/route');
    
    // Test 30 days
    const request30 = createMockRequest('http://localhost:3000/api/analytics?days=30');
    const response30 = await GET(request30);
    const data30 = await response30.json();

    expect(response30.status).toBe(200);
    expect(data30.dailyStats).toHaveLength(30);

    // Test 1 day
    const request1 = createMockRequest('http://localhost:3000/api/analytics?days=1');
    const response1 = await GET(request1);
    const data1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(data1.dailyStats).toHaveLength(1);
  });

  it('should return 401 for unauthenticated users', async () => {
    mockIsAuthenticated.mockResolvedValue(null);

    const { GET } = await import('../../app/api/analytics/route');
    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should handle database errors', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    const { GET } = await import('../../app/api/analytics/route');
    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  it('should calculate daily stats correctly', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const mockOrders = [
      {
        id: 1,
        item_type: 'feteer',
        price: 15.50,
        status: 'completed',
        created_at: `${today}T10:00:00Z`,
      },
      {
        id: 2,
        item_type: 'sweet',
        price: 8.00,
        status: 'completed',
        created_at: `${today}T11:00:00Z`,
      },
      {
        id: 3,
        item_type: 'feteer',
        price: 18.00,
        status: 'completed',
        created_at: `${yesterday}T12:00:00Z`,
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(mockOrders),
      }),
    });

    const { GET } = await import('../../app/api/analytics/route');
    const request = createMockRequest('http://localhost:3000/api/analytics?days=2');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dailyStats).toHaveLength(2);
    
    // Today should have 2 orders totaling $23.50
    const todayStats = data.dailyStats.find((stat: any) => stat.date === today);
    expect(todayStats.orders).toBe(2);
    expect(todayStats.revenue).toBe(23.50);
    
    // Yesterday should have 1 order totaling $18.00
    const yesterdayStats = data.dailyStats.find((stat: any) => stat.date === yesterday);
    expect(yesterdayStats.orders).toBe(1);
    expect(yesterdayStats.revenue).toBe(18.00);
  });
});