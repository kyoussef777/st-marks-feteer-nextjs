'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { toZonedTime, format } from 'date-fns-tz';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Analytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  popularItems: { [key: string]: number };
  topCustomers: { [key: string]: number };
  dailyStats: { date: string; orders: number; revenue: number }[];
  statusBreakdown: { [key: string]: number };
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
    fetchAllOrders();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics?days=1');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setAllOrders(data);
      }
    } catch (error) {
      console.error('Error fetching all orders:', error);
    }
  };

  const downloadCSV = (itemType: string) => {
    const url = `/api/orders/export?format=csv&item_type=${itemType}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${itemType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSweetSelections = (sweetSelections: string | undefined) => {
    if (!sweetSelections) return '';
    try {
      const selections = JSON.parse(sweetSelections);
      return Object.entries(selections)
        .filter(([_, quantity]) => (quantity as number) > 0)
        .map(([sweetName, quantity]) => `${sweetName} (${quantity})`)
        .join(', ');
    } catch (error) {
      return sweetSelections;
    }
  };

  const formatDateTime = (dateString: string) => {
    return format(toZonedTime(new Date(dateString), 'America/New_York'), 'MMM d, yyyy h:mm a', { timeZone: 'America/New_York' });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="font-arabic-heading text-sm sm:text-base">
          لوحة التحليلات - فطير وحلويات
        </p>
      </div>

      {/* Date Range Selector and Export Dropdown */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
        <div className="flex bg-white rounded-lg shadow-md p-1">
          <button
            className="bg-amber-600 text-white shadow-md px-4 sm:px-6 py-2 rounded-md"
          >
            <div className="text-center">
              <div className="text-sm sm:text-base">Today</div>
              <div className="font-arabic text-xs sm:text-sm">اليوم</div>
            </div>
          </button>
        </div>
        
        {/* Export Dropdown */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            className="w-full sm:w-auto bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            📊 Export Orders
            <span className={`transform transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {showExportDropdown && (
            <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-2 bg-white rounded-lg shadow-xl border border-gray-200 w-full sm:min-w-[400px] lg:min-w-[800px] z-50">
              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">Export All Orders</h3>
                  <button
                    onClick={() => setShowExportDropdown(false)}
                    className="text-gray-500 hover:text-gray-700 text-lg"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Download Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3 sm:mb-4">
                  <button
                    onClick={() => downloadCSV('all')}
                    className="bg-blue-600 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-blue-700 transition-colors flex-1"
                  >
                    📊 All Orders CSV
                  </button>
                  <button
                    onClick={() => downloadCSV('feteer')}
                    className="bg-amber-600 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-amber-700 transition-colors flex-1"
                  >
                    🥞 Feteer Only CSV
                  </button>
                  <button
                    onClick={() => downloadCSV('sweet')}
                    className="bg-pink-600 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-pink-700 transition-colors flex-1"
                  >
                    🍯 Sweets Only CSV
                  </button>
                </div>
                
                {/* Orders Table - Mobile Responsive */}
                <div className="max-h-64 sm:max-h-96 overflow-y-auto border rounded">
                  {/* Mobile Card View */}
                  <div className="block sm:hidden">
                    {allOrders.map((order) => (
                      <div key={order.id} className="border-b p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-sm">#{order.id} - {order.customer_name}</div>
                            <div className="text-xs text-gray-600">{formatDateTime(order.created_at)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm">${order.price.toFixed(2)}</div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.item_type === 'feteer' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {order.item_type === 'feteer' ? '🥞 Feteer' : '🍯 Sweet'}
                          </span>
                          <div className="text-xs text-gray-600 max-w-[50%] truncate">
                            {order.item_type === 'feteer' 
                              ? order.feteer_type 
                              : order.sweet_selections 
                                ? formatSweetSelections(order.sweet_selections) || 'Multiple Sweets'
                                : order.sweet_type
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                    {allOrders.length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No orders found
                      </div>
                    )}
                  </div>
                  
                  {/* Desktop Table View */}
                  <table className="w-full text-sm hidden sm:table">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Customer</th>
                        <th className="px-2 py-2 text-left">Type</th>
                        <th className="px-2 py-2 text-left lg:table-cell">Item</th>
                        <th className="px-2 py-2 text-left">Price</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-left hidden lg:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map((order) => (
                        <tr key={order.id} className="border-t hover:bg-gray-50">
                          <td className="px-2 py-2 font-medium">#{order.id}</td>
                          <td className="px-2 py-2 truncate max-w-[100px]">{order.customer_name}</td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              order.item_type === 'feteer' 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {order.item_type === 'feteer' ? '🥞 F' : '🍯 S'}
                            </span>
                          </td>
                          <td className="px-2 py-2 hidden lg:table-cell truncate max-w-[150px]">
                            {order.item_type === 'feteer' 
                              ? order.feteer_type 
                              : order.sweet_selections 
                                ? formatSweetSelections(order.sweet_selections) || 'Multiple Sweets'
                                : order.sweet_type
                            }
                          </td>
                          <td className="px-2 py-2 font-medium">${order.price.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <span className={`px-1 py-1 rounded text-xs ${
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {order.status === 'pending' ? 'P' : order.status === 'in_progress' ? 'IP' : 'C'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-600 hidden lg:table-cell">
                            {formatDateTime(order.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-500 hidden sm:block">
                      No orders found
                    </div>
                  )}
                </div>
                
                <div className="mt-3 sm:mt-4 text-xs text-gray-500 text-center">
                  Total: {allOrders.length} orders • Revenue: ${allOrders.reduce((sum, order) => sum + order.price, 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <MetricCard
          title="Total Orders"
          titleAr="إجمالي الطلبات"
          value={analytics.totalOrders.toString()}
          icon="📊"
          color="blue"
        />
        <MetricCard
          title="Total Revenue"
          titleAr="إجمالي الإيرادات"
          value={`$${analytics.totalRevenue.toFixed(2)}`}
          icon="💰"
          color="green"
        />
        <MetricCard
          title="Average Order"
          titleAr="متوسط الطلب"
          value={`$${analytics.averageOrderValue.toFixed(2)}`}
          icon="📈"
          color="purple"
        />
        <MetricCard
          title="Completion Rate"
          titleAr="معدل الإنجاز"
          value={`${analytics.totalOrders > 0 ? ((analytics.statusBreakdown.completed || 0) / analytics.totalOrders * 100).toFixed(1) : '0'}%`}
          icon="✅"
          color="amber"
        />
      </div>

      {/* Charts and Tables */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Popular Items */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Popular Items (Feteer & Sweets)
            <span className="block text-sm sm:text-lg font-arabic text-gray-600">الأصناف الأكثر طلباً - فطير وحلويات</span>
          </h2>
          <div className="space-y-2 sm:space-y-4">
            {Object.entries(analytics.popularItems)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([item, count]) => (
                <div key={item} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">{item}</span>
                  <div className="flex items-center">
                    <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2 mr-2 sm:mr-3">
                      <div 
                        className="bg-amber-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analytics.popularItems))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm sm:text-lg font-bold text-amber-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Top Customers
            <span className="block text-sm sm:text-lg font-arabic text-gray-600">أفضل العملاء</span>
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics.topCustomers)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([customer, count]) => (
                <div key={customer} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">{customer}</span>
                  <div className="flex items-center">
                    <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2 mr-2 sm:mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analytics.topCustomers))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm sm:text-lg font-bold text-blue-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Order Status
            <span className="block text-sm sm:text-lg font-arabic text-gray-600">حالة الطلبات</span>
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics.statusBreakdown).map(([status, count]) => {
              const percentage = (count / analytics.totalOrders * 100).toFixed(1);
              const colors = {
                pending: 'bg-yellow-500',
                in_progress: 'bg-blue-500',
                completed: 'bg-green-500'
              };
              
              return (
                <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900 capitalize">{status.replace('_', ' ')}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className={`h-2 rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-gray-700">{count} ({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Performance Chart */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Daily Performance
            <span className="block text-sm sm:text-lg font-arabic text-gray-600">الأداء اليومي</span>
          </h2>
          <div style={{ height: '250px' }} className="sm:h-[300px]">
            <Line
              data={{
                labels: analytics.dailyStats.map(day => 
                  format(toZonedTime(new Date(day.date), 'America/New_York'), 'MMM d', { timeZone: 'America/New_York' })
                ),
                datasets: [
                  {
                    label: 'Orders',
                    data: analytics.dailyStats.map(day => day.orders),
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                  },
                  {
                    label: 'Revenue ($)',
                    data: analytics.dailyStats.map(day => day.revenue),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    display: true,
                    title: {
                      display: true,
                      text: 'Date'
                    }
                  },
                  y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: {
                      display: true,
                      text: 'Orders'
                    },
                  },
                  y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                      display: true,
                      text: 'Revenue ($)'
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, titleAr, value, icon, color }: {
  title: string;
  titleAr: string;
  value: string;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-600',
    green: 'border-green-500 text-green-600',
    purple: 'border-purple-500 text-purple-600',
    amber: 'border-amber-500 text-amber-600'
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-3 sm:p-6 border-l-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{title}</h3>
          <p className="text-xs sm:text-sm font-arabic text-gray-600">{titleAr}</p>
        </div>
        <span className="text-xl sm:text-3xl ml-2">{icon}</span>
      </div>
      <div className="mt-2 sm:mt-3">
        <span className="text-lg sm:text-3xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}