# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **St. Mark's Sweets & Feteer** - a bilingual (Arabic/English) order management system for a Middle Eastern restaurant. The app handles two main product categories: feteer (Egyptian pastries) and sweets (desserts), with complex customization options including meat/cheese selections and toppings.

## Development Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)

# Build and deployment  
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint checking

# Database operations
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run database migrations  
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database browser)

# Docker deployment
./deploy-dev.sh start    # Start development environment
./deploy-dev.sh logs     # View development logs
./deploy-prod.sh         # Full production deployment with SSL
./deploy-prod.sh status  # Check production status
```

## Architecture Overview

### Database Architecture - Hybrid System
The app uses a **hybrid database approach** (`/lib/database-hybrid.ts`) that automatically:
- **Primary**: Neon PostgreSQL for production/Vercel deployment
- **Fallback**: SQLite for local development when Neon is unavailable
- **Auto-detection**: Checks `DATABASE_URL` validity and falls back gracefully

**Database modules:**
- `/lib/database-hybrid.ts` - Main hybrid implementation (use this for all new features)
- `/lib/database-neon.ts` - Neon PostgreSQL implementation  
- `/lib/database.ts` - SQLite fallback implementation
- `/lib/schema.ts` - Drizzle ORM schema definitions

### Bilingual UI Pattern
All user-facing buttons and text follow this structure:
```jsx
<div className="text-center">
  <div className="text-sm">English Text</div>
  <div className="font-arabic text-xs">النص العربي</div>
</div>
```

### Core Data Models
- **Orders**: Customer orders with item type (feteer/sweet), customizations, status tracking
- **Menu Config**: Bilingual menu items with pricing
- **Meat/Cheese Types**: Available proteins and cheese options
- **Extra Toppings**: Additional items like "Extra Nutella"

### API Routes Structure
All API routes are in `/app/api/` and follow RESTful patterns:
- `/api/orders` - Order CRUD operations
- `/api/menu` - Menu item management
- `/api/analytics` - Sales and performance data
- `/api/health` - Docker health checks

## Key Components

### Frontend Components (`/app/components/`)
- **OrderForm.tsx**: Main order creation form with dynamic product selection
- **OrdersList.tsx**: Real-time order queue with status management  
- **Navbar.tsx**: Bilingual navigation with page routing

### Pages (`/app/`)
- **page.tsx**: Home page with order form + live orders list
- **orders/page.tsx**: Complete order history and management
- **analytics/page.tsx**: Business analytics dashboard
- **menu/page.tsx**: Menu item editor for feteer and sweets

## Important Patterns

### Order Status Flow
Orders progress through: `pending` → `in_progress` → `completed` → `delivered`

### Feteer Customization Logic
When item type is "Mixed Meat":
- User selects multiple meats from available options
- Optional cheese addition
- Custom pricing calculation based on selections

### PDF Label Generation  
`/api/orders/[id]/label/route.ts` generates thermal printer labels with:
- Arabic text sanitization for PDF compatibility
- Automatic text wrapping for small label format
- Order details formatting for kitchen use

### Environment Variables
- `DATABASE_URL`: Neon PostgreSQL connection (falls back to SQLite if invalid)
- Development uses `.env.local`
- Production uses Vercel environment variables

## Docker & Deployment

The app supports multiple deployment methods:
- **Development**: Standard Next.js dev server or Docker via `deploy-dev.sh`
- **Production**: Full Docker stack with Nginx, SSL, monitoring via `deploy-prod.sh`
- **Vercel**: Cloud deployment with Neon database (see `NEON_SETUP.md`)

## Database Migration Notes

The app was migrated from SQLite to PostgreSQL but maintains backward compatibility. When working with database code:
- **Always import from `/lib/database-hybrid.ts`** (not database-neon.ts or database.ts)
- The hybrid system handles database selection automatically
- Schema is defined in `/lib/schema.ts` using Drizzle ORM
- Seed data includes default feteer types, sweets, meats, and cheese options

## Bilingual Requirements

When adding new UI elements:
- All customer-facing text must be bilingual (Arabic + English)
- Use the established button pattern shown above
- Arabic text uses `font-arabic` class for proper font rendering
- Form labels and error messages should be bilingual
- Menu items support both `item_name` and `item_name_arabic` fields

## Testing Commands

The app doesn't have automated tests configured yet. Manual testing should focus on:
- Order creation flow for both feteer and sweets
- Status transitions in OrdersList component
- PDF label generation functionality
- Database fallback behavior