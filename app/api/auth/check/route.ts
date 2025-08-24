import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticated(request);
    
    if (user) {
      return NextResponse.json({
        isAuthenticated: true,
        user: user
      });
    } else {
      return NextResponse.json({
        isAuthenticated: false,
        user: null
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}