import { NextRequest, NextResponse } from 'next/server';
import { getMeatTypes, createMeatType } from '@/lib/database-hybrid';
import { withAuth } from '@/lib/apiAuth';

export const GET = withAuth(async () => {
  try {
    const meatTypes = await getMeatTypes();
    return NextResponse.json(meatTypes);
  } catch (error) {
    console.error('Error fetching meat types:', error);
    return NextResponse.json({ error: 'Failed to fetch meat types' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { name, name_arabic, price, is_default } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = await createMeatType({
      name,
      name_arabic: name_arabic || null,
      price: typeof price === 'number' ? price : 0,
      is_default: Boolean(is_default)
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating meat type:', error);
    return NextResponse.json({ error: 'Failed to create meat type' }, { status: 500 });
  }
});