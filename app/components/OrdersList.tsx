'use client';

interface Order {
  id: number;
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  feteer_type?: string;
  sweet_type?: string;
  sweet_selections?: string; // JSON string for multiple sweets
  meat_selection?: string;
  has_cheese: boolean;
  extra_nutella: boolean;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed';
  price: number;
  created_at: string;
}

interface OrdersListProps {
  orders: Order[];
  onOrderUpdate: () => void;
}

export default function OrdersList({ orders, onOrderUpdate }: OrdersListProps) {
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onOrderUpdate();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onOrderUpdate();
      } else {
        throw new Error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const printLabel = async (orderId: number) => {
    try {
      // Open the PDF label in a new window
      const labelUrl = `/api/orders/${orderId}/label`;
      const printWindow = window.open(labelUrl, '_blank');
      
      if (printWindow) {
        // Wait for the PDF to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        // Fallback: direct download if popup blocked
        window.location.href = labelUrl;
      }
    } catch (error) {
      console.error('Error printing label:', error);
      alert('Failed to print label');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const formatSweetSelections = (sweetSelections: string | undefined) => {
    if (!sweetSelections) return null;
    
    try {
      const selections = JSON.parse(sweetSelections);
      return Object.entries(selections)
        .filter(([, quantity]) => (quantity as number) > 0)
        .map(([sweetName, quantity]) => `${sweetName} (${quantity})`)
        .join(', ');
    } catch (error) {
      console.error('Error parsing sweet selections:', error);
      return sweetSelections;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-gray-400 text-3xl mb-2">🍽️</div>
        <h3 className="text-sm font-semibold text-gray-600 mb-1">No Active Orders</h3>
        <p className="text-xs text-gray-500 mb-1">All orders completed!</p>
        <p className="text-xs font-arabic text-gray-500">تم الانتهاء من جميع الطلبات!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-amber-900 mb-3">
        Active Orders ({orders.length})
        <span className="block text-sm font-arabic text-amber-700">الطلبات النشطة</span>
      </h2>

      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-lg shadow-md p-3 border-l-3 border-amber-400">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                #{order.id} - {order.customer_name}
              </h3>
              <p className="text-xs text-gray-600">{formatTime(order.created_at)}</p>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-sm font-bold text-amber-600">
                ${order.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">
                {order.item_type === 'feteer' ? '🥞' : '🍯'}
              </span>
              <div className="text-sm font-semibold text-gray-800">
                {order.item_type === 'feteer' 
                  ? order.feteer_type 
                  : order.sweet_selections 
                    ? formatSweetSelections(order.sweet_selections) || 'Multiple Sweets'
                    : order.sweet_type
                }
              </div>
            </div>
            
            {/* Show meat selection for Mixed Meat */}
            {order.feteer_type === 'Mixed Meat' && (
              <div className="bg-amber-50 rounded p-2 mb-1">
                <div className="text-xs font-medium text-amber-900">
                  🥩 {order.meat_selection?.split(',').join(', ') || 'No meats'}
                </div>
                <div className="text-xs">
                  <span className={order.has_cheese ? 'text-green-600' : 'text-red-600'}>
                    {order.has_cheese ? '✓ Cheese' : '✗ No Cheese'}
                  </span>
                </div>
              </div>
            )}

            {/* Show extra toppings */}
            {!!order.extra_nutella && (
              <div className="bg-orange-50 rounded p-1 mb-1">
                <div className="text-xs font-medium text-orange-900">
                  🍯 Extra Nutella
                </div>
              </div>
            )}

            {/* Show notes */}
            {!!order.notes && (
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs font-medium text-gray-700">📝 {order.notes}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1">
            {order.status === 'pending' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'in_progress')}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                <div className="text-center">
                  <div>▶ Start</div>
                  <div className="font-arabic text-xs">ابدأ</div>
                </div>
              </button>
            )}
            
            {order.status === 'in_progress' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'completed')}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
              >
                <div className="text-center">
                  <div>✅ Done</div>
                  <div className="font-arabic text-xs">تم</div>
                </div>
              </button>
            )}

            <button
              onClick={() => printLabel(order.id)}
              className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
            >
              <div className="text-center">
                <div>🖨️ Print</div>
                <div className="font-arabic text-xs">طباعة</div>
              </div>
            </button>
            
            <button
              onClick={() => deleteOrder(order.id)}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
            >
              <div className="text-center">
                <div>🗑️</div>
                <div className="font-arabic text-xs">حذف</div>
              </div>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}