import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock data
const mockOrders = [
  {
    id: 1,
    customer_name: 'Test Customer',
    item_type: 'feteer',
    feteer_type: 'Cheese',
    has_cheese: true,
    extra_nutella: false,
    status: 'ordered',
    price: 15.50,
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    customer_name: 'Sweet Customer',
    item_type: 'sweet',
    sweet_type: 'Baklava',
    status: 'completed',
    price: 8.00,
    created_at: '2024-01-01T11:00:00Z',
  },
];

const mockMenuData = {
  feteerTypes: [
    { id: 1, item_name: 'Cheese', item_name_arabic: 'جبنة', price: 15.50 },
    { id: 2, item_name: 'Mixed Meat', item_name_arabic: 'لحوم مشكلة', price: 18.00 },
  ],
  sweetTypes: [
    { id: 1, item_name: 'Baklava', item_name_arabic: 'بقلاوة', price: 8.00 },
    { id: 2, item_name: 'Knafeh', item_name_arabic: 'كنافة', price: 12.00 },
  ],
  meatTypes: [
    { id: 1, meat_name: 'Chicken', meat_name_arabic: 'دجاج' },
    { id: 2, meat_name: 'Beef', meat_name_arabic: 'لحم بقري' },
  ],
  cheeseTypes: [],
  extraToppings: [
    { id: 1, topping_name: 'Extra Nutella', topping_name_arabic: 'نوتيلا إضافية', price: 2.00 },
  ],
};

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    role: 'admin',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'cashier',
    role: 'cashier',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Request handlers
export const handlers = [
  // Orders API
  http.get('/api/orders', () => {
    return HttpResponse.json(mockOrders);
  }),

  http.post('/api/orders', async ({ request }) => {
    const orderData = await request.json() as any;
    const newOrder = {
      id: mockOrders.length + 1,
      ...orderData,
      created_at: new Date().toISOString(),
    };
    mockOrders.push(newOrder);
    return HttpResponse.json(newOrder, { status: 201 });
  }),

  http.put('/api/orders/:id', async ({ params, request }) => {
    const orderId = parseInt(params.id as string);
    const updateData = await request.json() as any;
    const orderIndex = mockOrders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    
    mockOrders[orderIndex] = { ...mockOrders[orderIndex], ...updateData };
    return HttpResponse.json(mockOrders[orderIndex]);
  }),

  http.delete('/api/orders/:id', ({ params }) => {
    const orderId = parseInt(params.id as string);
    const orderIndex = mockOrders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    
    mockOrders.splice(orderIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Menu API
  http.get('/api/menu', () => {
    return HttpResponse.json(mockMenuData);
  }),

  // Analytics API
  http.get('/api/analytics', ({ request }) => {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    const analytics = {
      totalRevenue: 500.00,
      feteerRevenue: 300.00,
      sweetRevenue: 200.00,
      totalOrders: 25,
      feteerOrders: 15,
      sweetOrders: 10,
      completedOrders: 20,
      averageOrderValue: 20.00,
      dailyStats: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        revenue: Math.random() * 100,
        orders: Math.floor(Math.random() * 10) + 1,
      })).reverse(),
    };
    
    return HttpResponse.json(analytics);
  }),

  // Auth API
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json() as any;
    
    if (username === 'admin' && password === 'admin') {
      return HttpResponse.json({
        token: 'mock-jwt-token',
        user: { id: 1, username: 'admin', role: 'admin' },
      });
    }
    
    return new HttpResponse(null, { status: 401 });
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Users API
  http.get('/api/users', () => {
    return HttpResponse.json(mockUsers);
  }),

  http.post('/api/users', async ({ request }) => {
    const userData = await request.json() as any;
    const newUser = {
      id: mockUsers.length + 1,
      ...userData,
      created_at: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // Init API
  http.post('/api/init', () => {
    return HttpResponse.json({ message: 'Database initialized' });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),
];

// Setup server
export const server = setupServer(...handlers);