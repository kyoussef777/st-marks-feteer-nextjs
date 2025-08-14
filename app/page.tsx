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
    
    // Set up auto-refresh
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
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
      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-4 gap-4 lg:gap-4 h-[calc(100vh-2rem)]">
          {/* Order Form - Takes 3/4 of the space */}
          <div className="order-1 lg:order-1 lg:col-span-3 overflow-y-auto">
            <OrderForm 
              menuData={menuData} 
              onOrderCreated={handleOrderCreated}
            />
          </div>

          {/* Orders List - Takes 1/4 of the space */}
          <div className="order-2 lg:order-2 lg:col-span-1 overflow-y-auto">
            <OrdersList 
              orders={orders} 
              onOrderUpdate={handleOrderUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
