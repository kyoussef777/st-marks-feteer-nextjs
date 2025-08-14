import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { 
  orders, 
  menu_config, 
  meat_types, 
  cheese_types, 
  extra_toppings,
  type Order,
  type NewOrder,
  type MenuConfig,
  type MeatType,
  type CheeseType,
  type ExtraTopping
} from './schema';
import { seedDatabase } from './seed';

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Database module should only be imported on the server side');
}

let dbInstance: ReturnType<typeof drizzle> | null = null;
let isInitialized = false;

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!dbInstance) {
    const sql = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sql);
  }

  return dbInstance;
}

export async function initializeDatabase() {
  const db = getDatabase();
  
  if (!isInitialized) {
    try {
      // Seed the database with default data
      await seedDatabase();
      isInitialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }
  
  return db;
}

// Database query functions
export async function getAllOrders(): Promise<Order[]> {
  const db = getDatabase();
  return await db.select().from(orders).orderBy(desc(orders.created_at));
}

export async function getOrdersByStatus(status: string): Promise<Order[]> {
  const db = getDatabase();
  return await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.created_at));
}

export async function createOrder(order: Omit<NewOrder, 'id' | 'created_at'>): Promise<number> {
  const db = getDatabase();
  const result = await db.insert(orders).values({
    customer_name: order.customer_name,
    item_type: order.item_type,
    feteer_type: order.feteer_type || null,
    sweet_type: order.sweet_type || null,
    meat_selection: order.meat_selection || null,
    cheese_selection: order.cheese_selection || null,
    has_cheese: order.has_cheese,
    extra_nutella: order.extra_nutella,
    notes: order.notes || null,
    status: order.status,
    price: order.price
  }).returning({ id: orders.id });

  return result[0].id;
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  const db = getDatabase();
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

export async function deleteOrder(id: number): Promise<void> {
  const db = getDatabase();
  await db.delete(orders).where(eq(orders.id, id));
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const db = getDatabase();
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getMenuConfig(): Promise<MenuConfig[]> {
  const db = getDatabase();
  return await db.select().from(menu_config).where(eq(menu_config.item_type, 'feteer_type'));
}

export async function getSweetTypes(): Promise<MenuConfig[]> {
  const db = getDatabase();
  return await db.select().from(menu_config).where(eq(menu_config.item_type, 'sweet_type'));
}

export async function getMeatTypes(): Promise<MeatType[]> {
  const db = getDatabase();
  return await db.select().from(meat_types);
}

export async function getCheeseTypes(): Promise<CheeseType[]> {
  const db = getDatabase();
  return await db.select().from(cheese_types);
}

export async function getExtraToppings(): Promise<ExtraTopping[]> {
  const db = getDatabase();
  return await db.select().from(extra_toppings);
}

// Menu management functions
export async function createMenuItem(item: Omit<MenuConfig, 'id' | 'created_at'>): Promise<number> {
  const db = getDatabase();
  const result = await db.insert(menu_config).values(item).returning({ id: menu_config.id });
  return result[0].id;
}

export async function updateMenuItem(id: number, item: Partial<MenuConfig>): Promise<void> {
  const db = getDatabase();
  await db.update(menu_config).set(item).where(eq(menu_config.id, id));
}

export async function deleteMenuItem(id: number): Promise<void> {
  const db = getDatabase();
  await db.delete(menu_config).where(eq(menu_config.id, id));
}

// Meat type management
export async function createMeatType(meat: Omit<MeatType, 'id' | 'created_at'>): Promise<number> {
  const db = getDatabase();
  const result = await db.insert(meat_types).values(meat).returning({ id: meat_types.id });
  return result[0].id;
}

export async function updateMeatType(id: number, meat: Partial<MeatType>): Promise<void> {
  const db = getDatabase();
  await db.update(meat_types).set(meat).where(eq(meat_types.id, id));
}

export async function deleteMeatType(id: number): Promise<void> {
  const db = getDatabase();
  await db.delete(meat_types).where(eq(meat_types.id, id));
}

// Cheese type management
export async function createCheeseType(cheese: Omit<CheeseType, 'id' | 'created_at'>): Promise<number> {
  const db = getDatabase();
  const result = await db.insert(cheese_types).values(cheese).returning({ id: cheese_types.id });
  return result[0].id;
}

export async function updateCheeseType(id: number, cheese: Partial<CheeseType>): Promise<void> {
  const db = getDatabase();
  await db.update(cheese_types).set(cheese).where(eq(cheese_types.id, id));
}

export async function deleteCheeseType(id: number): Promise<void> {
  const db = getDatabase();
  await db.delete(cheese_types).where(eq(cheese_types.id, id));
}

// Extra topping management
export async function createExtraTopping(topping: Omit<ExtraTopping, 'id' | 'created_at'>): Promise<number> {
  const db = getDatabase();
  const result = await db.insert(extra_toppings).values(topping).returning({ id: extra_toppings.id });
  return result[0].id;
}

export async function updateExtraTopping(id: number, topping: Partial<ExtraTopping>): Promise<void> {
  const db = getDatabase();
  await db.update(extra_toppings).set(topping).where(eq(extra_toppings.id, id));
}

export async function deleteExtraTopping(id: number): Promise<void> {
  const db = getDatabase();
  await db.delete(extra_toppings).where(eq(extra_toppings.id, id));
}

// Analytics functions
export async function getOrdersInDateRange(startDate: string, endDate: string): Promise<Order[]> {
  const db = getDatabase();
  return await db.select().from(orders).where(
    and(
      gte(orders.created_at, new Date(startDate)),
      lte(orders.created_at, new Date(endDate + 'T23:59:59'))
    )
  ).orderBy(desc(orders.created_at));
}