'use client';

import { useState } from 'react';
import { useOrders } from '@/lib/orders-context';
import { ButtonSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorBoundary';
import { AuthError, NetworkError } from '@/lib/data-sync';
import { printOrderLabel } from '@/lib/print-utils';

interface Order {
  id: number;
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  feteer_type?: string;
  sweet_type?: string;
  sweet_selections?: string; // JSON string for multiple sweets (original format)
  meat_selection?: string;
  has_cheese: boolean;
  extra_nutella: boolean;
  notes?: string;
  status: 'ordered' | 'completed';
  price: number;
  created_at: string;
}

interface OrdersListProps {
  orders: Order[];
}

export default function OrdersList({ orders }: OrdersListProps) {
  const { updateOrderStatus: contextUpdateStatus, deleteOrder: contextDeleteOrder, refreshOrders } = useOrders();
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      setActionError(null);
      setActionLoading(prev => ({ ...prev, [orderId]: 'updating' }));
      await contextUpdateStatus(orderId, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
      if (error instanceof AuthError) {
        setActionError('Authentication expired. Please refresh the page.');
      } else if (error instanceof NetworkError) {
        setActionError('Network error. Please check your connection and try again.');
      } else {
        setActionError('Failed to update order status. Please try again.');
      }
    } finally {
      setActionLoading(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const deleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      setActionError(null);
      setActionLoading(prev => ({ ...prev, [orderId]: 'deleting' }));
      await contextDeleteOrder(orderId);
    } catch (error) {
      console.error('Error deleting order:', error);
      if (error instanceof AuthError) {
        setActionError('Authentication expired. Please refresh the page.');
      } else if (error instanceof NetworkError) {
        setActionError('Network error. Please check your connection and try again.');
      } else {
        setActionError('Failed to delete order. Please try again.');
      }
    } finally {
      setActionLoading(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    setRefreshing(false);
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-gray-400 text-3xl mb-2">🍽️</div>
        <h3 className="text-sm font-semibold text-gray-600 mb-1">No Active Orders</h3>
        <p className="text-xs text-gray-500 mb-1">All orders completed!</p>
        <p className="text-xs font-arabic text-gray-500">تم الانتهاء من جميع الطلبات!</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2 px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <ButtonSpinner className="w-3 h-3 mr-1" />
              Refreshing...
            </>
          ) : (
            '🔄 Refresh'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-amber-900">
          Active Orders ({orders.length})
          <span className="block text-sm font-arabic text-amber-700">الطلبات النشطة</span>
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {refreshing ? (
            <ButtonSpinner className="w-3 h-3" />
          ) : (
            '🔄'
          )}
        </button>
      </div>
      
      {/* Action error display */}
      {actionError && (
        <ErrorDisplay 
          error={actionError}
          onDismiss={() => setActionError(null)}
          className="mb-3"
        />
      )}

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
            
            {/* Show meat selection for Feteer Lahma Meshakala */}
            {order.feteer_type === 'Feteer Lahma Meshakala' && (
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
            {order.status === 'ordered' && (
              <button
                onClick={() => updateOrderStatus(order.id, 'completed')}
                disabled={actionLoading[order.id] === 'updating'}
                className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  {actionLoading[order.id] === 'updating' ? (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <ButtonSpinner className="w-3 h-3" />
                        <span>Updating...</span>
                      </div>
                      <div className="font-arabic text-xs">جاري التحديث...</div>
                    </>
                  ) : (
                    <>
                      <div>✅ Mark Complete</div>
                      <div className="font-arabic text-xs">تم إنجازه</div>
                    </>
                  )}
                </div>
              </button>
            )}

            {/* Only show print button for feteer orders */}
            {order.item_type === 'feteer' && (
              <button
                onClick={() => printLabel(order.id)}
                disabled={actionLoading[order.id] === 'printing'}
                className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  {actionLoading[order.id] === 'printing' ? (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <ButtonSpinner className="w-2 h-2" />
                        <span>Printing</span>
                      </div>
                      <div className="font-arabic text-xs">جاري الطباعة</div>
                    </>
                  ) : (
                    <>
                      <div>🖨️ Print</div>
                      <div className="font-arabic text-xs">طباعة</div>
                    </>
                  )}
                </div>
              </button>
            )}
            
            <button
              onClick={() => deleteOrder(order.id)}
              disabled={actionLoading[order.id] === 'deleting'}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                {actionLoading[order.id] === 'deleting' ? (
                  <>
                    <div className="flex items-center justify-center">
                      <ButtonSpinner className="w-2 h-2" />
                    </div>
                    <div className="font-arabic text-xs">حذف</div>
                  </>
                ) : (
                  <>
                    <div>🗑️</div>
                    <div className="font-arabic text-xs">حذف</div>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}