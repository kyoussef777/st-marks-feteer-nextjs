import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  isAuthenticated: boolean;
}

interface JWTPayload {
  id: number;
  username: string;
  role: string;
  isAuthenticated: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Extract token from request headers or cookies
 */
export function extractToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie as fallback
  const tokenCookie = request.cookies.get('auth-token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

/**
 * Verify JWT token and return user data (Edge Runtime compatible)
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return null;
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    
    const decoded = payload as JWTPayload;
    
    if (!decoded || !decoded.username || !decoded.isAuthenticated || !decoded.id || !decoded.role) {
      return null;
    }

    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Middleware helper to check authentication (Edge Runtime compatible)
 */
export async function isAuthenticated(request: NextRequest): Promise<AuthUser | null> {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

/**
 * Check if user is admin (Edge Runtime compatible)
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.isAuthenticated === true && user?.role === 'admin';
}

/**
 * Check if user is cashier (Edge Runtime compatible)
 */
export function isCashier(user: AuthUser | null): boolean {
  return user?.isAuthenticated === true && user?.role === 'cashier';
}

/**
 * Check if user has admin or cashier role (Edge Runtime compatible)
 */
export function canAccessOrders(user: AuthUser | null): boolean {
  return isAdmin(user) || isCashier(user);
}