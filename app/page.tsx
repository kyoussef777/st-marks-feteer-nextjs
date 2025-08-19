'use client';

import { useState, useEffect } from 'react';
import OrderForm from './components/OrderForm';
import OrdersList from './components/OrdersList';
import LoadingSpinner from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorBoundary';
import { useOrders } from '@/lib/orders-context';

export default function Home() {
  const { 
    orderedOrders, 
    loading: ordersLoading, 
    error: ordersError,
    createOrder, 
    refreshOrders,
    isOnline 
  } = useOrders();
  
  console.log('Home page - orderedOrders:', orderedOrders.length, orderedOrders);
  console.log('Home page - ordersLoading:', ordersLoading);
  console.log('Home page - ordersError:', ordersError);
  console.log('Home page - isOnline:', isOnline);
  const [menuData, setMenuData] = useState({
    feteerTypes: [],
    sweetTypes: [],
    meatTypes: [],
    cheeseTypes: [],
    extraToppings: []
  });
  const [loading, setLoading] = useState(true);

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

  // Orders fetching now handled by OrdersContext

  const handleOrderCreated = async (orderData: Record<string, unknown>) => {
    try {
      const newOrder = await createOrder(orderData);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };
  
  // Show initial loading screen for both menu and orders
  if (loading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <LoadingSpinner 
          size="xl" 
          message="Loading St. Mark&apos;s Sweets & Feteer..." 
          messageAr="جاري تحميل حلويات وفطير القديس مرقس..."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-3 lg:gap-4 min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)]">
          {/* Order Form - Mobile: Full width, Desktop: 3/4 */}
          <div className="order-1 lg:col-span-3 flex-1 lg:overflow-y-auto">
            <OrderForm 
              menuData={menuData} 
              onOrderCreated={handleOrderCreated}
            />
          </div>

          {/* Orders List - Mobile: Below form, Desktop: 1/4 sidebar */}
          <div className="order-2 lg:col-span-1 lg:overflow-y-auto">
            <div className="lg:sticky lg:top-4">
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
                  <OrdersList orders={orderedOrders} />
                  {orderedOrders.length === 0 && !ordersError && (
                    <div className="bg-white rounded-lg shadow-md p-4 text-center mt-4">
                      <button
                        onClick={refreshOrders}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        🔄 Refresh Orders
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
