// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('Database module should only be imported on the server side');
}

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export interface Order {
  id?: number;
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  feteer_type?: string;
  sweet_type?: string;
  meat_selection?: string;
  cheese_selection?: string;
  has_cheese: boolean;
  extra_nutella: boolean;
  notes?: string;
  status: 'ordered' | 'completed';
  price: number;
  created_at: string;
}

export interface MenuConfig {
  id?: number;
  item_type: string;
  item_name: string;
  item_name_arabic?: string;
  price: number;
  created_at: string;
}

export interface MeatType {
  id?: number;
  name: string;
  name_arabic?: string;
  price: number;
  is_default: boolean;
  created_at: string;
}

export interface CheeseType {
  id?: number;
  name: string;
  name_arabic?: string;
  price: number;
  created_at: string;
}

export interface ExtraTopping {
  id?: number;
  name: string;
  name_arabic?: string;
  price: number;
  feteer_type?: string;
  created_at: string;
}

const DATABASE_PATH = path.join(process.cwd(), 'db.sqlite3');

let dbInstance: sqlite3.Database | null = null;
let isInitialized = false;

export function getDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    // Ensure database file exists
    if (!fs.existsSync(DATABASE_PATH)) {
      fs.writeFileSync(DATABASE_PATH, '');
    }

    dbInstance = new sqlite3.Database(DATABASE_PATH, async (err) => {
      if (err) {
        reject(err);
      } else {
        // Initialize database tables on first connection
        if (!isInitialized) {
          try {
            await initializeDatabaseTables();
            isInitialized = true;
          } catch (initErr) {
            reject(initErr);
            return;
          }
        }
        resolve(dbInstance!);
      }
    });
  });
}

export function runQuery(db: sqlite3.Database, query: string, params: (string | number | boolean | null)[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(db: sqlite3.Database, query: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function allQuery(db: sqlite3.Database, query: string, params: unknown[] = []): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function initializeDatabaseTables() {
  if (!dbInstance) return;

  // Create orders table
  await runQuery(dbInstance, `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'feteer',
      feteer_type TEXT,
      sweet_type TEXT,
      meat_selection TEXT,
      cheese_selection TEXT,
      has_cheese BOOLEAN DEFAULT 1,
      extra_nutella BOOLEAN DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL,
      price REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Run migrations to update existing tables
  await runMigrations(dbInstance);

  // Create menu configuration table
  await runQuery(dbInstance, `
    CREATE TABLE IF NOT EXISTS menu_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_name_arabic TEXT,
      price REAL,
      created_at TEXT NOT NULL
    )
  `);

  // Create meat types table
  await runQuery(dbInstance, `
    CREATE TABLE IF NOT EXISTS meat_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_arabic TEXT,
      price REAL DEFAULT 0,
      is_default BOOLEAN DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Create cheese types table
  await runQuery(dbInstance, `
    CREATE TABLE IF NOT EXISTS cheese_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_arabic TEXT,
      price REAL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Create extra toppings table
  await runQuery(dbInstance, `
    CREATE TABLE IF NOT EXISTS extra_toppings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_arabic TEXT,
      price REAL DEFAULT 0,
      feteer_type TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Insert default data if tables are empty
  await insertDefaultData(dbInstance);
}

async function runMigrations(db: sqlite3.Database) {
  // Check if orders table has item_type column
  try {
    const tableInfo = await allQuery(db, 'PRAGMA table_info(orders)');
    const hasItemType = tableInfo.some((column: { name: string }) => column.name === 'item_type');
    const hasSweetType = tableInfo.some((column: { name: string }) => column.name === 'sweet_type');
    
    if (!hasItemType) {
      console.log('Adding item_type column to orders table...');
      await runQuery(db, 'ALTER TABLE orders ADD COLUMN item_type TEXT NOT NULL DEFAULT "feteer"');
    }
    
    if (!hasSweetType) {
      console.log('Adding sweet_type column to orders table...');
      await runQuery(db, 'ALTER TABLE orders ADD COLUMN sweet_type TEXT');
    }
    
    // Check if we need to migrate the table structure to allow nullable feteer_type
    const feteerTypeColumn = tableInfo.find((column: { name: string; notnull: number }) => column.name === 'feteer_type');
    if (feteerTypeColumn && feteerTypeColumn.notnull === 1) {
      console.log('Migrating orders table to allow nullable feteer_type...');
      
      // Create new table with correct schema
      await runQuery(db, `
        CREATE TABLE orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          item_type TEXT NOT NULL DEFAULT 'feteer',
          feteer_type TEXT,
          sweet_type TEXT,
          meat_selection TEXT,
          cheese_selection TEXT,
          has_cheese BOOLEAN DEFAULT 1,
          extra_nutella BOOLEAN DEFAULT 0,
          notes TEXT,
          status TEXT NOT NULL,
          price REAL NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      
      // Copy data from old table
      await runQuery(db, `
        INSERT INTO orders_new (id, customer_name, item_type, feteer_type, sweet_type, meat_selection, cheese_selection, has_cheese, extra_nutella, notes, status, price, created_at)
        SELECT id, customer_name, 
               CASE WHEN item_type IS NULL THEN 'feteer' ELSE item_type END,
               feteer_type,
               CASE WHEN sweet_type IS NULL THEN NULL ELSE sweet_type END,
               meat_selection, cheese_selection, has_cheese, extra_nutella, notes, status, price, created_at
        FROM orders
      `);
      
      // Drop old table and rename new one
      await runQuery(db, 'DROP TABLE orders');
      await runQuery(db, 'ALTER TABLE orders_new RENAME TO orders');
    }
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

export async function initializeDatabase() {
  const db = await getDatabase();
  return db;
}

async function insertDefaultData(db: sqlite3.Database) {
  // Check if menu items exist
  const menuCount = await getQuery(db, 'SELECT COUNT(*) as count FROM menu_config');
  if (menuCount.count === 0) {
    const defaultItems = [
      // Feteer items
      ['feteer_type', 'Feteer Helw (Custard w Sugar)', 'فطير حلو (كاسترد وسكر)', 8.0],
      ['feteer_type', 'Feteer Lahma Meshakala', 'فطير باللحمة المشكلة', 12.0],
      ['feteer_type', 'Feteer Gebna Meshakala', 'فطير بالجبنة المشكلة', 10.0],
      ['feteer_type', 'Feteer Meshaltet (Plain)', 'فطير مشلتت', 6.0],
      // Sweet items
      ['sweet_type', 'Basbousa', 'بسبوسة', 5.0],
      ['sweet_type', 'Konafa', 'كنافة', 7.0],
      ['sweet_type', 'Om Ali', 'أم علي', 6.0],
      ['sweet_type', 'Baklawa', 'بقلاوة', 4.0],
      ['sweet_type', 'Muhallabeya', 'مهلبية', 4.5],
      ['sweet_type', 'Roz bel Laban', 'رز بلبن', 4.0]
    ];

    for (const [item_type, item_name, item_name_arabic, price] of defaultItems) {
      await runQuery(db,
        'INSERT INTO menu_config (item_type, item_name, item_name_arabic, price, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [item_type, item_name, item_name_arabic, price]
      );
    }
  }

  // Check if meat types exist
  const meatCount = await getQuery(db, 'SELECT COUNT(*) as count FROM meat_types');
  if (meatCount.count === 0) {
    const defaultMeats = [
      ['Egyptian Sausage', 'سجق مصري', 0, 1],
      ['Ground Beef', 'لحمة مفرومة', 0, 1],
      ['Pasterma', 'بسطرمة', 0, 1],
      ['Chicken', 'فراخ', 0, 0]
    ];

    for (const [name, name_arabic, price, is_default] of defaultMeats) {
      await runQuery(db,
        'INSERT INTO meat_types (name, name_arabic, price, is_default, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [name, name_arabic, price, is_default]
      );
    }
  }

  // Check if cheese types exist
  const cheeseCount = await getQuery(db, 'SELECT COUNT(*) as count FROM cheese_types');
  if (cheeseCount.count === 0) {
    const defaultCheese = [
      ['White Cheese', 'جبنة بيضاء', 0],
      ['Roumi Cheese', 'جبنة رومي', 0],
      ['Mozzarella', 'موتزاريلا', 0],
      ['Feta', 'جبنة فيتا', 0]
    ];

    for (const [name, name_arabic, price] of defaultCheese) {
      await runQuery(db,
        'INSERT INTO cheese_types (name, name_arabic, price, created_at) VALUES (?, ?, ?, datetime("now"))',
        [name, name_arabic, price]
      );
    }
  }

  // Check if extra toppings exist
  const toppingsCount = await getQuery(db, 'SELECT COUNT(*) as count FROM extra_toppings');
  if (toppingsCount.count === 0) {
    const defaultToppings = [
      ['Nutella Zeyada', 'نوتيلا إضافية', 2.0, 'Feteer Helw (Custard w Sugar)']
    ];

    for (const [name, name_arabic, price, feteer_type] of defaultToppings) {
      await runQuery(db,
        'INSERT INTO extra_toppings (name, name_arabic, price, feteer_type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [name, name_arabic, price, feteer_type]
      );
    }
  }
}

// Database query functions
export async function getAllOrders(): Promise<Order[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM orders ORDER BY created_at DESC');
}

export async function getOrdersByStatus(status: string): Promise<Order[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC', [status]);
}

export async function createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<number> {
  const db = await getDatabase();
  const result = await runQuery(db,
    `INSERT INTO orders (customer_name, item_type, feteer_type, sweet_type, meat_selection, cheese_selection, has_cheese, extra_nutella, notes, status, price, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      order.customer_name,
      order.item_type,
      order.feteer_type || null,
      order.sweet_type || null,
      order.meat_selection || null,
      order.cheese_selection || null,
      order.has_cheese ? 1 : 0,
      order.extra_nutella ? 1 : 0,
      order.notes || null,
      order.status,
      order.price
    ]
  );
  return result.lastID;
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  const db = await getDatabase();
  await runQuery(db, 'UPDATE orders SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteOrder(id: number): Promise<void> {
  const db = await getDatabase();
  await runQuery(db, 'DELETE FROM orders WHERE id = ?', [id]);
}

export async function getMenuConfig(): Promise<MenuConfig[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM menu_config WHERE item_type = "feteer_type" ORDER BY item_name');
}

export async function getSweetTypes(): Promise<MenuConfig[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM menu_config WHERE item_type = "sweet_type" ORDER BY item_name');
}

export async function getMeatTypes(): Promise<MeatType[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM meat_types ORDER BY name');
}

export async function getCheeseTypes(): Promise<CheeseType[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM cheese_types ORDER BY name');
}

export async function getExtraToppings(): Promise<ExtraTopping[]> {
  const db = await getDatabase();
  return await allQuery(db, 'SELECT * FROM extra_toppings ORDER BY name');
}