import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getAllOrders, getOrdersByStatus, getMenuConfig, getSweetTypes } from '@/lib/database-hybrid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    let orders;
    if (statusParam && statusParam !== 'all') {
      // Handle multiple status values separated by comma
      const statuses = statusParam.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        orders = await getOrdersByStatus(statuses[0]);
      } else {
        // For multiple statuses, get all orders and filter
        const allOrders = await getAllOrders();
        orders = allOrders.filter(order => statuses.includes(order.status));
      }
    } else {
      orders = await getAllOrders();
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.customer_name || !body.item_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (body.item_type === 'feteer' && !body.feteer_type) {
      return NextResponse.json({ error: 'Feteer type is required for feteer orders' }, { status: 400 });
    }

    if (body.item_type === 'sweet' && !body.sweet_type && !body.sweet_selections) {
      return NextResponse.json({ error: 'Sweet type or sweet selections are required for sweet orders' }, { status: 400 });
    }

    // Calculate price based on selections
    let price = 0;
    
    if (body.item_type === 'feteer') {
      // Get feteer price
      const feteerTypes = await getMenuConfig();
      const selectedFeteer = feteerTypes.find(f => f.item_name === body.feteer_type);
      if (selectedFeteer && selectedFeteer.price) {
        price += selectedFeteer.price;
      }
      
      // Add additional meat costs
      if (body.additional_meat_selection && Array.isArray(body.additional_meat_selection)) {
        price += body.additional_meat_selection.length * 2.0;
      }
      
      // Add extra topping costs
      if (body.extra_nutella) {
        price += 2.0;
      }
    } else if (body.item_type === 'sweet') {
      const sweetTypes = await getSweetTypes();
      
      if (body.sweet_selections) {
        // Handle multiple sweet selections
        try {
          const sweetSelections = typeof body.sweet_selections === 'string' 
            ? JSON.parse(body.sweet_selections) 
            : body.sweet_selections;
          
          Object.entries(sweetSelections).forEach(([sweetName, quantity]) => {
            const sweet = sweetTypes.find(s => s.item_name === sweetName);
            if (sweet && sweet.price && typeof quantity === 'number' && quantity > 0) {
              price += sweet.price * quantity;
            }
          });
        } catch (error) {
          console.error('Error parsing sweet_selections:', error);
        }
      } else if (body.sweet_type) {
        // Handle single sweet selection (backward compatibility)
        const selectedSweet = sweetTypes.find(s => s.item_name === body.sweet_type);
        if (selectedSweet && selectedSweet.price) {
          price += selectedSweet.price;
        }
      }
    }

    const order = {
      customer_name: body.customer_name.trim(),
      item_type: body.item_type,
      feteer_type: body.feteer_type || null,
      sweet_type: body.sweet_type || null,
      sweet_selections: body.sweet_selections || null,
      meat_selection: body.meat_selection ? 
        (Array.isArray(body.meat_selection) ? body.meat_selection.join(',') : body.meat_selection) : 
        null,
      cheese_selection: body.cheese_selection || null,
      has_cheese: body.has_cheese === true || body.has_cheese === 'true',
      extra_nutella: body.extra_nutella === true || body.extra_nutella === 'true',
      notes: body.notes?.trim() || null,
      status: body.status || 'pending' as const,
      price: Math.round(price * 100) / 100 // Round to 2 decimal places
    };

    const orderId = await createOrder(order);
    
    return NextResponse.json({ id: orderId, ...order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}