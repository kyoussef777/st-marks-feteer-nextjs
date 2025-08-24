import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock jose library
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

describe('Middleware Auth Module', () => {
  let mockJwtVerify: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { jwtVerify } = require('jose');
    mockJwtVerify = jwtVerify;
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const mockPayload = {
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'HS256' },
      });

      const { verifyToken } = await import('../../lib/middleware-auth');
      const result = await verifyToken('valid-token');

      expect(result).toEqual({
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      });
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', expect.any(Uint8Array));
    });

    it('should return null for invalid token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const { verifyToken } = await import('../../lib/middleware-auth');
      const result = await verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Token expired'));

      const { verifyToken } = await import('../../lib/middleware-auth');
      const result = await verifyToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    function createMockRequest(cookie?: string) {
      const headers = new Headers();
      if (cookie) {
        headers.set('Cookie', cookie);
      }
      
      return new NextRequest('http://localhost:3000/test', {
        headers,
      });
    }

    it('should return user data for valid auth token', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockUser,
        protectedHeader: { alg: 'HS256' },
      });

      const { isAuthenticated } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=valid-token');
      const result = await isAuthenticated(request);

      expect(result).toEqual(mockUser);
    });

    it('should return null when no auth token cookie', async () => {
      const { isAuthenticated } = await import('../../lib/middleware-auth');
      const request = createMockRequest();
      const result = await isAuthenticated(request);

      expect(result).toBeNull();
    });

    it('should return null for invalid auth token', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const { isAuthenticated } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=invalid-token');
      const result = await isAuthenticated(request);

      expect(result).toBeNull();
    });

    it('should handle malformed cookie', async () => {
      const { isAuthenticated } = await import('../../lib/middleware-auth');
      const request = createMockRequest('malformed-cookie');
      const result = await isAuthenticated(request);

      expect(result).toBeNull();
    });

    it('should extract token from cookie correctly', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        role: 'cashier',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockUser,
        protectedHeader: { alg: 'HS256' },
      });

      const { isAuthenticated } = await import('../../lib/middleware-auth');
      const request = createMockRequest('other-cookie=value; auth-token=test-token; another=value');
      const result = await isAuthenticated(request);

      expect(result).toEqual(mockUser);
      expect(mockJwtVerify).toHaveBeenCalledWith('test-token', expect.any(Uint8Array));
    });
  });

  describe('requireAuth', () => {
    function createMockRequest(cookie?: string) {
      const headers = new Headers();
      if (cookie) {
        headers.set('Cookie', cookie);
      }
      
      return new NextRequest('http://localhost:3000/test', {
        headers,
      });
    }

    it('should return user data when authenticated', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockUser,
        protectedHeader: { alg: 'HS256' },
      });

      const { requireAuth } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=valid-token');
      const result = await requireAuth(request);

      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      const { requireAuth } = await import('../../lib/middleware-auth');
      const request = createMockRequest();

      await expect(requireAuth(request)).rejects.toThrow('Authentication required');
    });
  });

  describe('requireRole', () => {
    function createMockRequest(cookie?: string) {
      const headers = new Headers();
      if (cookie) {
        headers.set('Cookie', cookie);
      }
      
      return new NextRequest('http://localhost:3000/test', {
        headers,
      });
    }

    it('should return user data when user has required role', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockAdmin,
        protectedHeader: { alg: 'HS256' },
      });

      const { requireRole } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=admin-token');
      const result = await requireRole(request, 'admin');

      expect(result).toEqual(mockAdmin);
    });

    it('should throw error when user does not have required role', async () => {
      const mockCashier = {
        id: 2,
        username: 'cashier',
        role: 'cashier',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockCashier,
        protectedHeader: { alg: 'HS256' },
      });

      const { requireRole } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=cashier-token');

      await expect(requireRole(request, 'admin')).rejects.toThrow('Admin access required');
    });

    it('should throw error when not authenticated', async () => {
      const { requireRole } = await import('../../lib/middleware-auth');
      const request = createMockRequest();

      await expect(requireRole(request, 'admin')).rejects.toThrow('Authentication required');
    });

    it('should allow admin access to cashier routes', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        role: 'admin',
        isAuthenticated: true,
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockAdmin,
        protectedHeader: { alg: 'HS256' },
      });

      const { requireRole } = await import('../../lib/middleware-auth');
      const request = createMockRequest('auth-token=admin-token');
      const result = await requireRole(request, 'cashier');

      expect(result).toEqual(mockAdmin);
    });
  });
});