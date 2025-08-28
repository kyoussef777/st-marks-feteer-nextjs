import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SignJWT, jwtVerify } from 'jose';

// Mock jose library
jest.mock('jose', () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock database
jest.mock('../../lib/database-neon', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
  users: {},
}));

describe('Auth Module', () => {
  let mockSignJWT: jest.MockedClass<typeof SignJWT>;
  let mockJwtVerify: jest.MockedFunction<typeof jwtVerify>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignJWT = SignJWT as jest.MockedClass<typeof SignJWT>;
    mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
    
    // Setup SignJWT mock chain
    const mockInstance = {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue('mock-jwt-token'),
    };
    
    mockSignJWT.mockImplementation(() => mockInstance as any);
  });

  it('should generate a valid JWT token for a user', async () => {
    const { generateToken } = await import('../../lib/auth');
    
    const mockUser = {
      id: 1,
      username: 'testuser',
      role: 'admin' as const,
      password_hash: 'hashedpassword',
      is_active: true,
      created_at: new Date(),
      last_login: null,
    };

    const token = await generateToken(mockUser);
    
    expect(token).toBe('mock-jwt-token');
    expect(mockSignJWT).toHaveBeenCalled();
  });

  it('should verify a valid JWT token', async () => {
    const { verifyToken } = await import('../../lib/auth');
    
    const mockPayload = {
      id: 1,
      username: 'testuser',
      role: 'admin',
      isAuthenticated: true,
    };
    
    mockJwtVerify.mockResolvedValue({
      payload: mockPayload,
      protectedHeader: { alg: 'HS256' },
    } as any);

    const result = await verifyToken('valid-token');
    
    expect(result).toEqual({
      id: 1,
      username: 'testuser',
      role: 'admin',
      isAuthenticated: true,
    });
    expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', expect.any(Uint8Array));
  });

  it('should return null for invalid JWT token', async () => {
    const { verifyToken } = await import('../../lib/auth');
    
    mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

    const result = await verifyToken('invalid-token');
    
    expect(result).toBeNull();
  });

  it('should hash passwords correctly', async () => {
    const bcrypt = await import('bcryptjs');
    const { hashPassword } = await import('../../lib/auth');
    
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>)
      .mockResolvedValue('hashed-password' as never);

    const result = await hashPassword('plaintext-password');
    
    expect(result).toBe('hashed-password');
    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext-password', 12);
  });

  it('should verify passwords correctly', async () => {
    const bcrypt = await import('bcryptjs');
    const { verifyPassword } = await import('../../lib/auth');
    
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>)
      .mockResolvedValue(true as never);

    const result = await verifyPassword('plaintext', 'hashed-password');
    
    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('plaintext', 'hashed-password');
  });

  it('should authenticate user with valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const { db } = await import('../../lib/database-neon');
    const { authenticateUser } = await import('../../lib/auth');
    
    const mockUser = {
      id: 1,
      username: 'testuser',
      password_hash: 'hashed-password',
      role: 'admin' as const,
      is_active: true,
      created_at: new Date(),
      last_login: null,
    };

    (db.select as jest.MockedFunction<any>).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockUser]),
        }),
      }),
    });

    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>)
      .mockResolvedValue(true as never);

    const result = await authenticateUser('testuser', 'plaintext');
    
    expect(result).toEqual(mockUser);
  });

  it('should return null for invalid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const { db } = await import('../../lib/database-neon');
    const { authenticateUser } = await import('../../lib/auth');
    
    (db.select as jest.MockedFunction<any>).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await authenticateUser('nonexistent', 'password');
    
    expect(result).toBeNull();
  });
});