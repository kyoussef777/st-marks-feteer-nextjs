import { NextRequest, NextResponse } from 'next/server';
import { updateMenuItem, deleteMenuItem } from '@/lib/database-neon';
import { withAuth } from '@/lib/apiAuth';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { item_name, item_name_arabic, price } = body;

    if (!item_name || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateMenuItem(parseInt(id), {
      item_name,
      item_name_arabic: item_name_arabic || null,
      price
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    
    await deleteMenuItem(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
});