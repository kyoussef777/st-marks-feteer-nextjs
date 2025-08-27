import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { menu_config, meat_types, cheese_types, extra_toppings } from './schema';

export async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    // Check if data already exists
    const existingMenuItems = await db.select().from(menu_config).limit(1);
    if (existingMenuItems.length > 0) {
      console.log('Database already seeded');
      return;
    }

    console.log('Seeding database...');

    // Insert default menu items
    await db.insert(menu_config).values([
      // Feteer items
      { item_type: 'feteer_type', item_name: 'Feteer Helw (Custard w Sugar)', item_name_arabic: 'فطير حلو (كاسترد وسكر)', price: 8.0 },
      { item_type: 'feteer_type', item_name: 'Feteer Lahma Meshakala', item_name_arabic: 'فطير باللحمة المشكلة', price: 12.0 },
      { item_type: 'feteer_type', item_name: 'Feteer Gebna Meshakala', item_name_arabic: 'فطير بالجبنة المشكلة', price: 10.0 },
      { item_type: 'feteer_type', item_name: 'Feteer Meshaltet (Plain)', item_name_arabic: 'فطير مشلتت', price: 6.0 },
      // Sweet items
      { item_type: 'sweet_type', item_name: 'Basbousa', item_name_arabic: 'بسبوسة', price: 5.0 },
      { item_type: 'sweet_type', item_name: 'Konafa', item_name_arabic: 'كنافة', price: 7.0 },
      { item_type: 'sweet_type', item_name: 'Om Ali', item_name_arabic: 'أم علي', price: 6.0 },
      { item_type: 'sweet_type', item_name: 'Baklawa', item_name_arabic: 'بقلاوة', price: 4.0 },
      { item_type: 'sweet_type', item_name: 'Muhallabeya', item_name_arabic: 'مهلبية', price: 4.5 },
      { item_type: 'sweet_type', item_name: 'Roz bel Laban', item_name_arabic: 'رز بلبن', price: 4.0 }
    ]);

    // Insert default meat types
    await db.insert(meat_types).values([
      { name: 'Sogoq Masri', name_arabic: 'سجق مصري', price: 0, is_default: true },
      { name: 'Lahma Mafrouma', name_arabic: 'لحمة مفرومة', price: 0, is_default: true },
      { name: 'Basterma', name_arabic: 'بسطرمة', price: 0, is_default: true },
      { name: 'Farkha', name_arabic: 'فراخ', price: 0, is_default: false }
    ]);

    // Insert default cheese types
    await db.insert(cheese_types).values([
      { name: 'Gebna Beida', name_arabic: 'جبنة بيضاء', price: 0 },
      { name: 'Gebna Roumi', name_arabic: 'جبنة رومي', price: 0 },
      { name: 'Mozzarella', name_arabic: 'موتزاريلا', price: 0 },
      { name: 'Gebna Feta', name_arabic: 'جبنة فيتا', price: 0 }
    ]);

    // Insert default extra toppings
    await db.insert(extra_toppings).values([
      { name: 'Nutella Zeyada', name_arabic: 'نوتيلا إضافية', price: 2.0, feteer_type: 'Feteer Helw (Custard w Sugar)' }
    ]);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}