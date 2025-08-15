// Hybrid database that falls back to SQLite if Neon is not configured
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import type { Order as OrderType, CreateOrderData } from '@/types';

// Import Neon types and functions
import { 
  orders as neonOrders, 
  menu_config as neonMenuConfig, 
  meat_types as neonMeatTypes, 
  cheese_types as neonCheeseTypes, 
  extra_toppings as neonExtraToppings,
  type Order as NeonOrder,
  type MenuConfig as NeonMenuConfig,
  type MeatType as NeonMeatType,
  type CheeseType as NeonCheeseType,
  type ExtraTopping as NeonExtraTopping
} from './schema';

// Import SQLite functions as fallback
import {
  getAllOrders as sqliteGetAllOrders,
  getOrdersByStatus as sqliteGetOrdersByStatus,
  createOrder as sqliteCreateOrder,
  updateOrderStatus as sqliteUpdateOrderStatus,
  deleteOrder as sqliteDeleteOrder,
  getMenuConfig as sqliteGetMenuConfig,
  getSweetTypes as sqliteGetSweetTypes,
  getMeatTypes as sqliteGetMeatTypes,
  getCheeseTypes as sqliteGetCheeseTypes,
  getExtraToppings as sqliteGetExtraToppings,
  type Order as SQLiteOrder,
  type MenuConfig as SQLiteMenuConfig,
  type MeatType as SQLiteMeatType,
  type CheeseType as SQLiteCheeseType,
  type ExtraTopping as SQLiteExtraTopping
} from './database';

// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Database module should only be imported on the server side');
}

let dbInstance: ReturnType<typeof drizzle> | null = null;
let isNeonAvailable = false;
let isInitialized = false;

function checkNeonAvailability(): boolean {
  const dbUrl = process.env.DATABASE_URL;
  return !!(dbUrl && 
           dbUrl !== "postgresql://username:password@hostname/dbname?sslmode=require" &&
           (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')));
}

export function getDatabase() {
  if (!isNeonAvailable) {
    throw new Error('Neon database not available, using SQLite fallback');
  }

  if (!dbInstance) {
    const sql = neon(process.env.DATABASE_URL!);
    dbInstance = drizzle(sql);
  }

  return dbInstance;
}

export async function initializeDatabase() {
  isNeonAvailable = checkNeonAvailability();
  
  if (isNeonAvailable) {
    console.log('Using Neon PostgreSQL database');
    const db = getDatabase();
    
    if (!isInitialized) {
      try {
        // Seed the database with default data (will be implemented later)
        console.log('Neon database initialized');
        isInitialized = true;
      } catch (error) {
        console.error('Error initializing Neon database:', error);
        isNeonAvailable = false;
      }
    }
    
    return db;
  } else {
    console.log('Using SQLite database (fallback)');
    // Use SQLite database
    const { initializeDatabase: sqliteInit } = await import('./database');
    return await sqliteInit();
  }
}

// Type unions for compatibility
export type Order = NeonOrder | SQLiteOrder;
export type MenuConfig = NeonMenuConfig | SQLiteMenuConfig;
export type MeatType = NeonMeatType | SQLiteMeatType;
export type CheeseType = NeonCheeseType | SQLiteCheeseType;
export type ExtraTopping = NeonExtraTopping | SQLiteExtraTopping;

// Database query functions with fallback
export async function getAllOrders(): Promise<Order[]> {
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonOrders).orderBy(desc(neonOrders.created_at));
  } else {
    return await sqliteGetAllOrders();
  }
}

export async function getOrdersByStatus(status: string): Promise<Order[]> {
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonOrders).where(eq(neonOrders.status, status)).orderBy(desc(neonOrders.created_at));
  } else {
    return await sqliteGetOrdersByStatus(status);
  }
}

export async function createOrder(order: CreateOrderData): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonOrders).values({
      customer_name: order.customer_name,
      item_type: order.item_type,
      feteer_type: order.feteer_type || null,
      sweet_type: order.sweet_type || null,
      sweet_selections: order.sweet_selections || null,
      meat_selection: order.meat_selection || null,
      cheese_selection: order.cheese_selection || null,
      has_cheese: order.has_cheese,
      extra_nutella: order.extra_nutella,
      notes: order.notes || null,
      status: order.status,
      price: order.price
    }).returning({ id: neonOrders.id });

    return result[0].id;
  } else {
    return await sqliteCreateOrder(order);
  }
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.update(neonOrders).set({ status }).where(eq(neonOrders.id, id));
  } else {
    return await sqliteUpdateOrderStatus(id, status);
  }
}

export async function deleteOrder(id: number): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.delete(neonOrders).where(eq(neonOrders.id, id));
  } else {
    return await sqliteDeleteOrder(id);
  }
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.select().from(neonOrders).where(eq(neonOrders.id, id)).limit(1);
    return result[0];
  } else {
    // SQLite version
    const { getDatabase: getSQLiteDB } = await import('./database');
    const db = await getSQLiteDB();
    return await new Promise<OrderType>((resolve, reject) => {
      db.get('SELECT * FROM orders WHERE id = ?', [id], (err: Error | null, row: OrderType) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

export async function getMenuConfig(): Promise<MenuConfig[]> {
  // Ensure database is initialized
  if (!isInitialized) {
    await initializeDatabase();
  }
  
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonMenuConfig).where(eq(neonMenuConfig.item_type, 'feteer_type'));
  } else {
    return await sqliteGetMenuConfig();
  }
}

export async function getSweetTypes(): Promise<MenuConfig[]> {
  // Ensure database is initialized
  if (!isInitialized) {
    await initializeDatabase();
  }
  
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonMenuConfig).where(eq(neonMenuConfig.item_type, 'sweet_type'));
  } else {
    return await sqliteGetSweetTypes();
  }
}

export async function getMeatTypes(): Promise<MeatType[]> {
  // Ensure database is initialized
  if (!isInitialized) {
    await initializeDatabase();
  }
  
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonMeatTypes);
  } else {
    return await sqliteGetMeatTypes();
  }
}

export async function getCheeseTypes(): Promise<CheeseType[]> {
  // Ensure database is initialized
  if (!isInitialized) {
    await initializeDatabase();
  }
  
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonCheeseTypes);
  } else {
    return await sqliteGetCheeseTypes();
  }
}

export async function getExtraToppings(): Promise<ExtraTopping[]> {
  // Ensure database is initialized
  if (!isInitialized) {
    await initializeDatabase();
  }
  
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonExtraToppings);
  } else {
    return await sqliteGetExtraToppings();
  }
}

// Menu management functions with fallback
export async function createMenuItem(item: Omit<MenuConfig, 'id' | 'created_at'>): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonMenuConfig).values({
      category: item.category,
      item_name: item.item_name,
      item_name_arabic: item.item_name_arabic,
      price: item.price,
      available: item.available ?? true
    }).returning({ id: neonMenuConfig.id });
    return result[0].id;
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const result = await runQuery(db,
      'INSERT INTO menu_config (item_type, item_name, item_name_arabic, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [item.item_type, item.item_name, item.item_name_arabic, item.price]
    );
    return result.lastID;
  }
}

export async function updateMenuItem(id: number, item: Partial<MenuConfig>): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.update(neonMenuConfig).set({
      category: item.category,
      item_name: item.item_name,
      item_name_arabic: item.item_name_arabic,
      price: item.price,
      available: item.available
    }).where(eq(neonMenuConfig.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    await runQuery(db,
      'UPDATE menu_config SET item_name = ?, item_name_arabic = ?, price = ? WHERE id = ?',
      [item.item_name, item.item_name_arabic, item.price, id]
    );
  }
}

export async function deleteMenuItem(id: number): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.delete(neonMenuConfig).where(eq(neonMenuConfig.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    await runQuery(db, 'DELETE FROM menu_config WHERE id = ?', [id]);
  }
}

// Analytics functions
export async function getOrdersInDateRange(startDate: string, endDate: string): Promise<Order[]> {
  if (isNeonAvailable) {
    const db = getDatabase();
    return await db.select().from(neonOrders).where(
      and(
        gte(neonOrders.created_at, new Date(startDate)),
        lte(neonOrders.created_at, new Date(endDate + 'T23:59:59'))
      )
    ).orderBy(desc(neonOrders.created_at));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB } = await import('./database');
    const db = await getSQLiteDB();
    return await new Promise<Order[]>((resolve, reject) => {
      db.all('SELECT * FROM orders WHERE date(created_at) >= ? AND date(created_at) <= ? ORDER BY created_at DESC', 
        [startDate, endDate], (err: Error | null, rows: unknown[]) => {
        if (err) reject(err);
        else resolve((rows as Order[]).map(row => ({
          ...row,
          feteer_type: row.feteer_type ?? null,
          sweet_type: row.sweet_type ?? null,
          sweet_selections: row.sweet_selections ?? null,
          meat_selection: row.meat_selection ?? null,
          cheese_selection: row.cheese_selection ?? null
        })));
      });
    });
  }
}