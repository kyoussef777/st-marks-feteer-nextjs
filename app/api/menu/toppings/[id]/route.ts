import { NextRequest, NextResponse } from 'next/server';
import { updateExtraTopping, deleteExtraTopping } from '@/lib/database-neon';
import { withAuth } from '@/lib/apiAuth';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { name, name_arabic, price, feteer_type } = await request.json();
    
    const updateData: Partial<{ name: string; name_arabic?: string; price?: number; feteer_type?: string }> = {};
    if (name !== undefined) updateData.name = name;
    if (name_arabic !== undefined) updateData.name_arabic = name_arabic;
    if (price !== undefined) updateData.price = typeof price === 'number' ? price : 0;
    if (feteer_type !== undefined) updateData.feteer_type = feteer_type;

    await updateExtraTopping(id, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating extra topping:', error);
    return NextResponse.json({ error: 'Failed to update extra topping' }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteExtraTopping(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting extra topping:', error);
    return NextResponse.json({ error: 'Failed to delete extra topping' }, { status: 500 });
  }
});