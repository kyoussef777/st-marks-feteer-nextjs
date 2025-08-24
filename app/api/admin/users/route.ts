import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, isAdmin, getAllUsers, createUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await isAuthenticated(request);
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await isAuthenticated(request);
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Username, password, and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'cashier') {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or cashier' },
        { status: 400 }
      );
    }

    const newUser = await createUser(username, password, role);
    
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof Error && error.message === 'Username already exists') {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}