'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';

interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier'
  });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!loading && (!user?.isAuthenticated || user?.role !== 'admin')) {
      router.push('/');
      return;
    }
    
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const createUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ username: '', password: '', role: 'cashier' });
        setShowCreateForm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const resetDatabase = async (resetOrders: boolean, resetMenu: boolean) => {
    const confirmMessage = [];
    if (resetOrders) confirmMessage.push('delete all orders');
    if (resetMenu) confirmMessage.push('reset menu to defaults');
    
    if (!confirm(`Are you sure you want to ${confirmMessage.join(' and ')}? This cannot be undone.`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resetOrders, resetMenu }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Database reset completed: ${result.results.join(', ')}`);
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      alert('Failed to reset database');
    } finally {
      setResetting(false);
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-lg">جاري التحميل...</div>
            <div className="text-sm font-arabic">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-orange-600">Admin Panel</h1>
            <h2 className="text-xl font-arabic text-orange-500">لوحة الإدارة</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">User Management</h3>
                <p className="text-sm font-arabic text-gray-600">إدارة المستخدمين</p>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                <div className="text-center">
                  <div className="text-sm">Add User</div>
                  <div className="font-arabic text-xs">إضافة مستخدم</div>
                </div>
              </button>
            </div>

            {showCreateForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username / اسم المستخدم
                    </label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password / كلمة المرور
                    </label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role / الدور
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'cashier' })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="cashier">Cashier / كاشير</option>
                      <option value="admin">Admin / مدير</option>
                    </select>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={createUser}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <div className="text-center">
                        <div className="text-sm">Create</div>
                        <div className="font-arabic text-xs">إنشاء</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <div className="text-center">
                        <div className="text-sm">Cancel</div>
                        <div className="font-arabic text-xs">إلغاء</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{user.username}</div>
                      <div className="text-sm text-gray-600">
                        {user.role} | {user.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`px-3 py-1 rounded text-sm ${
                          user.is_active 
                            ? 'bg-orange-500 text-white hover:bg-orange-600' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Database Reset */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800">Database Reset</h3>
              <p className="text-sm font-arabic text-gray-600">إعادة تعيين قاعدة البيانات</p>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="text-yellow-800">
                  <div className="font-semibold">Warning</div>
                  <div className="font-arabic text-sm">تحذير</div>
                  <div className="text-sm mt-1">These actions cannot be undone!</div>
                </div>
              </div>

              <button
                onClick={() => resetDatabase(true, false)}
                disabled={resetting}
                className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <div className="text-center">
                  <div className="text-sm">Reset Orders Only</div>
                  <div className="font-arabic text-xs">حذف جميع الطلبات</div>
                </div>
              </button>

              <button
                onClick={() => resetDatabase(false, true)}
                disabled={resetting}
                className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <div className="text-center">
                  <div className="text-sm">Reset Menu to Defaults</div>
                  <div className="font-arabic text-xs">إعادة تعيين القائمة للافتراضي</div>
                </div>
              </button>

              <button
                onClick={() => resetDatabase(true, true)}
                disabled={resetting}
                className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <div className="text-center">
                  <div className="text-sm">Reset Everything</div>
                  <div className="font-arabic text-xs">إعادة تعيين كل شيء</div>
                </div>
              </button>

              {resetting && (
                <div className="text-center text-gray-600">
                  <div>Resetting database...</div>
                  <div className="font-arabic text-sm">جاري إعادة التعيين...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}