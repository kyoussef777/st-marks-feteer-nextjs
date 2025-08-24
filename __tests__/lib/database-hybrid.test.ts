import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the database modules
jest.mock('../../lib/database-neon', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orders: {},
  users: {},
  feteerTypes: {},
  sweetTypes: {},
  meatTypes: {},
  cheeseTypes: {},
  extraToppings: {},
}));

jest.mock('../../lib/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  orders: {},
  users: {},
  feteerTypes: {},
  sweetTypes: {},
  meatTypes: {},
  cheeseTypes: {},
  extraToppings: {},
}));

// Mock environment variable checking
const originalEnv = process.env;

describe('Database Hybrid Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use Neon database when DATABASE_URL is valid', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    
    // Re-import after setting env var
    const { db, getDatabaseType } = await import('../../lib/database-hybrid');
    
    expect(getDatabaseType()).toBe('neon');
    expect(db).toBeDefined();
  });

  it('should fallback to SQLite when DATABASE_URL is invalid', async () => {
    process.env.DATABASE_URL = 'invalid-url';
    
    // Re-import after setting env var
    const { db, getDatabaseType } = await import('../../lib/database-hybrid');
    
    expect(getDatabaseType()).toBe('sqlite');
    expect(db).toBeDefined();
  });

  it('should fallback to SQLite when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;
    
    // Re-import after unsetting env var
    const { db, getDatabaseType } = await import('../../lib/database-hybrid');
    
    expect(getDatabaseType()).toBe('sqlite');
    expect(db).toBeDefined();
  });

  it('should export all required tables and schemas', async () => {
    const hybrid = await import('../../lib/database-hybrid');
    
    expect(hybrid.db).toBeDefined();
    expect(hybrid.orders).toBeDefined();
    expect(hybrid.users).toBeDefined();
    expect(hybrid.feteerTypes).toBeDefined();
    expect(hybrid.sweetTypes).toBeDefined();
    expect(hybrid.meatTypes).toBeDefined();
    expect(hybrid.cheeseTypes).toBeDefined();
    expect(hybrid.extraToppings).toBeDefined();
  });
});