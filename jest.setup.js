import '@testing-library/jest-dom';

// Add polyfills for Node.js global objects
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Simple mock for fetch (avoid complex polyfills for now)
// global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock window.open for PDF printing tests
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    print: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    onload: null,
  })),
});

// Mock window.focus
Object.defineProperty(window, 'focus', {
  writable: true,
  value: jest.fn(),
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
});

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

// Mock crypto for JWT operations
const mockCrypto = {
  subtle: {
    sign: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    verify: jest.fn().mockResolvedValue(true),
    importKey: jest.fn().mockResolvedValue({}),
  },
  getRandomValues: jest.fn().mockReturnValue(new Uint8Array(32)),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Setup MSW for API mocking
// import { server } from './__tests__/mocks/server';

// Establish API mocking before all tests
// beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests
// afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
// afterAll(() => server.close());