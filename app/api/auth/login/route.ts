import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateToken, initializeDefaultAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Initialize default admin if needed
    await initializeDefaultAdmin();

    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify credentials
    const user = await verifyCredentials(username.trim(), password);

    if (!user) {
      // Add a small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await generateToken(user);

    // Create response with token
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Login successful',
        user: { 
          id: user.id,
          username: user.username, 
          role: user.role,
          isAuthenticated: true 
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookie for security
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

