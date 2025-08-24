import { pgTable, serial, text, real, boolean, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customer_name: text('customer_name').notNull(),
  item_type: text('item_type').notNull().default('feteer'),
  feteer_type: text('feteer_type'),
  sweet_type: text('sweet_type'),
  sweet_selections: text('sweet_selections'), // JSON string for multiple sweets with quantities
  meat_selection: text('meat_selection'),
  cheese_selection: text('cheese_selection'),
  has_cheese: boolean('has_cheese').default(true),
  extra_nutella: boolean('extra_nutella').default(false),
  notes: text('notes'),
  status: text('status').notNull(),
  price: real('price').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const menu_config = pgTable('menu_config', {
  id: serial('id').primaryKey(),
  item_type: text('item_type').notNull(),
  item_name: text('item_name').notNull(),
  item_name_arabic: text('item_name_arabic'),
  price: real('price'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const meat_types = pgTable('meat_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  name_arabic: text('name_arabic'),
  price: real('price').default(0),
  is_default: boolean('is_default').default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const cheese_types = pgTable('cheese_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  name_arabic: text('name_arabic'),
  price: real('price').default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const extra_toppings = pgTable('extra_toppings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  name_arabic: text('name_arabic'),
  price: real('price').default(0),
  feteer_type: text('feteer_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export type MenuConfig = typeof menu_config.$inferSelect;
export type NewMenuConfig = typeof menu_config.$inferInsert;

export type MeatType = typeof meat_types.$inferSelect;
export type NewMeatType = typeof meat_types.$inferInsert;

export type CheeseType = typeof cheese_types.$inferSelect;
export type NewCheeseType = typeof cheese_types.$inferInsert;

export type ExtraTopping = typeof extra_toppings.$inferSelect;
export type NewExtraTopping = typeof extra_toppings.$inferInsert;

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('cashier'), // 'admin' or 'cashier'
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_login: timestamp('last_login'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;