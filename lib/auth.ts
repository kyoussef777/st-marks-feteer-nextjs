import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { users, type User } from './schema';
import { getDatabase } from './database-neon';

// Auth configuration from environment variables - NO DEFAULTS IN PRODUCTION
const AUTH_CONFIG = {
  username: process.env.AUTH_USERNAME,
  password: process.env.AUTH_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
  tokenExpiry: '7d', // Token expires in 7 days
};

// Validate required environment variables
if (!AUTH_CONFIG.username) {
  throw new Error('AUTH_USERNAME environment variable is required');
}
if (!AUTH_CONFIG.password) {
  throw new Error('AUTH_PASSWORD environment variable is required');
}
if (!AUTH_CONFIG.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  isAuthenticated: boolean;
}

/**
 * Verify username and password against database
 */
export async function verifyCredentials(username: string, password: string): Promise<User | null> {
  try {
    const db = getDatabase();
    
    // Find user by username
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = result[0];
    
    if (!user || !user.is_active) {
      return null;
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await db.update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, user.id));

    return user;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return null;
  }
}

/**
 * Generate JWT token for authenticated user
 */
export async function generateToken(user: User): Promise<string> {
  try {
    const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret);
    const jwt = await new SignJWT({
      id: user.id,
      username: user.username,
      role: user.role,
      isAuthenticated: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    return jwt;
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify JWT token and return user data
 */
interface JWTPayload {
  id: number;
  username: string;
  role: string;
  isAuthenticated: boolean;
  iat?: number;
  exp?: number;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret);
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
export async function isAuthenticated(request: NextRequest): Promise<AuthUser | null> {
  const token = extractToken(request);
  
  if (!token) {
    return null;
  }

  return await verifyToken(token);
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
 * Check if user is admin
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.isAuthenticated === true && user?.role === 'admin';
}

/**
 * Check if user is cashier
 */
export function isCashier(user: AuthUser | null): boolean {
  return user?.isAuthenticated === true && user?.role === 'cashier';
}

/**
 * Check if user has admin or cashier role
 */
export function canAccessOrders(user: AuthUser | null): boolean {
  return isAdmin(user) || isCashier(user);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(username: string, password: string, role: 'admin' | 'cashier'): Promise<User> {
  try {
    const db = getDatabase();
    
    // Check if username already exists
    const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user
    const result = await db.insert(users).values({
      username,
      password_hash,
      role,
      is_active: true,
    }).returning();

    return result[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const db = getDatabase();
    return await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      is_active: users.is_active,
      created_at: users.created_at,
      last_login: users.last_login,
    }).from(users);
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Update user status (admin only)
 */
export async function updateUserStatus(userId: number, isActive: boolean): Promise<void> {
  try {
    const db = getDatabase();
    await db.update(users)
      .set({ is_active: isActive })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: number): Promise<void> {
  try {
    const db = getDatabase();
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Initialize default admin user from environment variables
 */
export async function initializeDefaultAdmin(): Promise<void> {
  try {
    if (!AUTH_CONFIG.username || !AUTH_CONFIG.password) {
      return; // Skip if env vars not set
    }

    const db = getDatabase();
    
    // Check if admin user already exists
    const existing = await db.select().from(users).where(eq(users.username, AUTH_CONFIG.username)).limit(1);
    if (existing.length > 0) {
      return; // Admin already exists
    }

    // Create default admin user
    await createUser(AUTH_CONFIG.username, AUTH_CONFIG.password, 'admin');
    console.log(`Default admin user '${AUTH_CONFIG.username}' created`);
  } catch (error) {
    console.error('Error initializing default admin:', error);
  }
}