import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const db = await getDatabase();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all orders in date range
    const orders = await allQuery(db, `
      SELECT * FROM orders 
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      ORDER BY created_at DESC
    `, [startDateStr, endDateStr]);

    // Calculate analytics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Popular items
    const popularItems: { [key: string]: number } = {};
    orders.forEach(order => {
      popularItems[order.feteer_type] = (popularItems[order.feteer_type] || 0) + 1;
    });

    // Top customers
    const topCustomers: { [key: string]: number } = {};
    orders.forEach(order => {
      topCustomers[order.customer_name] = (topCustomers[order.customer_name] || 0) + 1;
    });

    // Status breakdown
    const statusBreakdown: { [key: string]: number } = {};
    orders.forEach(order => {
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
    });

    // Daily stats
    const dailyStats: { date: string; orders: number; revenue: number }[] = [];
    const dateMap: { [key: string]: { orders: number; revenue: number } } = {};

    orders.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!dateMap[date]) {
        dateMap[date] = { orders: 0, revenue: 0 };
      }
      dateMap[date].orders += 1;
      dateMap[date].revenue += order.price;
    });

    // Fill in missing dates with 0 values
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyStats.push({
        date: dateStr,
        orders: dateMap[dateStr]?.orders || 0,
        revenue: dateMap[dateStr]?.revenue || 0
      });
    }

    const analytics = {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      popularItems,
      topCustomers,
      dailyStats,
      statusBreakdown
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

function allQuery(db: any, query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: any, rows: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}