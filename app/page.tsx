'use client';

import { useState, useEffect } from 'react';
import OrderForm from './components/OrderForm';
import OrdersList from './components/OrdersList';

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [menuData, setMenuData] = useState({
    feteerTypes: [],
    sweetTypes: [],
    meatTypes: [],
    cheeseTypes: [],
    extraToppings: []
  });

  useEffect(() => {
    // Initialize database first
    const initializeApp = async () => {
      try {
        await fetch('/api/init', { method: 'POST' });
        await fetchMenuData();
        await fetchOrders();
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
    
    // Set up intelligent auto-refresh with exponential backoff
    let pollInterval = 5000; // Start with 5 seconds
    let consecutiveErrors = 0;
    
    const smartPoll = async () => {
      try {
        await fetchOrders();
        consecutiveErrors = 0;
        pollInterval = Math.max(5000, pollInterval - 1000); // Reduce interval on success
      } catch (error) {
        consecutiveErrors++;
        pollInterval = Math.min(30000, pollInterval + (consecutiveErrors * 2000)); // Increase on error
        console.error('Polling error:', error);
      }
    };
    
    const scheduleNextPoll = () => {
      return setTimeout(() => {
        smartPoll().then(scheduleNextPoll);
      }, pollInterval);
    };
    
    const timeoutId = scheduleNextPoll();
    return () => clearTimeout(timeoutId);
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

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=pending,in_progress');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const handleOrderUpdate = () => {
    fetchOrders();
  };

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
              <OrdersList 
                orders={orders} 
                onOrderUpdate={handleOrderUpdate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
