import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_name, item_name_arabic, price, item_type } = body;

    if (!item_name || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await runQuery(db,
      'INSERT INTO menu_config (item_type, item_name, item_name_arabic, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [item_type || 'feteer_type', item_name, item_name_arabic || null, price]
    );

    return NextResponse.json({ id: result.lastID }, { status: 201 });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return NextResponse.json({ error: 'Failed to add menu item' }, { status: 500 });
  }
}

