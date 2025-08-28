import { NextRequest, NextResponse } from 'next/server';
import { createMenuItem } from '@/lib/database-hybrid';

export async function POST(request: NextRequest) {
  try {
    const { item_name, item_name_arabic, price } = await request.json();
    
    if (!item_name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await createMenuItem({
      category: 'sweet',
      item_name,
      item_name_arabic: item_name_arabic || null,
      price,
      available: true
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating sweet:', error);
    return NextResponse.json({ error: 'Failed to create sweet' }, { status: 500 });
  }
}