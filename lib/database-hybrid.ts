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

export async function getDbInstance() {
  isNeonAvailable = checkNeonAvailability();
  
  if (isNeonAvailable) {
    if (!dbInstance) {
      const sql = neon(process.env.DATABASE_URL!);
      dbInstance = drizzle(sql);
    }
    return dbInstance;
  } else {
    throw new Error('Neon database not available');
  }
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

// Meat Types CRUD Operations
export async function createMeatType(meat: { name: string; name_arabic?: string; price?: number; is_default?: boolean }): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonMeatTypes).values({
      name: meat.name,
      name_arabic: meat.name_arabic || null,
      price: meat.price || 0,
      is_default: meat.is_default || false,
    }).returning({ id: neonMeatTypes.id });
    return result[0].id;
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const result = await runQuery(db,
      'INSERT INTO meat_types (name, name_arabic, price, is_default, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [meat.name, meat.name_arabic || null, meat.price || 0, meat.is_default || false]
    );
    return result.lastID;
  }
}

export async function updateMeatType(id: number, meat: Partial<{ name: string; name_arabic?: string; price?: number; is_default?: boolean }>): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const updateValues: Record<string, string | number | boolean | null | undefined> = {};
    if (meat.name) updateValues.name = meat.name;
    if (meat.name_arabic !== undefined) updateValues.name_arabic = meat.name_arabic;
    if (meat.price !== undefined) updateValues.price = meat.price;
    if (meat.is_default !== undefined) updateValues.is_default = meat.is_default;
    
    await db.update(neonMeatTypes).set(updateValues).where(eq(neonMeatTypes.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const setParts = [];
    const values = [];
    
    if (meat.name) {
      setParts.push('name = ?');
      values.push(meat.name);
    }
    if (meat.name_arabic !== undefined) {
      setParts.push('name_arabic = ?');
      values.push(meat.name_arabic);
    }
    if (meat.price !== undefined) {
      setParts.push('price = ?');
      values.push(meat.price);
    }
    if (meat.is_default !== undefined) {
      setParts.push('is_default = ?');
      values.push(meat.is_default);
    }
    
    if (setParts.length > 0) {
      values.push(id);
      await runQuery(db, `UPDATE meat_types SET ${setParts.join(', ')} WHERE id = ?`, values);
    }
  }
}

export async function deleteMeatType(id: number): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.delete(neonMeatTypes).where(eq(neonMeatTypes.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    await runQuery(db, 'DELETE FROM meat_types WHERE id = ?', [id]);
  }
}

// Extra Toppings CRUD Operations
export async function createExtraTopping(topping: { name: string; name_arabic?: string; price?: number; feteer_type?: string }): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonExtraToppings).values({
      name: topping.name,
      name_arabic: topping.name_arabic || null,
      price: topping.price || 0,
      feteer_type: topping.feteer_type || null,
    }).returning({ id: neonExtraToppings.id });
    return result[0].id;
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const result = await runQuery(db,
      'INSERT INTO extra_toppings (name, name_arabic, price, feteer_type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [topping.name, topping.name_arabic || null, topping.price || 0, topping.feteer_type || null]
    );
    return result.lastID;
  }
}

export async function updateExtraTopping(id: number, topping: Partial<{ name: string; name_arabic?: string; price?: number; feteer_type?: string }>): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const updateValues: Record<string, string | number | null | undefined> = {};
    if (topping.name) updateValues.name = topping.name;
    if (topping.name_arabic !== undefined) updateValues.name_arabic = topping.name_arabic;
    if (topping.price !== undefined) updateValues.price = topping.price;
    if (topping.feteer_type !== undefined) updateValues.feteer_type = topping.feteer_type;
    
    await db.update(neonExtraToppings).set(updateValues).where(eq(neonExtraToppings.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const setParts = [];
    const values = [];
    
    if (topping.name) {
      setParts.push('name = ?');
      values.push(topping.name);
    }
    if (topping.name_arabic !== undefined) {
      setParts.push('name_arabic = ?');
      values.push(topping.name_arabic);
    }
    if (topping.price !== undefined) {
      setParts.push('price = ?');
      values.push(topping.price);
    }
    if (topping.feteer_type !== undefined) {
      setParts.push('feteer_type = ?');
      values.push(topping.feteer_type);
    }
    
    if (setParts.length > 0) {
      values.push(id);
      await runQuery(db, `UPDATE extra_toppings SET ${setParts.join(', ')} WHERE id = ?`, values);
    }
  }
}

export async function deleteExtraTopping(id: number): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.delete(neonExtraToppings).where(eq(neonExtraToppings.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    await runQuery(db, 'DELETE FROM extra_toppings WHERE id = ?', [id]);
  }
}

// Cheese Types CRUD Operations
export async function createCheeseType(cheese: { name: string; name_arabic?: string; price?: number }): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonCheeseTypes).values({
      name: cheese.name,
      name_arabic: cheese.name_arabic || null,
      price: cheese.price || 0,
    }).returning({ id: neonCheeseTypes.id });
    return result[0].id;
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const result = await runQuery(db,
      'INSERT INTO cheese_types (name, name_arabic, price, created_at) VALUES (?, ?, ?, datetime("now"))',
      [cheese.name, cheese.name_arabic || null, cheese.price || 0]
    );
    return result.lastID;
  }
}

export async function updateCheeseType(id: number, cheese: Partial<{ name: string; name_arabic?: string; price?: number }>): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const updateValues: Record<string, string | number | null | undefined> = {};
    if (cheese.name) updateValues.name = cheese.name;
    if (cheese.name_arabic !== undefined) updateValues.name_arabic = cheese.name_arabic;
    if (cheese.price !== undefined) updateValues.price = cheese.price;
    
    await db.update(neonCheeseTypes).set(updateValues).where(eq(neonCheeseTypes.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const setParts = [];
    const values = [];
    
    if (cheese.name) {
      setParts.push('name = ?');
      values.push(cheese.name);
    }
    if (cheese.name_arabic !== undefined) {
      setParts.push('name_arabic = ?');
      values.push(cheese.name_arabic);
    }
    if (cheese.price !== undefined) {
      setParts.push('price = ?');
      values.push(cheese.price);
    }
    
    if (setParts.length > 0) {
      values.push(id);
      await runQuery(db, `UPDATE cheese_types SET ${setParts.join(', ')} WHERE id = ?`, values);
    }
  }
}

export async function deleteCheeseType(id: number): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    await db.delete(neonCheeseTypes).where(eq(neonCheeseTypes.id, id));
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    await runQuery(db, 'DELETE FROM cheese_types WHERE id = ?', [id]);
  }
}

// Menu management functions with fallback
export async function createMenuItem(item: Omit<MenuConfig, 'id' | 'created_at'>): Promise<number> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const result = await db.insert(neonMenuConfig).values({
      item_type: item.category === 'sweet' ? 'sweet_type' : 'feteer_type',
      item_name: item.item_name,
      item_name_arabic: item.item_name_arabic,
      price: item.price,
    }).returning({ id: neonMenuConfig.id });
    return result[0].id;
  } else {
    // SQLite fallback
    const { getDatabase: getSQLiteDB, runQuery } = await import('./database');
    const db = await getSQLiteDB();
    const result = await runQuery(db,
      'INSERT INTO menu_config (item_type, item_name, item_name_arabic, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [item.category === 'sweet' ? 'sweet_type' : 'feteer_type', item.item_name, item.item_name_arabic, item.price]
    );
    return result.lastID;
  }
}

export async function updateMenuItem(id: number, item: Partial<MenuConfig>): Promise<void> {
  if (isNeonAvailable) {
    const db = getDatabase();
    const updateValues: Record<string, string | number | boolean | undefined> = {};
    if (item.category) updateValues.item_type = item.category === 'sweet' ? 'sweet_type' : 'feteer_type';
    if (item.item_name) updateValues.item_name = item.item_name;
    if (item.item_name_arabic) updateValues.item_name_arabic = item.item_name_arabic;
    if (item.price !== undefined) updateValues.price = item.price;
    if (item.available !== undefined) updateValues.available = item.available;
    
    await db.update(neonMenuConfig).set(updateValues).where(eq(neonMenuConfig.id, id));
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