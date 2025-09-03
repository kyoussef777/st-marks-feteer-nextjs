'use client';

import { useState } from 'react';
import { toZonedTime, format } from 'date-fns-tz';
import LoadingSpinner, { ButtonSpinner } from '../../components/LoadingSpinner';
import { useOrders } from '@/lib/orders-context';
import { printOrderLabel } from '@/lib/print-utils';

export default function FeteerOrdersPage() {
  const { 
    allOrders, 
    orderedOrders, 
    completedOrders, 
    loading, 
    updateOrderStatus: contextUpdateStatus, 
    deleteOrder: contextDeleteOrder 
  } = useOrders();
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [filter, setFilter] = useState<'ordered' | 'completed'>('ordered');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get filtered orders based on current filter - ONLY FETEER ORDERS
  const filteredByStatus = filter === 'ordered' ? orderedOrders : completedOrders;
  const orders = filteredByStatus.filter(order => order.item_type === 'feteer');

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: 'updating' }));
      await contextUpdateStatus(orderId, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setActionLoading(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const deleteOrder = async (orderId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: 'deleting' }));
      await contextDeleteOrder(orderId);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    } finally {
      setActionLoading(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const deleteAllOrders = async () => {
    if (!confirm('Are you sure you want to delete ALL feteer orders? This cannot be undone.')) {
      return;
    }

    try {
      setDeleteAllLoading(true);
      // Delete only feteer orders
      const feteerOrders = allOrders.filter(order => order.item_type === 'feteer');
      const deletePromises = feteerOrders.map(order => 
        contextDeleteOrder(order.id)
      );
      
      await Promise.all(deletePromises);
      alert('All feteer orders deleted successfully');
    } catch (error) {
      console.error('Error deleting all orders:', error);
      alert('Failed to delete all orders');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const printLabel = async (orderId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [orderId]: 'printing' }));
      
      // Use the shared print utility with popup and auto-close functionality
      await printOrderLabel(orderId);
    } catch (error) {
      console.error('Error printing label:', error);
      alert('Failed to print label');
    } finally {
      setActionLoading(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(toZonedTime(new Date(dateString), 'America/New_York'), 'MMM d, h:mm a', { timeZone: 'America/New_York' });
  };

  const filteredOrders = orders.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner 
            size="xl" 
            message="Loading feteer orders..." 
            messageAr="جاري تحميل طلبات الفطير..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-amber-900 mb-2">
          🥞 Feteer Orders
        </h1>
        <p className="font-arabic-heading text-lg">
          طلبات الفطير
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Status Filter */}
        <div className="flex bg-white rounded-lg shadow-md p-1">
          <button
            onClick={() => setFilter('ordered')}
            className={`px-6 py-2 rounded-md transition-all ${
              filter === 'ordered'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
          >
            <div className="text-center">
              <div className="text-sm sm:text-base">Ordered ({orderedOrders.filter(o => o.item_type === 'feteer').length})</div>
              <div className="font-arabic text-xs sm:text-sm">مطلوبة</div>
            </div>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-2 rounded-md transition-all ${
              filter === 'completed'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            <div className="text-center">
              <div className="text-sm sm:text-base">Completed ({completedOrders.filter(o => o.item_type === 'feteer').length})</div>
              <div className="font-arabic text-xs sm:text-sm">مكتملة</div>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          
          {/* Delete All Button */}
          <button
            onClick={deleteAllOrders}
            disabled={deleteAllLoading || orders.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleteAllLoading ? <ButtonSpinner className="w-4 h-4" /> : '🗑️'}
            <div className="text-center ml-1">
              <div className="text-sm">Delete All</div>
            </div>
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                      #{order.id}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{order.customer_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'ordered' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.status === 'ordered' ? 'Ordered' : 'Completed'}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-gray-600 text-sm">Feteer Type:</p>
                      <p className="font-semibold text-amber-700">{order.feteer_type}</p>
                    </div>
                    
                    {order.meat_selection && (
                      <div>
                        <p className="text-gray-600 text-sm">Meat Selection:</p>
                        <p className="font-medium">{order.meat_selection}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-gray-600 text-sm">Cheese:</p>
                      <p className="font-medium">{order.has_cheese ? 'With Cheese' : 'No Cheese'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 text-sm">Extra Nutella:</p>
                      <p className="font-medium">{order.extra_nutella ? 'Yes (+$2)' : 'No'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 text-sm">Order Time:</p>
                      <p className="font-medium">{formatDateTime(order.created_at)}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mb-3">
                      <p className="text-gray-600 text-sm">Notes:</p>
                      <p className="font-medium text-gray-800">{order.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-green-600">
                      ${order.price?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2">
                  {order.status === 'ordered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      disabled={actionLoading[order.id] === 'updating'}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {actionLoading[order.id] === 'updating' && <ButtonSpinner className="w-4 h-4" />}
                      <div className="text-center">
                        <div className="text-sm">Mark Complete</div>
                        <div className="font-arabic text-xs">إكمال</div>
                      </div>
                    </button>
                  )}
                  
                  {order.status === 'completed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ordered')}
                      disabled={actionLoading[order.id] === 'updating'}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {actionLoading[order.id] === 'updating' && <ButtonSpinner className="w-4 h-4" />}
                      <div className="text-center">
                        <div className="text-sm">Mark Ordered</div>
                        <div className="font-arabic text-xs">طلب</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => printLabel(order.id)}
                    disabled={actionLoading[order.id] === 'printing'}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading[order.id] === 'printing' && <ButtonSpinner className="w-4 h-4" />}
                    <div className="text-center">
                      <div className="text-sm">Print Label</div>
                      <div className="font-arabic text-xs">طباعة</div>
                    </div>
                  </button>

                  <button
                    onClick={() => deleteOrder(order.id)}
                    disabled={actionLoading[order.id] === 'deleting'}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {actionLoading[order.id] === 'deleting' && <ButtonSpinner className="w-4 h-4" />}
                    <div className="text-center">
                      <div className="text-sm">Delete</div>
                      <div className="font-arabic text-xs">حذف</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-600 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-6xl mb-4">🥞</div>
            <h3 className="text-xl font-semibold mb-2">No Feteer Orders Found</h3>
            <p className="mb-2">
              {searchTerm 
                ? `No feteer orders match "${searchTerm}"`
                : `No ${filter} feteer orders yet.`
              }
            </p>
            <p className="font-arabic">
              {searchTerm 
                ? `لا توجد طلبات فطير تطابق "${searchTerm}"`
                : `لا توجد طلبات فطير ${filter === 'ordered' ? 'مطلوبة' : 'مكتملة'} حتى الآن`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}