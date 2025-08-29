import { NextRequest, NextResponse } from 'next/server';
import { createMenuItem } from '@/lib/database-neon';
import { withAuth } from '@/lib/apiAuth';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { item_name, item_name_arabic, price } = body;

    if (!item_name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = await createMenuItem({
      item_type: 'feteer_type',
      item_name,
      item_name_arabic: item_name_arabic || null,
      price: typeof price === 'number' ? price : 0
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return NextResponse.json({ error: 'Failed to add menu item' }, { status: 500 });
  }
});

