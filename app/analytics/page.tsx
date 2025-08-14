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

  useEffect(() => {
    fetchAnalytics();
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-amber-900 mb-2">
          Analytics Dashboard
        </h1>
        <p className="font-arabic-heading">
          لوحة التحليلات - فطير وحلويات
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-white rounded-lg shadow-md p-1">
          <button
            className="bg-amber-600 text-white shadow-md px-6 py-2 rounded-md"
          >
            <div className="text-center">
              <div>Today</div>
              <div className="font-arabic">اليوم</div>
            </div>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
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
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Popular Items */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Popular Items (Feteer & Sweets)
            <span className="block text-lg font-arabic text-gray-600">الأصناف الأكثر طلباً - فطير وحلويات</span>
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics.popularItems)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([item, count]) => (
                <div key={item} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{item}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-amber-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analytics.popularItems))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-amber-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Top Customers
            <span className="block text-lg font-arabic text-gray-600">أفضل العملاء</span>
          </h2>
          <div className="space-y-4">
            {Object.entries(analytics.topCustomers)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([customer, count]) => (
                <div key={customer} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{customer}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / Math.max(...Object.values(analytics.topCustomers))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Order Status
            <span className="block text-lg font-arabic text-gray-600">حالة الطلبات</span>
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Daily Performance
            <span className="block text-lg font-arabic text-gray-600">الأداء اليومي</span>
          </h2>
          <div style={{ height: '300px' }}>
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
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm font-arabic text-gray-600">{titleAr}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}