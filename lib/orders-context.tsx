'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { dataSync } from './data-sync';
import type { Order } from '@/types';

interface OrdersContextType {
  allOrders: Order[];
  orderedOrders: Order[];
  completedOrders: Order[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: number, status: string) => Promise<void>;
  deleteOrder: (orderId: number) => Promise<void>;
  lastUpdated: number;
  isOnline: boolean;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isOnline, setIsOnline] = useState(true);
  
  // Refs for managing async operations
  const refreshInProgress = useRef(false);
  const mounted = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state with memoization
  const orderedOrders = allOrders.filter(order => order.status === 'ordered');
  const completedOrders = allOrders.filter(order => order.status === 'completed');
  
  console.log('OrdersContext state:', {
    allOrders: allOrders.length,
    orderedOrders: orderedOrders.length,
    completedOrders: completedOrders.length,
    loading,
    error,
    isOnline
  });

  // Main refresh function
  const refreshOrders = useCallback(async (showLoading = true) => {
    if (refreshInProgress.current || !mounted.current) return;
    
    try {
      refreshInProgress.current = true;
      
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      console.log('OrdersContext: Fetching orders...');
      const orders = await dataSync.fetchOrders();
      
      if (!mounted.current) return;
      
      console.log('OrdersContext: Successfully fetched', orders.length, 'orders');
      setAllOrders(orders);
      setLastUpdated(Date.now());
      setIsOnline(true);
      
    } catch (error) {
      if (!mounted.current) return;
      
      console.error('Error refreshing orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch orders';
      setError(errorMessage);
      
      // If it's a network error, mark as offline
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setIsOnline(false);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        refreshInProgress.current = false;
      }
    }
  }, []);

  const createOrder = useCallback(async (orderData: Partial<Order>) => {
    try {
      console.log('OrdersContext: Creating order:', orderData);
      setError(null);
      
      const newOrder = await dataSync.createOrder(orderData);
      console.log('OrdersContext: Order created:', newOrder);
      
      if (!mounted.current) return newOrder;
      
      // Optimistic update: add the new order immediately
      setAllOrders(prev => [newOrder, ...prev]);
      setLastUpdated(Date.now());
      
      // Background refresh to ensure consistency (no loading state)
      refreshOrders(false);
      
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create order';
      setError(errorMessage);
      throw error;
    }
  }, [refreshOrders]);

  const updateOrderStatus = useCallback(async (orderId: number, status: string) => {
    const originalOrders = allOrders;
    
    try {
      console.log('OrdersContext: Updating order status:', orderId, status);
      setError(null);
      
      // Optimistic update
      setAllOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
      setLastUpdated(Date.now());
      
      await dataSync.updateOrderStatus(orderId, status);
      
      if (!mounted.current) return;
      
      // Background refresh to ensure consistency
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        if (mounted.current) {
          refreshOrders(false);
        }
      }, 500);
      
    } catch (error) {
      if (!mounted.current) return;
      
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update order';
      setError(errorMessage);
      
      // Revert optimistic update on error
      setAllOrders(originalOrders);
      throw error;
    }
  }, [allOrders, refreshOrders]);

  const deleteOrder = useCallback(async (orderId: number) => {
    const originalOrders = allOrders;
    
    try {
      console.log('OrdersContext: Deleting order:', orderId);
      setError(null);
      
      // Optimistic update: remove the order immediately
      setAllOrders(prev => prev.filter(order => order.id !== orderId));
      setLastUpdated(Date.now());
      
      await dataSync.deleteOrder(orderId);
      
      if (!mounted.current) return;
      
      // Background refresh to ensure consistency
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        if (mounted.current) {
          refreshOrders(false);
        }
      }, 500);
      
    } catch (error) {
      if (!mounted.current) return;
      
      console.error('Error deleting order:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete order';
      setError(errorMessage);
      
      // Revert optimistic update on error
      setAllOrders(originalOrders);
      throw error;
    }
  }, [allOrders, refreshOrders]);

  // Component cleanup
  useEffect(() => {
    mounted.current = true;
    
    return () => {
      mounted.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, []);
  
  // Initial load
  useEffect(() => {
    const initializeOrders = async () => {
      try {
        console.log('OrdersContext: Initializing...');
        // Small delay to ensure auth context is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (mounted.current) {
          await refreshOrders();
          console.log('OrdersContext: Initialization complete');
        }
      } catch (error) {
        console.error('OrdersContext: Initialization failed', error);
      }
    };
    
    initializeOrders();
  }, [refreshOrders]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError(null);
      // Refresh data when coming back online
      if (!refreshInProgress.current && mounted.current) {
        refreshOrders(false);
      }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshOrders]);

  // Periodic refresh every 30 seconds (only when not loading and online)
  useEffect(() => {
    if (loading || !isOnline) return;
    
    const interval = setInterval(() => {
      if (mounted.current && !refreshInProgress.current && isOnline) {
        console.log('OrdersContext: Background refresh');
        refreshOrders(false); // Background refresh without loading state
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshOrders, loading, isOnline]);

  // Listen for visibility changes with debouncing
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted.current && isOnline) {
        // Debounce visibility change to avoid rapid refreshes
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
        visibilityTimeoutRef.current = setTimeout(() => {
          if (mounted.current && !refreshInProgress.current) {
            console.log('OrdersContext: Visibility refresh');
            refreshOrders(false);
          }
        }, 1000); // 1 second debounce
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [refreshOrders, isOnline]);

  const value: OrdersContextType = {
    allOrders,
    orderedOrders,
    completedOrders,
    loading,
    error,
    refreshOrders,
    createOrder,
    updateOrderStatus,
    deleteOrder,
    lastUpdated,
    isOnline
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}