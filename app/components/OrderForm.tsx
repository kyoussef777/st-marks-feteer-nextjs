'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeteerType {
  id: number;
  item_name: string;
  item_name_arabic?: string;
  price: number;
}

interface SweetType {
  id: number;
  item_name: string;
  item_name_arabic?: string;
  price: number;
}

interface MeatType {
  id: number;
  name: string;
  name_arabic?: string;
  price: number;
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

interface OrderFormProps {
  menuData: {
    feteerTypes: FeteerType[];
    sweetTypes: SweetType[];
    meatTypes: MeatType[];
    cheeseTypes: CheeseType[];
    extraToppings: ExtraTopping[];
  };
  onOrderCreated: () => void;
}

export default function OrderForm({ menuData, onOrderCreated }: OrderFormProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    item_type: 'feteer' as 'feteer' | 'sweet',
    feteer_type: '',
    sweet_type: '',
    meat_selection: [] as string[],
    additional_meat_selection: [] as string[],
    has_cheese: true,
    extra_nutella: false,
    notes: ''
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [showMeatOptions, setShowMeatOptions] = useState(false);
  const [showExtraToppings, setShowExtraToppings] = useState(false);
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [newOrderData, setNewOrderData] = useState<{
    id: number;
    customer_name: string;
    item_type: 'feteer' | 'sweet';
    feteer_type?: string;
    sweet_type?: string;
    price: number;
  } | null>(null);

  const calculateTotalPrice = useCallback(() => {
    let price = 0;

    if (formData.item_type === 'feteer') {
      // Base feteer price
      const selectedFeteer = menuData.feteerTypes.find(
        f => f.item_name === formData.feteer_type
      );
      if (selectedFeteer) {
        price += selectedFeteer.price;
      }

      // Additional meat costs
      price += formData.additional_meat_selection.length * 2.0;

      // Extra toppings
      if (formData.extra_nutella) {
        price += 2.0;
      }
    } else if (formData.item_type === 'sweet') {
      // Base sweet price
      const selectedSweet = menuData.sweetTypes.find(
        s => s.item_name === formData.sweet_type
      );
      if (selectedSweet) {
        price += selectedSweet.price;
      }
    }

    setTotalPrice(price);
  }, [formData, menuData]);

  useEffect(() => {
    calculateTotalPrice();
  }, [formData, menuData, calculateTotalPrice]);

  const handleItemTypeChange = (itemType: 'feteer' | 'sweet') => {
    setFormData(prev => ({
      ...prev,
      item_type: itemType,
      feteer_type: '',
      sweet_type: '',
      meat_selection: [],
      additional_meat_selection: [],
      extra_nutella: false
    }));
    
    setShowMeatOptions(false);
    setShowExtraToppings(false);
  };

  const handleFeteerTypeChange = (feteerType: string) => {
    setFormData(prev => ({
      ...prev,
      feteer_type: feteerType,
      meat_selection: [],
      additional_meat_selection: [],
      extra_nutella: false
    }));

    setShowMeatOptions(feteerType === 'Mixed Meat');
    setShowExtraToppings(feteerType === 'Sweet (Custard and Sugar)');
  };

  const handleSweetTypeChange = (sweetType: string) => {
    setFormData(prev => ({
      ...prev,
      sweet_type: sweetType
    }));
  };

  const handleMeatSelection = (meatName: string, isAdditional = false) => {
    const field = isAdditional ? 'additional_meat_selection' : 'meat_selection';
    const currentSelection = formData[field];
    
    if (currentSelection.includes(meatName)) {
      setFormData(prev => ({
        ...prev,
        [field]: currentSelection.filter(m => m !== meatName)
      }));
    } else {
      if (!isAdditional && currentSelection.length >= 2) return; // Max 2 for main selection
      setFormData(prev => ({
        ...prev,
        [field]: [...currentSelection, meatName]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      alert('Please fill in customer name');
      return;
    }
    
    if (formData.item_type === 'feteer' && !formData.feteer_type) {
      alert('Please select a feteer type');
      return;
    }
    
    if (formData.item_type === 'sweet' && !formData.sweet_type) {
      alert('Please select a sweet type');
      return;
    }

    if (formData.feteer_type === 'Mixed Meat' && formData.meat_selection.length === 0) {
      alert('Please select at least one meat for Mixed Meat feteer');
      return;
    }

    try {
      const orderData = {
        ...formData,
        meat_selection: [...formData.meat_selection, ...formData.additional_meat_selection],
        status: 'pending'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Set the new order data for the popup
        setNewOrderData({
          id: responseData.id,
          customer_name: formData.customer_name,
          item_type: formData.item_type,
          feteer_type: formData.feteer_type || undefined,
          sweet_type: formData.sweet_type || undefined,
          price: totalPrice
        });
        
        // Show the popup
        setShowOrderPopup(true);
        
        // Reset form
        setFormData({
          customer_name: '',
          item_type: 'feteer',
          feteer_type: '',
          sweet_type: '',
          meat_selection: [],
          additional_meat_selection: [],
          has_cheese: true,
          extra_nutella: false,
          notes: ''
        });
        setShowMeatOptions(false);
        setShowExtraToppings(false);
        onOrderCreated();
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to place order. Please try again.');
    }
  };

  const handleClosePopup = () => {
    setShowOrderPopup(false);
    setNewOrderData(null);
  };

  const handlePrintOrder = async () => {
    if (!newOrderData) return;
    
    try {
      // Open the PDF label in a new window
      const labelUrl = `/api/orders/${newOrderData.id}/label`;
      const printWindow = window.open(labelUrl, '_blank');
      
      if (printWindow) {
        // Wait for the PDF to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        // Fallback: direct download if popup blocked
        window.location.href = labelUrl;
      }
    } catch (error) {
      console.error('Error printing order:', error);
      alert('Failed to print order label');
    }
  };

  const getFeteerNameArabic = (feteerType: string) => {
    switch (feteerType) {
      case 'Mixed Meat':
        return 'لحمة مشكلة';
      case 'Sweet (Custard and Sugar)':
        return 'حلو (كسترد وسكر)';
      case 'Feteer Meshaltet (Plain)':
        return 'فطير مشلتت سادة';
      default:
        return 'فطير';
    }
  };

  const getSweetNameArabic = (sweetType: string) => {
    const sweet = menuData.sweetTypes.find(s => s.item_name === sweetType);
    return sweet?.item_name_arabic || 'حلوى';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h2 className="text-xl font-bold text-amber-900 mb-4 text-center">
        Place Your Order
        <span className="block text-sm font-arabic text-amber-700">اطلب طلبك</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Top Row: Customer Name and Submit Button */}
        <div className="grid grid-cols-4 gap-4 items-end">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name / اسم العميل
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Enter customer name"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={!formData.customer_name.trim() || (formData.item_type === 'feteer' && !formData.feteer_type) || (formData.item_type === 'sweet' && !formData.sweet_type)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 rounded-lg font-bold transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-center">
                <div className="text-sm">Order</div>
                <div className="text-lg">${totalPrice.toFixed(2)}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Item Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Order Type / نوع الطلب
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleItemTypeChange('feteer')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                formData.item_type === 'feteer'
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
              }`}
            >
              <div className="text-2xl mb-2">🥞</div>
              <div className="font-semibold">Feteer</div>
              <div className="text-xs font-arabic text-gray-600">فطير</div>
            </button>
            <button
              type="button"
              onClick={() => handleItemTypeChange('sweet')}
              className={`p-4 border-2 rounded-lg text-center transition-all ${
                formData.item_type === 'sweet'
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
              }`}
            >
              <div className="text-2xl mb-2">🍯</div>
              <div className="font-semibold">Sweets</div>
              <div className="text-xs font-arabic text-gray-600">حلويات</div>
            </button>
          </div>
        </div>

        {/* Feteer Type Selection */}
        {formData.item_type === 'feteer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feteer Type / نوع الفطير
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {menuData.feteerTypes.map((feteer) => (
                <button
                  key={feteer.id}
                  type="button"
                  onClick={() => handleFeteerTypeChange(feteer.item_name)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    formData.feteer_type === feteer.item_name
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
                  }`}
                >
                  <div className="font-semibold text-sm leading-tight">{feteer.item_name}</div>
                  <div className="text-xs text-gray-600 font-arabic mt-1">
                    {feteer.item_name_arabic}
                  </div>
                  <div className="text-lg font-bold text-amber-600 mt-1">
                    ${feteer.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sweet Type Selection */}
        {formData.item_type === 'sweet' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sweet Type / نوع الحلوى
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {menuData.sweetTypes.map((sweet) => (
                <button
                  key={sweet.id}
                  type="button"
                  onClick={() => handleSweetTypeChange(sweet.item_name)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    formData.sweet_type === sweet.item_name
                      ? 'border-orange-500 bg-orange-50 text-orange-900'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                  }`}
                >
                  <div className="font-semibold text-sm leading-tight">{sweet.item_name}</div>
                  <div className="text-xs text-gray-600 font-arabic mt-1">
                    {sweet.item_name_arabic}
                  </div>
                  <div className="text-lg font-bold text-orange-600 mt-1">
                    ${sweet.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mixed Meat Configuration */}
        {showMeatOptions && (
          <div className="bg-amber-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">
              Mixed Meat Configuration / إعداد اللحمة المشكلة
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cheese Option */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheese / الجبنة
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, has_cheese: true }))}
                    className={`flex-1 px-2 py-1 rounded text-xs border-2 transition-all ${
                      formData.has_cheese
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    ✅ With
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, has_cheese: false }))}
                    className={`flex-1 px-2 py-1 rounded text-xs border-2 transition-all ${
                      !formData.has_cheese
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    ❌ No
                  </button>
                </div>
              </div>

              {/* Main Meat Selection (Max 2) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Meats (Up to 2) / اللحوم ({formData.meat_selection.length}/2)
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {menuData.meatTypes.map((meat) => (
                    <button
                      key={meat.id}
                      type="button"
                      onClick={() => handleMeatSelection(meat.name)}
                      disabled={!formData.meat_selection.includes(meat.name) && formData.meat_selection.length >= 2}
                      className={`p-2 border rounded text-xs transition-all ${
                        formData.meat_selection.includes(meat.name)
                          ? 'border-amber-500 bg-amber-100 text-amber-900'
                          : formData.meat_selection.length >= 2
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <div className="font-medium">{meat.name}</div>
                      <div className="text-xs font-arabic">{meat.name_arabic}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Meats (if 2 main meats selected) */}
              {!!(formData.meat_selection.length >= 2) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Extra Meats (+$2.00) / لحوم إضافية
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {menuData.meatTypes.map((meat) => (
                      <button
                        key={`additional-${meat.id}`}
                        type="button"
                        onClick={() => handleMeatSelection(meat.name, true)}
                        className={`p-2 border rounded text-xs transition-all ${
                          formData.additional_meat_selection.includes(meat.name)
                            ? 'border-orange-500 bg-orange-100 text-orange-900'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <div className="font-medium">{meat.name}</div>
                        <div className="text-xs text-orange-600 font-bold">+$2</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Row: Extra Toppings and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Extra Toppings */}
          {showExtraToppings && (
            <div className="bg-orange-50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-orange-900 mb-2">
                Extra Toppings / إضافات
              </h3>
              <div className="space-y-1">
                {menuData.extraToppings
                  .filter(topping => topping.feteer_type === formData.feteer_type)
                  .map((topping) => (
                    <button
                      key={topping.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, extra_nutella: !prev.extra_nutella }))}
                      className={`w-full p-2 border rounded text-left text-xs transition-all ${
                        formData.extra_nutella
                          ? 'border-orange-500 bg-orange-100 text-orange-900'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{topping.name}</div>
                          <div className="font-arabic">{topping.name_arabic}</div>
                        </div>
                        <div className="text-orange-600 font-bold">
                          +${topping.price.toFixed(2)}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className={showExtraToppings ? '' : 'lg:col-span-2'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Notes / ملاحظات خاصة
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              rows={2}
              placeholder="Any special instructions..."
            />
          </div>
        </div>
      </form>

      {/* Order Success Popup */}
      {showOrderPopup && newOrderData && (
        <div className="fixed inset-0 bg-gray-50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 m-4 max-w-md w-full animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-green-600 mb-1">Order Placed Successfully!</h3>
              <p className="font-arabic text-lg text-green-700 font-semibold">تم تأكيد الطلب بنجاح!</p>
            </div>

            {/* Order Details */}
            <div className="bg-amber-50 rounded-lg p-4 mb-6 border-2 border-amber-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">Order Number</div>
                  <div className="font-arabic text-xs text-amber-700">رقم الطلب</div>
                  <div className="text-2xl font-bold text-amber-900">#{newOrderData.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Price</div>
                  <div className="font-arabic text-xs text-amber-700">إجمالي السعر</div>
                  <div className="text-2xl font-bold text-amber-900">${newOrderData.price.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-amber-200">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Customer</div>
                  <div className="font-arabic text-xs text-amber-700">اسم العميل</div>
                  <div className="text-lg font-bold text-gray-900">{newOrderData.customer_name}</div>
                </div>
                
                <div className="mt-3">
                  <div className="text-sm text-gray-600 text-center">Order Type</div>
                  <div className="font-arabic text-xs text-amber-700 text-center">نوع الطلب</div>
                  <div className="text-center">
                    <div className="text-md font-semibold text-gray-900">
                      {newOrderData.item_type === 'feteer' ? newOrderData.feteer_type : newOrderData.sweet_type}
                    </div>
                    <div className="font-arabic text-sm text-amber-800 font-bold">
                      {newOrderData.item_type === 'feteer' 
                        ? getFeteerNameArabic(newOrderData.feteer_type || '') 
                        : getSweetNameArabic(newOrderData.sweet_type || '')
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintOrder}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>🖨️</span>
                <div>
                  <div>Print Label</div>
                  <div className="font-arabic text-xs">طباعة الملصق</div>
                </div>
              </button>
              
              <button
                onClick={handleClosePopup}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <div>
                  <div>Close</div>
                  <div className="font-arabic text-xs">إغلاق</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}