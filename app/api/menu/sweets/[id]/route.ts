import { NextRequest, NextResponse } from 'next/server';
import { updateMenuItem, deleteMenuItem } from '@/lib/database-neon';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const { item_name, item_name_arabic, price } = await request.json();
    const id = parseInt(paramId);

    if (!item_name || price === undefined || isNaN(id)) {
      return NextResponse.json({ error: 'Missing required fields or invalid ID' }, { status: 400 });
    }

    await updateMenuItem(id, {
      item_name,
      item_name_arabic: item_name_arabic || null,
      price
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sweet:', error);
    return NextResponse.json({ error: 'Failed to update sweet' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteMenuItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sweet:', error);
    return NextResponse.json({ error: 'Failed to delete sweet' }, { status: 500 });
  }
}