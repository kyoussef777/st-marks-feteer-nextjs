import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from './auth';

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      // Check authentication
      const user = isAuthenticated(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Add user to the request for use in the handler
      (request as any).user = user;
      
      // Call the original handler
      return await handler(request, context);
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
export function checkAuth(request: NextRequest): { user: any; error?: NextResponse } {
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