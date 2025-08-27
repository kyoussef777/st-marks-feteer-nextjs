import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, isAdmin } from '@/lib/auth';
import { getDbInstance } from '@/lib/database-hybrid';
import { orders, menu_config, meat_types, cheese_types, extra_toppings } from '@/lib/schema';
import { sql } from 'drizzle-orm';

const DEFAULT_MENU_DATA = {
  feteer_types: [
    { item_type: 'feteer', item_name: 'Feteer Meshaltet (Plain)', item_name_arabic: 'فطير مشلتت', price: 10 },
    { item_type: 'feteer', item_name: 'Feteer Gebna Meshakala', item_name_arabic: 'فطير بالجبنة المشكلة', price: 15 },
    { item_type: 'feteer', item_name: 'Feteer Lahma Meshakala', item_name_arabic: 'فطير باللحمة المشكلة', price: 25 },
  ],
  sweets: [
    { item_type: 'sweet', item_name: 'Baklawa', item_name_arabic: 'بقلاوة', price: 12 },
    { item_type: 'sweet', item_name: 'Konafa', item_name_arabic: 'كنافة', price: 15 },
    { item_type: 'sweet', item_name: 'Basbousa', item_name_arabic: 'بسبوسة', price: 10 },
  ],
  meat_types: [
    { name: 'Sogoq Masri', name_arabic: 'سجق مصري', price: 0, is_default: true },
    { name: 'Lahma Mafrouma', name_arabic: 'لحمة مفرومة', price: 0, is_default: true },
    { name: 'Basterma', name_arabic: 'بسطرمة', price: 0, is_default: true },
    { name: 'Farkha', name_arabic: 'فراخ', price: 0, is_default: false },
  ],
  cheese_types: [
    { name: 'Gebna Beida', name_arabic: 'جبنة بيضاء', price: 3 },
    { name: 'Gebna Roumi', name_arabic: 'جبنة رومي', price: 5 },
    { name: 'Mozzarella', name_arabic: 'موتزاريلا', price: 4 },
  ],
  extra_toppings: [
    { name: 'Nutella Zeyada', name_arabic: 'نوتيلا إضافية', price: 2, feteer_type: 'Feteer Helw' },
  ]
};

export async function POST(request: NextRequest) {
  try {
    const user = await isAuthenticated(request);
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { resetOrders, resetMenu } = body;

    const db = await getDbInstance();

    const results = [];

    if (resetOrders) {
      // Delete all orders
      await db.delete(orders);
      // Reset the sequence to start from 1
      await db.execute(sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1;`);
      results.push('All orders deleted and ID sequence reset');
    }

    if (resetMenu) {
      // Delete existing menu data
      await db.delete(extra_toppings);
      await db.delete(cheese_types);
      await db.delete(meat_types);
      await db.delete(menu_config);

      // Insert default menu data
      await db.insert(menu_config).values([
        ...DEFAULT_MENU_DATA.feteer_types,
        ...DEFAULT_MENU_DATA.sweets,
      ]);

      await db.insert(meat_types).values(DEFAULT_MENU_DATA.meat_types);
      await db.insert(cheese_types).values(DEFAULT_MENU_DATA.cheese_types);
      await db.insert(extra_toppings).values(DEFAULT_MENU_DATA.extra_toppings);

      results.push('Menu reset to defaults');
    }

    return NextResponse.json({
      message: 'Database reset completed',
      results
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}