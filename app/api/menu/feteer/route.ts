import { NextRequest, NextResponse } from 'next/server';
import { createMenuItem } from '@/lib/database-hybrid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_name, item_name_arabic, price } = body;

    if (!item_name || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await createMenuItem({
      category: 'feteer',
      item_name,
      item_name_arabic: item_name_arabic || null,
      price,
      available: true
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return NextResponse.json({ error: 'Failed to add menu item' }, { status: 500 });
  }
}

