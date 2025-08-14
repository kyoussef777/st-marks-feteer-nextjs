# Neon Database Setup for St. Mark's Sweets & Feteer App

This guide will help you set up Neon PostgreSQL database for deployment to Vercel.

## 🚀 Quick Setup

### 1. Create a Neon Account
1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up for a free account
3. Create a new project called "st-marks-sweets-feteer"

### 2. Get Your Database URL
1. In your Neon project dashboard, go to the "Connection Details" section
2. Copy the connection string that looks like:
   ```
   postgresql://username:password@hostname/dbname?sslmode=require
   ```

### 3. Set Environment Variables

#### For Local Development:
1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Update `.env.local` with your Neon database URL:
   ```
   DATABASE_URL="your_neon_connection_string_here"
   ```

#### For Vercel Deployment:
1. In your Vercel project dashboard, go to Settings > Environment Variables
2. Add a new environment variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon connection string
   - **Environment**: All (Production, Preview, Development)

### 4. Initialize the Database
The database schema and seed data will be automatically created when you first deploy or run the app locally.

To manually initialize:
```bash
npm run db:push
```

## 📝 Database Schema

The app uses the following tables:
- `orders` - Customer orders (both feteer and sweets)
- `menu_config` - Menu items (feteer types and sweet types)
- `meat_types` - Available meat options
- `cheese_types` - Available cheese options
- `extra_toppings` - Additional toppings and extras

## 🔧 Development Commands

```bash
# Push schema to database
npm run db:push

# Generate migration files
npm run db:generate

# Open Drizzle Studio (database browser)
npm run db:studio
```

## 🚀 Deployment Steps

1. **Push to GitHub** (if not already done)
2. **Connect to Vercel**:
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
3. **Set Environment Variables** in Vercel (see step 3 above)
4. **Deploy** - Vercel will automatically build and deploy your app

## 🔍 Verifying the Setup

After deployment:
1. Visit your Vercel app URL
2. The database will automatically initialize with default menu items
3. Test creating an order to ensure everything works

## 📊 Default Data

The app includes default data for:
- **Feteer Types**: Sweet (Custard and Sugar), Mixed Meat, Mixed Cheese, Feteer Meshaltet (Plain)
- **Sweet Types**: Basbousa, Kunafa, Om Ali, Baklava, Muhallabia, Rice Pudding
- **Meat Types**: Egyptian Sausage, Ground Beef, Pasterma, Chicken
- **Cheese Types**: White Cheese, Roumi Cheese, Mozzarella, Feta
- **Extra Toppings**: Extra Nutella

## 🛠️ Troubleshooting

### Connection Issues
- Ensure your DATABASE_URL is correct and includes `?sslmode=require`
- Check that your Neon database is active (free tier databases may go to sleep)

### Schema Issues
- Run `npm run db:push` to sync schema changes
- Check Neon console for any error messages

### Deployment Issues
- Verify environment variables are set in Vercel
- Check Vercel function logs for detailed error messages

## 🔄 Migration from SQLite

The app has been migrated from SQLite to PostgreSQL (Neon). All existing functionality remains the same, but now supports:
- ✅ Production deployment on Vercel
- ✅ Concurrent connections
- ✅ Better performance and reliability
- ✅ Automatic backups (Neon free tier includes 7-day history)

## 🆘 Need Help?

- [Neon Documentation](https://neon.tech/docs/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)