'use client';

import { useState, useEffect } from 'react';

interface MenuItem {
  id: number;
  item_type: string;
  item_name: string;
  item_name_arabic?: string;
  price: number;
}

interface MeatType {
  id: number;
  name: string;
  name_arabic?: string;
  price: number;
  is_default: boolean;
}

interface CheeseType {
  id: number;
  name: string;
  name_arabic?: string;
  price: number;
}

interface ExtraTopping {
  id: number;
  name: string;
  name_arabic?: string;
  price: number;
  feteer_type?: string;
}

export default function MenuEditor() {
  const [feteerTypes, setFeteerTypes] = useState<MenuItem[]>([]);
  const [meatTypes, setMeatTypes] = useState<MeatType[]>([]);
  const [cheeseTypes, setCheeseTypes] = useState<CheeseType[]>([]);
  const [extraToppings, setExtraToppings] = useState<ExtraTopping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feteer');

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        setFeteerTypes(data.feteerTypes || []);
        setMeatTypes(data.meatTypes || []);
        setCheeseTypes(data.cheeseTypes || []);
        setExtraToppings(data.extraToppings || []);
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'feteer', name: 'Feteer Types', nameAr: 'أنواع الفطير', icon: '🥞' },
    { id: 'meats', name: 'Meat Types', nameAr: 'أنواع اللحوم', icon: '🥩' },
    { id: 'toppings', name: 'Extra Toppings', nameAr: 'الإضافات', icon: '🍯' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading menu data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-amber-900 mb-2">
          Menu Editor
        </h1>
        <p className="font-arabic-heading">
          محرر القائمة
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`m-2 px-6 py-3 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white text-amber-600 border-2 border-amber-600 hover:bg-amber-50'
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span className="font-medium">{tab.name}</span>
              <span className="font-arabic">{tab.nameAr}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card-enhanced rounded-xl p-6">
        {activeTab === 'feteer' && (
          <FeteerTypesEditor items={feteerTypes} onUpdate={fetchMenuData} />
        )}
        {activeTab === 'meats' && (
          <MeatTypesEditor items={meatTypes} onUpdate={fetchMenuData} />
        )}
        {activeTab === 'toppings' && (
          <ToppingsEditor items={extraToppings} onUpdate={fetchMenuData} />
        )}
      </div>
    </div>
  );
}

function FeteerTypesEditor({ items, onUpdate }: { items: MenuItem[], onUpdate: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ item_name: '', item_name_arabic: '', price: 0 });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
  };

  const handleSave = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/feteer/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (response.ok) {
        setEditingId(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`/api/menu/feteer/${id}`, { method: 'DELETE' });
        if (response.ok) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/menu/feteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, item_type: 'feteer_type' })
      });
      if (response.ok) {
        setNewItem({ item_name: '', item_name_arabic: '', price: 0 });
        setShowAddForm(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Feteer Types / أنواع الفطير</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          ➕ Add New Item
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Feteer Type</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="English Name"
              value={newItem.item_name}
              onChange={(e) => setNewItem(prev => ({ ...prev, item_name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Arabic Name / الاسم بالعربية"
              value={newItem.item_name_arabic}
              onChange={(e) => setNewItem(prev => ({ ...prev, item_name_arabic: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-arabic"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            {editingId === item.id ? (
              <EditableItemRow
                item={item}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.item_name}</h3>
                      {item.item_name_arabic && (
                        <p className="text-gray-600 font-arabic">{item.item_name_arabic}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-amber-600">${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableItemRow({ item, onSave, onCancel }: {
  item: MenuItem,
  onSave: (item: MenuItem) => void,
  onCancel: () => void
}) {
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="grid md:grid-cols-4 gap-4 items-center">
      <input
        type="text"
        value={editedItem.item_name}
        onChange={(e) => setEditedItem(prev => ({ ...prev, item_name: e.target.value }))}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      />
      <input
        type="text"
        value={editedItem.item_name_arabic || ''}
        onChange={(e) => setEditedItem(prev => ({ ...prev, item_name_arabic: e.target.value }))}
        className="px-3 py-2 border border-gray-300 rounded-lg font-arabic"
        placeholder="Arabic name"
      />
      <input
        type="number"
        step="0.01"
        value={editedItem.price}
        onChange={(e) => setEditedItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(editedItem)}
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        >
          💾 Save
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}

function MeatTypesEditor({ items, onUpdate }: { items: MeatType[], onUpdate: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ name: '', name_arabic: '', price: 0, is_default: false });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleEdit = (item: MeatType) => {
    setEditingId(item.id);
  };

  const handleSave = async (item: MeatType) => {
    try {
      const response = await fetch(`/api/menu/meats/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (response.ok) {
        setEditingId(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this meat type?')) {
      try {
        const response = await fetch(`/api/menu/meats/${id}`, { method: 'DELETE' });
        if (response.ok) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/menu/meats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (response.ok) {
        setNewItem({ name: '', name_arabic: '', price: 0, is_default: false });
        setShowAddForm(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Meat Types / أنواع اللحوم</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          ➕ Add New Meat Type
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Meat Type</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="English Name"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text"
              placeholder="Arabic Name / الاسم بالعربية"
              value={newItem.name_arabic}
              onChange={(e) => setNewItem(prev => ({ ...prev, name_arabic: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-arabic"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Extra Cost"
              value={newItem.price}
              onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newItem.is_default}
                onChange={(e) => setNewItem(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300 focus:ring-amber-500"
              />
              <span className="text-sm">Default Selection</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            {editingId === item.id ? (
              <EditableMeatRow
                item={item}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {item.name}
                        {item.is_default && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Default</span>}
                      </h3>
                      {item.name_arabic && (
                        <p className="text-gray-600 font-arabic">{item.name_arabic}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-amber-600">
                        {item.price > 0 ? `+$${item.price.toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableMeatRow({ item, onSave, onCancel }: {
  item: MeatType,
  onSave: (item: MeatType) => void,
  onCancel: () => void
}) {
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="grid md:grid-cols-5 gap-4 items-center">
      <input
        type="text"
        value={editedItem.name}
        onChange={(e) => setEditedItem(prev => ({ ...prev, name: e.target.value }))}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      />
      <input
        type="text"
        value={editedItem.name_arabic || ''}
        onChange={(e) => setEditedItem(prev => ({ ...prev, name_arabic: e.target.value }))}
        className="px-3 py-2 border border-gray-300 rounded-lg font-arabic"
        placeholder="Arabic name"
      />
      <input
        type="number"
        step="0.01"
        value={editedItem.price}
        onChange={(e) => setEditedItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
        className="px-3 py-2 border border-gray-300 rounded-lg"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={editedItem.is_default}
          onChange={(e) => setEditedItem(prev => ({ ...prev, is_default: e.target.checked }))}
          className="rounded border-gray-300 focus:ring-amber-500"
        />
        <span className="text-sm">Default</span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(editedItem)}
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        >
          💾 Save
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}


function ToppingsEditor({ items, onUpdate }: { items: ExtraTopping[], onUpdate: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ name: '', name_arabic: '', price: 0, feteer_type: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const feteerTypes = [
    'Sweet (Custard and Sugar)',
    'Mixed Meat',
    'Mixed Cheese',
    'Feteer Meshaltet (Plain)',
    'All Types'
  ];

  const handleEdit = (item: ExtraTopping) => {
    setEditingId(item.id || 0);
  };

  const handleSave = async (item: ExtraTopping) => {
    try {
      const response = await fetch(`/api/menu/toppings/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (response.ok) {
        setEditingId(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating topping:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this topping?')) {
      try {
        const response = await fetch(`/api/menu/toppings/${id}`, { method: 'DELETE' });
        if (response.ok) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error deleting topping:', error);
      }
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/menu/toppings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (response.ok) {
        setNewItem({ name: '', name_arabic: '', price: 0, feteer_type: '' });
        setShowAddForm(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding topping:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Extra Toppings / الإضافات</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary px-6 py-3 rounded-lg transition-all duration-300"
        >
          ➕ Add New Topping
        </button>
      </div>

      {showAddForm && (
        <div className="card-enhanced rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Extra Topping</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="English Name"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              className="form-input"
            />
            <input
              type="text"
              placeholder="Arabic Name / الاسم بالعربية"
              value={newItem.name_arabic}
              onChange={(e) => setNewItem(prev => ({ ...prev, name_arabic: e.target.value }))}
              className="form-input font-arabic"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Extra Cost ($)"
              value={newItem.price}
              onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="form-input"
            />
            <select
              value={newItem.feteer_type}
              onChange={(e) => setNewItem(prev => ({ ...prev, feteer_type: e.target.value }))}
              className="form-input"
            >
              <option value="">Select Feteer Type</option>
              {feteerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 btn-primary px-4 py-2 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current toppings */}
      <div className="space-y-4">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="card-enhanced rounded-lg p-4">
            {editingId === item.id ? (
              <EditableToppingRow
                item={item}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                feteerTypes={feteerTypes}
              />
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      {item.name_arabic && (
                        <p className="text-gray-600 font-arabic">{item.name_arabic}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                          For: {item.feteer_type || 'All Types'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-amber-600">+${item.price.toFixed(2)}</span>
                      <div className="text-sm text-gray-500">extra charge</div>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id!)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-12 text-gray-600 border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-6xl mb-4">🍯</div>
            <h3 className="text-xl font-semibold mb-2">No Extra Toppings Yet</h3>
            <p className="mb-2">Add your first extra topping to enhance your feteer offerings.</p>
            <p className="font-arabic">أضف أول إضافة إضافية لتحسين عروض الفطير الخاصة بك</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 btn-primary px-6 py-3 rounded-lg"
            >
              Add First Topping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableToppingRow({ item, onSave, onCancel, feteerTypes }: {
  item: ExtraTopping,
  onSave: (item: ExtraTopping) => void,
  onCancel: () => void,
  feteerTypes: string[]
}) {
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="grid md:grid-cols-5 gap-4 items-center">
      <input
        type="text"
        value={editedItem.name}
        onChange={(e) => setEditedItem(prev => ({ ...prev, name: e.target.value }))}
        className="form-input"
      />
      <input
        type="text"
        value={editedItem.name_arabic || ''}
        onChange={(e) => setEditedItem(prev => ({ ...prev, name_arabic: e.target.value }))}
        className="form-input font-arabic"
        placeholder="Arabic name"
      />
      <input
        type="number"
        step="0.01"
        value={editedItem.price}
        onChange={(e) => setEditedItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
        className="form-input"
      />
      <select
        value={editedItem.feteer_type || ''}
        onChange={(e) => setEditedItem(prev => ({ ...prev, feteer_type: e.target.value }))}
        className="form-input"
      >
        <option value="">Select Type</option>
        {feteerTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(editedItem)}
          className="flex-1 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-colors"
        >
          💾 Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}