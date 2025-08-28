import { NextRequest, NextResponse } from 'next/server';
import { updateMeatType, deleteMeatType } from '@/lib/database-hybrid';
import { withAuth } from '@/lib/apiAuth';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { name, name_arabic, price, is_default } = await request.json();
    
    const updateData: Partial<{ name: string; name_arabic?: string; price?: number; is_default?: boolean }> = {};
    if (name !== undefined) updateData.name = name;
    if (name_arabic !== undefined) updateData.name_arabic = name_arabic;
    if (price !== undefined) updateData.price = typeof price === 'number' ? price : 0;
    if (is_default !== undefined) updateData.is_default = Boolean(is_default);

    await updateMeatType(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating meat type:', error);
    return NextResponse.json({ error: 'Failed to update meat type' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteMeatType(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meat type:', error);
    return NextResponse.json({ error: 'Failed to delete meat type' }, { status: 500 });
  }
});