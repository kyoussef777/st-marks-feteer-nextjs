import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database-neon';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check database connectivity
    const db = getDatabase();
    
    // Simple query to verify database is accessible
    await db.execute(sql`SELECT 1 as status`);

    // If we get here, everything is working
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'neon-connected',
      environment: process.env.NODE_ENV || 'unknown'
    }, { status: 200 });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'neon-disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV || 'unknown'
    }, { status: 503 });
  }
}