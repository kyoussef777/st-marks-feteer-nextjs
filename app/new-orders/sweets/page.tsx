'use client';

import { useState, useEffect } from 'react';
import OrderForm from '../../components/OrderForm';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ErrorDisplay } from '../../components/ErrorBoundary';
import { useOrders } from '@/lib/orders-context';

export default function SweetNewOrdersPage() {
  const { 
    completedOrders, 
    loading: ordersLoading, 
    error: ordersError,
    createOrder, 
    refreshOrders,
    isOnline 
  } = useOrders();
  
  const [menuData, setMenuData] = useState({
    feteerTypes: [],
    sweetTypes: [],
    meatTypes: [],
    cheeseTypes: [],
    extraToppings: []
  });
  const [loading, setLoading] = useState(true);

  // Filter for recent sweet orders (last 10)
  const recentSweetOrders = completedOrders
    .filter(order => order.item_type === 'sweet')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  useEffect(() => {
    // Initialize database first
    const initializeApp = async () => {
      try {
        await fetch('/api/init', { method: 'POST' });
        await fetchMenuData();
        // Orders are now handled by context
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const fetchMenuData = async () => {
    try {
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        setMenuData(data);
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
    }
  };

  const handleOrderCreated = async (orderData: Record<string, unknown>) => {
    try {
      // Force item_type to be 'sweet' for this page
      const sweetOrderData = { ...orderData, item_type: 'sweet' };
      const newOrder = await createOrder(sweetOrderData);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const formatSweetSelections = (sweetSelections: string | undefined) => {
    if (!sweetSelections) return '';
    try {
      const selections = JSON.parse(sweetSelections);
      return Object.entries(selections)
        .filter(([, quantity]) => (quantity as number) > 0)
        .map(([sweetName, quantity]) => `${sweetName} (${quantity})`)
        .join(', ');
    } catch {
      return sweetSelections;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  // Show initial loading screen for both menu and orders
  if (loading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center">
        <LoadingSpinner 
          size="xl" 
          message="Loading Sweet Orders..." 
          messageAr="جاري تحميل طلبات الحلويات..."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-pink-900 mb-2">
            🍯 New Sweet Orders
          </h1>
          <p className="font-arabic-heading text-lg">
            طلبات حلويات جديدة
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Sweet orders are automatically completed - no customer names needed
          </p>
          <p className="text-xs text-gray-500 font-arabic">
            طلبات الحلويات تكتمل تلقائياً - لا نحتاج أسماء العملاء
          </p>
        </div>

        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 lg:gap-4 min-h-[calc(100vh-10rem)]">
          {/* Order Form - Mobile: Full width, Desktop: 3/4 */}
          <div className="order-1 lg:col-span-3 flex-1 lg:overflow-y-auto">
            <OrderForm 
              menuData={menuData} 
              onOrderCreated={handleOrderCreated}
              forcedItemType="sweet"
            />
          </div>

          {/* Recent Orders List - Mobile: Below form, Desktop: 1/4 sidebar */}
          <div className="order-2 lg:col-span-1 lg:overflow-y-auto">
            <div className="lg:sticky lg:top-4">
              <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                <h3 className="text-lg font-bold text-pink-900 mb-2 text-center">
                  Recent Sweet Orders
                </h3>
                <p className="font-arabic text-sm text-center text-pink-700">
                  أحدث طلبات الحلويات
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  (Last 10 completed orders)
                </p>
              </div>

              {/* Error display */}
              {ordersError && (
                <ErrorDisplay 
                  error={ordersError}
                  onRetry={() => refreshOrders()}
                  className="mb-4"
                />
              )}
              
              {/* Offline indicator */}
              {!isOnline && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <span className="text-orange-400 text-lg mr-2">📶</span>
                    <div>
                      <p className="text-sm text-orange-800">You&apos;re offline</p>
                      <p className="text-xs font-arabic text-orange-600">غير متصل</p>
                    </div>
                  </div>
                </div>
              )}
              
              {ordersLoading ? (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <LoadingSpinner 
                    size="md" 
                    message="Loading orders..." 
                    messageAr="جاري تحميل الطلبات..."
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {recentSweetOrders.length > 0 ? (
                      recentSweetOrders.map((order) => (
                        <div key={order.id} className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-pink-400">
                          <div className="flex justify-between items-start mb-2">
                            <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs font-medium">
                              #{order.id}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              ✓ Complete
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            {order.sweet_selections ? (
                              <p className="font-semibold text-pink-700 text-xs leading-tight">
                                {formatSweetSelections(order.sweet_selections) || 'Multiple Sweets'}
                              </p>
                            ) : (
                              <p className="font-semibold text-pink-700 text-xs">
                                {order.sweet_type}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-bold text-green-600">
                              ${order.price?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(order.created_at)}
                            </span>
                          </div>

                          {order.notes && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              &quot;{order.notes}&quot;
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-4 text-center">
                        <div className="text-gray-500 mb-4">
                          <div className="text-6xl mb-2">🍯</div>
                          <p className="text-sm">No sweet orders yet</p>
                          <p className="font-arabic text-xs">لا توجد طلبات حلويات حتى الآن</p>
                        </div>
                        <button
                          onClick={refreshOrders}
                          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                        >
                          🔄 Refresh Orders
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}