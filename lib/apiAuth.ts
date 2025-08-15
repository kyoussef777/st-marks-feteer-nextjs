import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, AuthUser } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

export type AuthenticatedHandler = (
  request: AuthenticatedRequest, 
  context?: { params: Record<string, string> }
) => Promise<Response>;

export type ApiHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<Response>;

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(handler: AuthenticatedHandler): ApiHandler {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      // Check authentication
      const user = isAuthenticated(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Create authenticated request with user
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;
      
      // Call the original handler
      return await handler(authenticatedRequest, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Simple auth check for use in API routes
 */
export function checkAuth(request: NextRequest): { user: AuthUser | null; error?: NextResponse } {
  try {
    const user = isAuthenticated(request);
    
    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    return { user };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}