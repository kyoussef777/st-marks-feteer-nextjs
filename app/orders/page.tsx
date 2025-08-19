'use client';

import { useState } from 'react';
import { toZonedTime, format } from 'date-fns-tz';
import LoadingSpinner, { ButtonSpinner } from '../components/LoadingSpinner';
import { useOrders } from '@/lib/orders-context';

// Order interface now imported from context

export default function OrdersPage() {
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

  // Remove useEffect - orders are now handled by context

  // Remove fetchOrders - now handled by context

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
    if (!confirm('Are you sure you want to delete ALL orders? This cannot be undone.')) {
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
      alert('All orders deleted successfully');
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
      
      // First check if the order exists
      const checkResponse = await fetch(`/api/orders/${orderId}`);
      if (!checkResponse.ok) {
        alert('Order not found. Please refresh and try again.');
        return;
      }
      
      const labelUrl = `/api/orders/${orderId}/label`;
      const printWindow = window.open(labelUrl, '_blank', 'width=800,height=600');
      
      if (printWindow) {
        // Wait for the PDF to load, then trigger print and auto-close
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            
            // Auto-close after printing with multiple fallback methods
            setTimeout(() => {
              try {
                printWindow.close();
              } catch {
                console.log('Auto-close blocked by browser, window will remain open');
              }
            }, 2000); // 2 seconds delay to ensure print dialog has appeared
            
            // Listen for print events to close immediately after printing
            printWindow.addEventListener('afterprint', () => {
              setTimeout(() => {
                try {
                  printWindow.close();
                } catch {
                  console.log('Auto-close blocked by browser');
                }
              }, 500);
            });
            
            // Fallback: Focus back to main window
            setTimeout(() => {
              window.focus();
            }, 3000);
          }, 1000);
        };
      } else {
        // Fallback: direct download if popup blocked
        window.location.href = labelUrl;
      }
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


  const filteredOrders = orders.filter(order => {
    const itemName = order.item_type === 'sweet' ? order.sweet_type : order.feteer_type;
    const matchesSearch = searchTerm === '' || 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (itemName && itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.id.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  // Count only feteer orders
  const feteerOrderedOrders = orderedOrders.filter(order => order.item_type === 'feteer');
  const feteerCompletedOrders = completedOrders.filter(order => order.item_type === 'feteer');
  
  const orderCounts = {
    ordered: feteerOrderedOrders.length,
    completed: feteerCompletedOrders.length
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner 
            size="xl" 
            message="Loading orders..." 
            messageAr="جاري تحميل الطلبات..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">
          All Orders
        </h1>
        <p className="font-arabic-heading">
          جميع الطلبات - فطير وحلويات
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ordered', label: 'Ordered', labelAr: 'مطلوبة', icon: '📋' },
              { key: 'completed', label: 'Completed', labelAr: 'مكتمل', icon: '✅' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as 'ordered' | 'completed')}
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

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
            <div className="relative flex-1">
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
            
            {/* Delete All Button - Only for feteer orders */}
            {feteerOrderedOrders.length + feteerCompletedOrders.length > 0 && (
              <button
                onClick={deleteAllOrders}
                disabled={deleteAllLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteAllLoading ? (
                  <>
                    <ButtonSpinner />
                    Deleting...
                  </>
                ) : (
                  <>
                    🗑️ Delete All Feteer ({feteerOrderedOrders.length + feteerCompletedOrders.length})
                  </>
                )}
              </button>
            )}
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
              : `No ${filter} orders`}
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
                      order.status === 'ordered' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
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
                <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
                  {/* Status Change Buttons */}
                  {order.status === 'ordered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      disabled={actionLoading[order.id] === 'updating'}
                      className="px-6 py-3 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading[order.id] === 'updating' ? (
                        <>
                          <ButtonSpinner />
                          <div>
                            <div>Updating...</div>
                            <div className="font-arabic text-sm">جاري التحديث...</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>✅</span>
                          <div>
                            <div>Mark Complete</div>
                            <div className="font-arabic text-sm">إنجاز الطلب</div>
                          </div>
                        </>
                      )}
                    </button>
                  )}

                  {order.status === 'completed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ordered')}
                      disabled={actionLoading[order.id] === 'updating'}
                      className="px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading[order.id] === 'updating' ? (
                        <>
                          <ButtonSpinner />
                          <div>
                            <div>Updating...</div>
                            <div className="font-arabic text-sm">جاري التحديث...</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>↩️</span>
                          <div>
                            <div>Reopen Order</div>
                            <div className="font-arabic text-sm">إعادة فتح الطلب</div>
                          </div>
                        </>
                      )}
                    </button>
                  )}

                  {/* Print Label Button - Only for feteer orders */}
                  {order.item_type === 'feteer' && (
                    <button
                      onClick={() => printLabel(order.id)}
                      disabled={actionLoading[order.id] === 'printing'}
                      className="px-6 py-3 bg-purple-600 text-white text-base font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading[order.id] === 'printing' ? (
                        <>
                          <ButtonSpinner />
                          <div>
                            <div>Printing...</div>
                            <div className="font-arabic text-sm">جاري الطباعة...</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <span>🖨️</span>
                          <div>
                            <div>Print Label</div>
                            <div className="font-arabic text-sm">طباعة الملصق</div>
                          </div>
                        </>
                      )}
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteOrder(order.id)}
                    disabled={actionLoading[order.id] === 'deleting'}
                    className="px-6 py-3 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading[order.id] === 'deleting' ? (
                      <>
                        <ButtonSpinner />
                        <div>
                          <div>Deleting...</div>
                          <div className="font-arabic text-sm">جاري الحذف...</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        <div>
                          <div>Delete</div>
                          <div className="font-arabic text-sm">حذف الطلب</div>
                        </div>
                      </>
                    )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{orderCounts.ordered}</div>
            <div className="text-sm text-gray-600">Ordered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{orderCounts.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}