// Centralized TypeScript interfaces and types for the application

export interface Order {
  id: number;
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  item_name?: string;
  item_name_arabic?: string;
  feteer_type?: string | null;
  sweet_type?: string | null;
  meat_selection?: string | null;
  cheese_selection?: string | null;
  has_cheese?: boolean;
  extra_nutella?: boolean;
  notes?: string | null;
  sweet_selections?: string | null; // JSON string for multiple sweets with quantities
  status: 'pending' | 'in_progress' | 'completed' | 'delivered';
  order_date?: string;
  created_at?: Date;
  price?: number;
}

export interface CreateOrderData {
  customer_name: string;
  item_type: 'feteer' | 'sweet';
  feteer_type?: string | null;
  sweet_type?: string | null;
  meat_selection?: string | null;
  cheese_selection?: string | null;
  has_cheese?: boolean;
  extra_nutella?: boolean;
  notes?: string | null;
  sweet_selections?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'delivered';
  price?: number;
}

export interface MenuConfig {
  id: number;
  category: 'feteer' | 'sweet';
  item_name: string;
  item_name_arabic: string;
  price: number;
  available: boolean;
}

export interface MeatType {
  id: number;
  name: string;
  name_arabic: string;
  price: number;
  available: boolean;
}

export interface CheeseType {
  id: number;
  name: string;
  name_arabic: string;
  price: number;
  available: boolean;
}

export interface ExtraTopping {
  id: number;
  name: string;
  name_arabic: string;
  price: number;
  available: boolean;
}

export interface SweetSelection {
  id: number;
  name: string;
  name_arabic: string;
  price: number;
  quantity: number;
}

export interface AuthUser {
  username: string;
  isAuthenticated: boolean;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface DatabaseQueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface OrderFormData {
  customerName: string;
  itemType: 'feteer' | 'sweet';
  selectedItem: string;
  selectedMeats: string[];
  selectedCheeses: string[];
  extraToppings: string[];
  sweetSelections: SweetSelection[];
  specialInstructions: string;
}

export interface AnalyticsData {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topItems: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

// Type guards
export const isOrder = (obj: any): obj is Order => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'number' &&
         typeof obj.customer_name === 'string' &&
         ['feteer', 'sweet'].includes(obj.item_type);
};

export const isMenuConfig = (obj: any): obj is MenuConfig => {
  return obj && typeof obj === 'object' &&
         typeof obj.id === 'number' &&
         ['feteer', 'sweet'].includes(obj.category);
};