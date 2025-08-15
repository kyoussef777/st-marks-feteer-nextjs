import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/database-hybrid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const itemType = searchParams.get('item_type'); // Optional filter by item type

    let orders = await getAllOrders();

    // Filter by item type if specified
    if (itemType && itemType !== 'all') {
      orders = orders.filter(order => order.item_type === itemType);
    }

    if (format === 'csv') {
      // Generate CSV content
      const headers = [
        'ID',
        'Customer Name',
        'Item Type',
        'Feteer Type',
        'Sweet Type',
        'Sweet Selections',
        'Meat Selection',
        'Has Cheese',
        'Extra Nutella',
        'Notes',
        'Status',
        'Price',
        'Created At',
        'Wait Time (minutes)'
      ];

      const formatSweetSelections = (sweetSelections: string | null) => {
        if (!sweetSelections) return '';
        try {
          const selections = JSON.parse(sweetSelections);
          return Object.entries(selections)
            .filter(([_, quantity]) => (quantity as number) > 0)
            .map(([sweetName, quantity]) => `${sweetName} (${quantity})`)
            .join('; ');
        } catch {
          return sweetSelections;
        }
      };

      const getWaitTime = (createdAt: string) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now.getTime() - created.getTime();
        return Math.floor(diffMs / (1000 * 60)); // minutes
      };

      const csvRows = orders.map(order => [
        order.id,
        `"${order.customer_name}"`,
        order.item_type,
        order.feteer_type || '',
        order.sweet_type || '',
        `"${formatSweetSelections((order as any).sweet_selections)}"`,
        `"${order.meat_selection || ''}"`,
        order.has_cheese ? 'Yes' : 'No',
        order.extra_nutella ? 'Yes' : 'No',
        `"${order.notes || ''}"`,
        order.status,
        order.price,
        order.created_at,
        getWaitTime(order.created_at.toString())
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      const filename = `orders-export-${itemType || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json({ error: 'Failed to export orders' }, { status: 500 });
  }
}