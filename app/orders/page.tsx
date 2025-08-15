'use client';

import { useState, useEffect } from 'react';
import { toZonedTime, format } from 'date-fns-tz';

interface Order {
  id: number;
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  feteer_type?: string;
  sweet_type?: string;
  meat_selection?: string;
  cheese_selection?: string;
  has_cheese: boolean;
  extra_nutella: boolean;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed';
  price: number;
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'in_progress' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        // Filter to show only feteer orders
        const feteerOrders = data.filter((order: Order) => order.item_type === 'feteer');
        setOrders(feteerOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
        fetchOrders();
      } else {
        alert('Failed to update order status');
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
        fetchOrders();
      } else {
        alert('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  const printLabel = async (orderId: number) => {
    try {
      const labelUrl = `/api/orders/${orderId}/label`;
      const printWindow = window.open(labelUrl, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        window.location.href = labelUrl;
      }
    } catch (error) {
      console.error('Error printing label:', error);
      alert('Failed to print label');
    }
  };

  const getWaitTime = (createdAt: string) => {
    const now = toZonedTime(new Date(), 'America/New_York');
    const created = toZonedTime(new Date(createdAt), 'America/New_York');
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    
    return `${Math.floor(diffHours / 24)}d`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && (order.status === 'pending' || order.status === 'in_progress')) ||
                         order.status === filter;
    const itemName = order.item_type === 'sweet' ? order.sweet_type : order.feteer_type;
    const matchesSearch = searchTerm === '' || 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (itemName && itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.id.toString().includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });

  const orderCounts = {
    all: orders.length,
    active: orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length,
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">
          Feteer Orders
        </h1>
        <p className="font-arabic-heading">
          طلبات الفطير - الفطير فقط
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'active', label: 'Active Orders', labelAr: 'الطلبات النشطة', icon: '🔥' },
              { key: 'all', label: 'All Orders', labelAr: 'كل الطلبات', icon: '📋' },
              { key: 'pending', label: 'Pending', labelAr: 'في الانتظار', icon: '⏳' },
              { key: 'in_progress', label: 'In Progress', labelAr: 'قيد التحضير', icon: '👨‍🍳' },
              { key: 'completed', label: 'Completed', labelAr: 'مكتمل', icon: '✅' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  filter === filterOption.key
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{filterOption.icon}</span>
                  <div className="text-left">
                    <div className="text-sm">{filterOption.label}</div>
                    <div className="font-arabic-small">{filterOption.labelAr}</div>
                  </div>
                  <span className="ml-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {orderCounts[filterOption.key as keyof typeof orderCounts]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search orders, customers, or order #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Orders Found</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? `No orders match your search "${searchTerm}"` 
              : filter === 'all' 
                ? 'No orders available' 
                : `No ${filter.replace('_', ' ')} orders`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md border-l-4 border-amber-500">
              <div className="p-3">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        #{order.id} - {order.customer_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-600">
                          {getWaitTime(order.created_at)} ago • {format(toZonedTime(new Date(order.created_at), 'America/New_York'), 'h:mm a', { timeZone: 'America/New_York' })} EST
                        </p>
                        <span className="font-arabic text-xs text-amber-700 font-semibold">
                          طلب #{order.id} - {order.customer_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                      order.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-amber-600">
                      ${order.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order Details - More Compact */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800">
                      {order.item_type === 'sweet' ? '🍰' : '🥞'} {order.item_type === 'sweet' ? order.sweet_type : order.feteer_type}
                    </div>
                    <div className="font-arabic text-sm text-amber-700 font-bold">
                      {order.item_type === 'sweet' ? (
                        order.sweet_type === 'Basbousa' ? 'بسبوسة' :
                        order.sweet_type === 'Kunafa' ? 'كنافة' :
                        order.sweet_type === 'Om Ali' ? 'أم علي' :
                        order.sweet_type === 'Baklava' ? 'بقلاوة' :
                        order.sweet_type === 'Muhallabia' ? 'مهلبية' :
                        order.sweet_type === 'Rice Pudding' ? 'رز بلبن' : 'حلوى'
                      ) : (
                        order.feteer_type === 'Mixed Meat' ? 'لحمة مشكلة' :
                        order.feteer_type === 'Sweet (Custard and Sugar)' ? 'حلو (كسترد وسكر)' :
                        order.feteer_type === 'Feteer Meshaltet (Plain)' ? 'فطير مشلتت سادة' : 'فطير'
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {order.item_type === 'feteer' && order.feteer_type === 'Mixed Meat' && (
                      <div className="bg-amber-50 rounded p-2 text-xs">
                        <span className="text-amber-900 font-medium">
                          🥩 {order.meat_selection?.split(',').join(', ') || 'No meats'}
                        </span>
                        <span className={`ml-2 ${order.has_cheese ? 'text-green-600' : 'text-red-600'}`}>
                          {order.has_cheese ? '✓ جبنة' : '✗ بدون جبنة'}
                        </span>
                      </div>
                    )}

                    {order.item_type === 'sweet' && (
                      <div className="bg-pink-50 rounded p-2 text-xs">
                        <span className="text-pink-900 font-medium">🍰 حلوى</span>
                      </div>
                    )}

                    {!!order.extra_nutella && (
                      <div className="bg-orange-50 rounded p-2 text-xs">
                        <span className="text-orange-900 font-medium">🍯 نوتيلا إضافية</span>
                      </div>
                    )}

                    {order.notes && (
                      <div className="bg-gray-50 rounded p-2 text-xs text-gray-700">
                        <span className="font-medium">📝</span> {order.notes}
                        <span className="font-arabic text-amber-700 ml-2">ملاحظات</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Compact */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
                  {/* Status Change Buttons */}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      ▶️ ابدأ الطبخ (Start Cooking)
                    </button>
                  )}
                  
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      ✅ مكتمل (Complete)
                    </button>
                  )}

                  {order.status === 'completed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                    >
                      ↩️ قيد التحضير (In Progress)
                    </button>
                  )}

                  {/* Print Label Button */}
                  <button
                    onClick={() => printLabel(order.id)}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                  >
                    🖨️ طباعة (Print)
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteOrder(order.id)}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    🗑️ حذف (Delete)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats / إحصائيات سريعة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{orderCounts.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{orderCounts.in_progress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{orderCounts.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              ${orders.reduce((sum, order) => sum + order.price, 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>
      </div>
    </div>
  );
}