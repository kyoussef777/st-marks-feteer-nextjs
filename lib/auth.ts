import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Auth configuration from environment variables
const AUTH_CONFIG = {
  username: process.env.AUTH_USERNAME || 'admin',
  password: process.env.AUTH_PASSWORD || 'stmarks2024!',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  tokenExpiry: '7d', // Token expires in 7 days
};

export interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

/**
 * Verify username and password against environment variables
 */
export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  try {
    // Check username
    if (username !== AUTH_CONFIG.username) {
      return false;
    }

    // For development, compare passwords directly
    // In production, you would hash the password in env and compare hashes
    return password === AUTH_CONFIG.password;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return false;
  }
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(username: string): string {
  try {
    const payload = {
      username,
      isAuthenticated: true,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, AUTH_CONFIG.jwtSecret, {
      expiresIn: AUTH_CONFIG.tokenExpiry,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify JWT token and return user data
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, AUTH_CONFIG.jwtSecret) as any;
    
    if (!decoded || !decoded.username || !decoded.isAuthenticated) {
      return null;
    }

    return {
      username: decoded.username,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
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
 * Middleware helper to check authentication
 */
export function isAuthenticated(request: NextRequest): AuthUser | null {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Hash password for storage (for future use)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash (for future use)
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate secure random string for secrets
 */
export function generateSecretKey(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Check if user is admin (for future role-based access)
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.isAuthenticated === true && user?.username === AUTH_CONFIG.username;
}