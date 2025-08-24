import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('../../lib/auth', () => ({
  authenticateUser: jest.fn(),
  generateToken: jest.fn(),
}));

function createMockRequest(method: string, body?: any, url = 'http://localhost:3000/api/auth/login') {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/auth/login', () => {
  let mockAuthenticateUser: jest.MockedFunction<any>;
  let mockGenerateToken: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    const auth = require('../../lib/auth');
    mockAuthenticateUser = auth.authenticateUser;
    mockGenerateToken = auth.generateToken;
  });

  it('should login with valid credentials', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      role: 'admin',
      is_active: true,
    };

    mockAuthenticateUser.mockResolvedValue(mockUser);
    mockGenerateToken.mockResolvedValue('mock-jwt-token');

    const { POST } = await import('../../app/api/auth/login/route');
    const request = createMockRequest('POST', {
      username: 'admin',
      password: 'admin123',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('mock-jwt-token');
    expect(data.user.username).toBe('admin');
    expect(mockAuthenticateUser).toHaveBeenCalledWith('admin', 'admin123');
    expect(mockGenerateToken).toHaveBeenCalledWith(mockUser);
  });

  it('should reject invalid credentials', async () => {
    mockAuthenticateUser.mockResolvedValue(null);

    const { POST } = await import('../../app/api/auth/login/route');
    const request = createMockRequest('POST', {
      username: 'invalid',
      password: 'wrong',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockGenerateToken).not.toHaveBeenCalled();
  });

  it('should reject inactive users', async () => {
    const inactiveUser = {
      id: 1,
      username: 'admin',
      role: 'admin',
      is_active: false,
    };

    mockAuthenticateUser.mockResolvedValue(inactiveUser);

    const { POST } = await import('../../app/api/auth/login/route');
    const request = createMockRequest('POST', {
      username: 'admin',
      password: 'admin123',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockGenerateToken).not.toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    const { POST } = await import('../../app/api/auth/login/route');
    const request = createMockRequest('POST', {
      username: '',
      password: 'admin123',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it('should handle authentication errors', async () => {
    mockAuthenticateUser.mockRejectedValue(new Error('Database error'));

    const { POST } = await import('../../app/api/auth/login/route');
    const request = createMockRequest('POST', {
      username: 'admin',
      password: 'admin123',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});

describe('/api/auth/logout', () => {
  it('should logout successfully', async () => {
    const { POST } = await import('../../app/api/auth/logout/route');
    const request = createMockRequest('POST', {}, 'http://localhost:3000/api/auth/logout');

    const response = await POST(request);

    expect(response.status).toBe(200);
    
    // Check if Set-Cookie header clears the auth token
    const setCookieHeader = response.headers.get('Set-Cookie');
    expect(setCookieHeader).toContain('auth-token=');
    expect(setCookieHeader).toContain('Max-Age=0');
  });
});