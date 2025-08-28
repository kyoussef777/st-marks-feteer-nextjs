import { NextRequest, NextResponse } from 'next/server';
import { updateCheeseType, deleteCheeseType } from '@/lib/database-neon';
import { withAuth } from '@/lib/apiAuth';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { name, name_arabic, price } = await request.json();
    
    const updateData: Partial<{ name: string; name_arabic?: string; price?: number }> = {};
    if (name !== undefined) updateData.name = name;
    if (name_arabic !== undefined) updateData.name_arabic = name_arabic;
    if (price !== undefined) updateData.price = typeof price === 'number' ? price : 0;

    await updateCheeseType(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cheese type:', error);
    return NextResponse.json({ error: 'Failed to update cheese type' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteCheeseType(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cheese type:', error);
    return NextResponse.json({ error: 'Failed to delete cheese type' }, { status: 500 });
  }
});