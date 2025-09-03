import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database-neon';
import { extra_toppings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const db = getDatabase();
    
    console.log('Updating Pistachios topping sweet_type from "Konafa" to "Kunafa"...');
    
    const result = await db.update(extra_toppings)
      .set({ sweet_type: 'Kunafa' })
      .where(eq(extra_toppings.sweet_type, 'Konafa'))
      .returning();
    
    console.log('Updated toppings:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Topping updated successfully',
      updatedToppings: result
    });
  } catch (error) {
    console.error('Error updating topping:', error);
    return NextResponse.json({ error: 'Failed to update topping' }, { status: 500 });
  }
}