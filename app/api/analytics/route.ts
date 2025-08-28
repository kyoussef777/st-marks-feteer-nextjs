import { NextRequest, NextResponse } from 'next/server';
import { getOrdersInDateRange } from '@/lib/database-neon';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all orders in date range
    const orders = await getOrdersInDateRange(startDateStr, endDateStr);

    // Calculate analytics - handle missing prices
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate revenue by item type
    const feteerOrders = orders.filter(order => order.item_type === 'feteer');
    const sweetOrders = orders.filter(order => order.item_type === 'sweet');
    
    const feteerRevenue = feteerOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    const sweetRevenue = sweetOrders.reduce((sum, order) => sum + (order.price || 0), 0);
    
    const feteerCount = feteerOrders.length;
    const sweetCount = sweetOrders.length;
    
    const feteerAverageOrder = feteerCount > 0 ? feteerRevenue / feteerCount : 0;
    const sweetAverageOrder = sweetCount > 0 ? sweetRevenue / sweetCount : 0;

    // Popular items - handle both sweet_type and sweet_selections
    const popularItems: { [key: string]: number } = {};
    orders.forEach(order => {
      if (order.item_type === 'sweet') {
        if (order.sweet_selections) {
          // Handle multiple sweet selections
          try {
            const selections = JSON.parse(order.sweet_selections);
            Object.entries(selections).forEach(([sweetName, quantity]) => {
              if (typeof quantity === 'number' && quantity > 0) {
                popularItems[sweetName] = (popularItems[sweetName] || 0) + quantity;
              }
            });
          } catch {
            // Fallback if JSON parse fails
            const itemName = order.sweet_type || 'Unknown Sweet';
            popularItems[itemName] = (popularItems[itemName] || 0) + 1;
          }
        } else if (order.sweet_type) {
          popularItems[order.sweet_type] = (popularItems[order.sweet_type] || 0) + 1;
        }
      } else if (order.feteer_type) {
        popularItems[order.feteer_type] = (popularItems[order.feteer_type] || 0) + 1;
      }
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
      const date = typeof order.created_at === 'string' 
        ? order.created_at.split('T')[0]
        : order.created_at.toISOString().split('T')[0];
      if (!dateMap[date]) {
        dateMap[date] = { orders: 0, revenue: 0 };
      }
      dateMap[date].orders += 1;
      dateMap[date].revenue += (order.price || 0);
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
      statusBreakdown,
      // New categorized analytics
      feteerRevenue,
      sweetRevenue,
      feteerCount,
      sweetCount,
      feteerAverageOrder,
      sweetAverageOrder
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

