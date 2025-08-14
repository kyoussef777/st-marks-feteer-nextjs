import { NextResponse } from 'next/server';
import { getMenuConfig, getSweetTypes, getMeatTypes, getCheeseTypes, getExtraToppings } from '@/lib/database';

export async function GET() {
  try {
    const [feteerTypes, sweetTypes, meatTypes, cheeseTypes, extraToppings] = await Promise.all([
      getMenuConfig(),
      getSweetTypes(),
      getMeatTypes(),
      getCheeseTypes(),
      getExtraToppings()
    ]);

    return NextResponse.json({
      feteerTypes,
      sweetTypes,
      meatTypes,
      cheeseTypes,
      extraToppings
    });
  } catch (error) {
    console.error('Error fetching menu data:', error);
    return NextResponse.json({ error: 'Failed to fetch menu data' }, { status: 500 });
  }
}