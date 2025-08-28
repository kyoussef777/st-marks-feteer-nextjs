import { NextRequest, NextResponse } from 'next/server';
import { getExtraToppings, createExtraTopping } from '@/lib/database-hybrid';
import { withAuth } from '@/lib/apiAuth';

export const GET = withAuth(async () => {
  try {
    const extraToppings = await getExtraToppings();
    return NextResponse.json(extraToppings);
  } catch (error) {
    console.error('Error fetching extra toppings:', error);
    return NextResponse.json({ error: 'Failed to fetch extra toppings' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { name, name_arabic, price, feteer_type } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = await createExtraTopping({
      name,
      name_arabic: name_arabic || null,
      price: typeof price === 'number' ? price : 0,
      feteer_type: feteer_type || null
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error('Error creating extra topping:', error);
    return NextResponse.json({ error: 'Failed to create extra topping' }, { status: 500 });
  }
});