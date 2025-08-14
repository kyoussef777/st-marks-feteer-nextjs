CREATE TABLE "cheese_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_arabic" text,
	"price" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra_toppings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_arabic" text,
	"price" real DEFAULT 0,
	"feteer_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meat_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_arabic" text,
	"price" real DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_name" text NOT NULL,
	"item_name_arabic" text,
	"price" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"item_type" text DEFAULT 'feteer' NOT NULL,
	"feteer_type" text,
	"sweet_type" text,
	"meat_selection" text,
	"cheese_selection" text,
	"has_cheese" boolean DEFAULT true,
	"extra_nutella" boolean DEFAULT false,
	"notes" text,
	"status" text NOT NULL,
	"price" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
