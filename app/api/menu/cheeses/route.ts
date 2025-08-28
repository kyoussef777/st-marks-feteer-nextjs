import { NextRequest, NextResponse } from 'next/server';
import { getCheeseTypes, createCheeseType } from '@/lib/database-neon';
import { withAuth } from '@/lib/apiAuth';

export const GET = withAuth(async () => {
  try {
    const cheeseTypes = await getCheeseTypes();
    return NextResponse.json(cheeseTypes);
  } catch (error) {
    console.error('Error fetching cheese types:', error);
    return NextResponse.json({ error: 'Failed to fetch cheese types' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { name, name_arabic, price } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = await createCheeseType({
      name,
      name_arabic: name_arabic || null,
      price: typeof price === 'number' ? price : 0
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating cheese type:', error);
    return NextResponse.json({ error: 'Failed to create cheese type' }, { status: 500 });
  }
});