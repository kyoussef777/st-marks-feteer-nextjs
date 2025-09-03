'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ButtonSpinner } from './LoadingSpinner';
import { MeatType, CheeseType, ExtraTopping } from '@/types';
import { printOrderLabel } from '@/lib/print-utils';

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


interface OrderFormProps {
  menuData: {
    feteerTypes: FeteerType[];
    sweetTypes: SweetType[];
    meatTypes: MeatType[];
    cheeseTypes: CheeseType[];
    extraToppings: ExtraTopping[];
  };
  onOrderCreated: (orderData: Record<string, unknown>) => Promise<{ id: number; [key: string]: unknown }>;
  forcedItemType?: 'feteer' | 'sweet'; // Lock the form to a specific type
}

export default function OrderForm({ menuData, onOrderCreated, forcedItemType }: OrderFormProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    item_type: (forcedItemType || 'feteer') as 'feteer' | 'sweet',
    feteer_type: '',
    sweet_type: '',
    sweet_selections: {} as Record<string, number>, // sweet name -> quantity
    meat_selection: [] as string[],
    additional_meat_selection: [] as string[],
    has_cheese: true,
    extra_nutella: false,
    selected_toppings: [] as string[], // array of selected topping names
    notes: ''
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [showMeatOptions, setShowMeatOptions] = useState(false);
  const [showExtraToppings, setShowExtraToppings] = useState(false);
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [newOrderData, setNewOrderData] = useState<{
    id: number;
    customer_name: string;
    item_type: 'feteer' | 'sweet';
    feteer_type?: string;
    sweet_type?: string;
    price: number;
  } | null>(null);

  // Memoize expensive calculations
  const calculatedPrice = useMemo(() => {
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

      // Extra toppings - calculate based on selected toppings
      formData.selected_toppings.forEach(toppingName => {
        const topping = menuData.extraToppings.find(t => t.name === toppingName);
        if (topping && topping.price) {
          price += topping.price;
        }
      });
      
      // Keep backward compatibility for extra_nutella
      if (formData.extra_nutella && !formData.selected_toppings.some(t => 
        menuData.extraToppings.some(et => et.name === t && et.name.toLowerCase().includes('nutella'))
      )) {
        price += 2.0;
      }
    } else if (formData.item_type === 'sweet') {
      // Calculate total for multiple sweets
      Object.entries(formData.sweet_selections).forEach(([sweetName, quantity]) => {
        const sweet = menuData.sweetTypes.find(s => s.item_name === sweetName);
        if (sweet && quantity > 0) {
          price += sweet.price * quantity;
        }
      });

      // Add sweet toppings cost
      formData.selected_toppings.forEach(toppingName => {
        const topping = menuData.extraToppings.find(t => t.name === toppingName);
        if (topping && topping.price) {
          // For sweets, multiply topping price by total quantity of all sweets
          const totalSweetQuantity = Object.values(formData.sweet_selections).reduce((sum, qty) => sum + qty, 0);
          price += topping.price * Math.max(1, totalSweetQuantity); // At least 1 to avoid 0 cost
        }
      });
    }

    return price;
  }, [formData, menuData]);

  // Update state when calculation changes
  useEffect(() => {
    setTotalPrice(calculatedPrice);
  }, [calculatedPrice]);

  const handleItemTypeChange = useCallback((itemType: 'feteer' | 'sweet') => {
    setFormData(prev => ({
      ...prev,
      item_type: itemType,
      feteer_type: '',
      sweet_type: '',
      sweet_selections: {},
      meat_selection: [],
      additional_meat_selection: [],
      extra_nutella: false,
      selected_toppings: []
    }));
    
    setShowMeatOptions(false);
    setShowExtraToppings(false);
  }, []);

  const handleFeteerTypeChange = useCallback((feteerType: string) => {
    setFormData(prev => ({
      ...prev,
      feteer_type: feteerType,
      meat_selection: [],
      additional_meat_selection: [],
      extra_nutella: false,
      selected_toppings: []
    }));

    setShowMeatOptions(feteerType === 'Feteer Lahma Meshakala');
    setShowExtraToppings(feteerType === 'Feteer Helw (Custard w Sugar)');
  }, []);

  const handleSweetQuantityChange = useCallback((sweetName: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      sweet_selections: {
        ...prev.sweet_selections,
        [sweetName]: Math.max(0, quantity)
      }
    }));
  }, []);

  const totalSweetQuantity = useMemo(() => {
    return Object.values(formData.sweet_selections).reduce((sum, qty) => sum + qty, 0);
  }, [formData.sweet_selections]);

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

  const handleToppingSelection = (toppingName: string) => {
    setFormData(prev => ({
      ...prev,
      selected_toppings: prev.selected_toppings.includes(toppingName)
        ? prev.selected_toppings.filter(t => t !== toppingName)
        : [...prev.selected_toppings, toppingName]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Customer name is only required for feteer orders (sweets are pre-made and don't need names)
    if (formData.item_type === 'feteer' && !formData.customer_name.trim()) {
      alert('Please fill in customer name for feteer orders');
      return;
    }
    
    if (formData.item_type === 'feteer' && !formData.feteer_type) {
      alert('Please select a feteer type');
      return;
    }
    
    if (formData.item_type === 'sweet' && totalSweetQuantity === 0) {
      alert('Please select at least one sweet');
      return;
    }

    if (formData.feteer_type === 'Feteer Lahma Meshakala' && formData.meat_selection.length === 0) {
      alert('Please select at least one meat for Feteer Lahma Meshakala');
      return;
    }

    try {
      setSubmitting(true);
      
      const orderData = {
        ...formData,
        // For sweet orders, use a generic name if customer name is empty
        customer_name: formData.customer_name.trim() || (formData.item_type === 'sweet' ? 'Sweet Customer' : ''),
        meat_selection: [...formData.meat_selection, ...formData.additional_meat_selection],
        sweet_selections: formData.item_type === 'sweet' ? JSON.stringify(formData.sweet_selections) : undefined,
        // Add selected toppings data
        extra_toppings_selected: JSON.stringify(formData.selected_toppings),
        // Keep backward compatibility - if any topping is selected, set extra_nutella to true
        extra_nutella: formData.extra_nutella || formData.selected_toppings.length > 0,
        // Sweet orders go directly to completed since they are pre-made
        status: formData.item_type === 'sweet' ? 'completed' : 'ordered'
      };

      // Use the context method to create order
      console.log('OrderForm: Creating order with data:', orderData);
      const newOrder = await onOrderCreated(orderData);
      console.log('OrderForm: Order created successfully:', newOrder);
      
      // Validate the returned order
      if (!newOrder || !newOrder.id) {
        throw new Error('Invalid order response: missing order ID');
      }
      
      // Set the new order data for the popup
      setNewOrderData({
        id: newOrder.id,
        customer_name: formData.customer_name,
        item_type: formData.item_type,
        feteer_type: formData.feteer_type || undefined,
        sweet_type: formData.item_type === 'sweet' ? Object.keys(formData.sweet_selections).join(', ') : undefined,
        price: totalPrice
      });
      
      // Show the popup
      setShowOrderPopup(true);
      
      // Reset form
      setFormData({
        customer_name: '',
        item_type: (forcedItemType || 'feteer'),
        feteer_type: '',
        sweet_type: '',
        sweet_selections: {},
        meat_selection: [],
        additional_meat_selection: [],
        has_cheese: true,
        extra_nutella: false,
      selected_toppings: [],
        notes: ''
      });
      setShowMeatOptions(false);
      setShowExtraToppings(false);
    } catch (error) {
      console.error('Error creating order:', error);
      
      // More specific error messaging
      let errorMessage = 'Failed to place order. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Authentication')) {
          errorMessage = 'Please refresh the page and log in again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          errorMessage = 'Please check all required fields and try again.';
        } else if (error.message.includes('Invalid order response')) {
          errorMessage = 'Order may have been created. Please check the orders list and refresh if needed.';
        }
      }
      
      // Additional check: if error contains successful creation indicators but still failed
      const errorString = error?.toString() || '';
      if (errorString.includes('created') || errorString.includes('success')) {
        errorMessage = 'Order was likely created successfully. Please check the orders list.';
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePopup = () => {
    setShowOrderPopup(false);
    setNewOrderData(null);
  };

  const handlePrintOrder = async () => {
    if (!newOrderData) return;
    
    try {
      setPrinting(true);
      
      // Wait for database to fully commit the order with multiple retry attempts
      let orderExists = false;
      let attempts = 0;
      const maxAttempts = 8; // Reduced from 10 to prevent hanging too long
      
      while (!orderExists && attempts < maxAttempts) {
        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const checkResponse = await fetch(`/api/orders/${newOrderData.id}`, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (checkResponse.ok) {
            const orderData = await checkResponse.json();
            if (orderData && orderData.id) {
              orderExists = true;
              break;
            }
          }
        } catch (fetchError) {
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            console.warn(`Order check attempt ${attempts + 1} timed out`);
          } else {
            console.warn(`Order check attempt ${attempts + 1} failed:`, fetchError);
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Progressive delay: 200ms, 400ms, 600ms, etc. but capped at 1s
          await new Promise(resolve => setTimeout(resolve, Math.min(200 * attempts, 1000)));
        }
      }
      
      if (!orderExists) {
        alert('Order is being processed. The label will be available shortly. Please try the Print button in the main orders list.');
        return;
      }
      
      // Additional small delay to ensure label API is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Use the shared print utility with popup and auto-close functionality
      await printOrderLabel(newOrderData.id);
    } catch (error) {
      console.error('Error printing order:', error);
      alert('Failed to print order label. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  const getFeteerNameArabic = (feteerType: string) => {
    switch (feteerType) {
      case 'Feteer Lahma Meshakala':
        return 'لحمة مشكلة';
      case 'Feteer Helw (Custard w Sugar)':
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
            <label className="block text-sm font-medium text-gray-700 mb-1" hidden={formData.item_type === 'sweet'}>
              Customer Name / اسم العميل 
              {formData.item_type === 'sweet' && (
                <span className="text-gray-500 font-normal text-xs ml-1">(Optional for sweets / اختياري للحلويات)</span>
              )}
            </label>
            <input
              type="text"
              hidden={formData.item_type === 'sweet'}
              value={formData.customer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder={formData.item_type === 'sweet' ? "Optional for sweets" : "Enter customer name"}
              required={formData.item_type === 'feteer'}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submitting || 
                // For feteer, require both name and feteer type
                (formData.item_type === 'feteer' && (!formData.customer_name.trim() || !formData.feteer_type)) ||
                // For sweets, only require at least one sweet selected
                (formData.item_type === 'sweet' && totalSweetQuantity === 0)
              }
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 rounded-lg font-bold transition-all hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <ButtonSpinner />
                  <div className="text-center">
                    <div className="text-sm">Placing Order...</div>
                    <div className="text-xs font-arabic">جاري وضع الطلب...</div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-sm">Order</div>
                  <div className="text-lg">${totalPrice.toFixed(2)}</div>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Item Type Selection - Hide when forced to specific type */}
        {!forcedItemType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Type / نوع الطلب
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => handleItemTypeChange('feteer')}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all ${
                  formData.item_type === 'feteer'
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🥞</div>
                <div className="font-semibold text-sm sm:text-base">Feteer</div>
                <div className="text-xs font-arabic text-gray-600">فطير</div>
              </button>
              <button
                type="button"
                onClick={() => handleItemTypeChange('sweet')}
                className={`p-3 sm:p-4 border-2 rounded-lg text-center transition-all ${
                  formData.item_type === 'sweet'
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-gray-200 hover:border-amber-300 hover:bg-amber-25'
                }`}
                >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🍯</div>
                <div className="font-semibold text-sm sm:text-base">Sweets</div>
                <div className="text-xs font-arabic text-gray-600">حلويات</div>
              </button>
            </div>
          </div>
        )}

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

        {/* Sweet Type Selection with Quantities */}
        {formData.item_type === 'sweet' && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Sweet Types & Quantities / أنواع الحلوى والكميات
              {totalSweetQuantity > 0 && (
                <span className="ml-2 text-orange-600 font-bold text-xs sm:text-sm">({totalSweetQuantity} items)</span>
              )}
            </label>
            <div className="space-y-2 sm:space-y-3">
              {menuData.sweetTypes.map((sweet) => {
                const quantity = formData.sweet_selections[sweet.item_name] || 0;
                return (
                  <div
                    key={sweet.id}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      quantity > 0
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {/* Mobile: Stack vertically, Desktop: Side by side */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1">
                        <div className="font-semibold text-xs sm:text-sm leading-tight">{sweet.item_name}</div>
                        <div className="text-xs text-gray-600 font-arabic mt-1">
                          {sweet.item_name_arabic}
                        </div>
                        <div className="text-sm sm:text-lg font-bold text-orange-600 mt-1">
                          ${sweet.price.toFixed(2)} each
                        </div>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-2 sm:ml-3">
                        <button
                          type="button"
                          onClick={() => handleSweetQuantityChange(sweet.item_name, quantity - 1)}
                          disabled={quantity <= 0}
                          className="w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleSweetQuantityChange(sweet.item_name, quantity + 1)}
                          className="w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {quantity > 0 && (
                      <div className="mt-2 pt-2 border-t border-orange-200">
                        <div className="flex flex-col space-y-2">
                          <div className="text-xs sm:text-sm font-bold text-orange-800">
                            Subtotal: ${(sweet.price * quantity).toFixed(2)}
                          </div>
                          
                          {/* Sweet Toppings */}
                          {menuData.extraToppings.filter(topping => 
                            topping.item_type === 'sweet' && 
                            (topping.sweet_type === sweet.item_name || topping.sweet_type === 'All Sweet Types')
                          ).length > 0 && (
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Add toppings:</div>
                              <div className="flex flex-wrap gap-1">
                                {menuData.extraToppings
                                  .filter(topping => 
                                    topping.item_type === 'sweet' && 
                                    (topping.sweet_type === sweet.item_name || topping.sweet_type === 'All Sweet Types')
                                  )
                                  .map((topping) => (
                                    <button
                                      key={topping.id}
                                      type="button"
                                      onClick={() => handleToppingSelection(topping.name)}
                                      className={`px-2 py-1 text-xs rounded-full border transition-all ${
                                        formData.selected_toppings.includes(topping.name)
                                          ? 'border-pink-500 bg-pink-100 text-pink-800'
                                          : 'border-gray-300 bg-white text-gray-700 hover:border-pink-300 hover:bg-pink-50'
                                      }`}
                                    >
                                      {topping.name} (+${topping.price.toFixed(2)})
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feteer Lahma Meshakala Configuration */}
        {showMeatOptions && (
          <div className="bg-amber-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">
              Feteer Lahma Meshakala Configuration / إعداد اللحمة المشكلة
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {/* Extra Toppings */}
          {showExtraToppings && (
            <div className="bg-orange-50 rounded-lg p-3">
              <h3 className="text-xs sm:text-sm font-semibold text-orange-900 mb-2">
                Extra Toppings / إضافات
              </h3>
              <div className="space-y-1">
                {menuData.extraToppings
                  .filter(topping => topping.feteer_type === formData.feteer_type)
                  .map((topping) => (
                    <button
                      key={topping.id}
                      type="button"
                      onClick={() => handleToppingSelection(topping.name)}
                      className={`w-full p-2 border rounded text-left text-xs transition-all ${
                        formData.selected_toppings.includes(topping.name)
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Special Notes / ملاحظات خاصة
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-xs sm:text-sm"
              rows={3}
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
              {/* Only show print button for feteer orders */}
              {newOrderData.item_type === 'feteer' && (
                <button
                  onClick={handlePrintOrder}
                  disabled={printing}
                  className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {printing ? (
                    <>
                      <ButtonSpinner />
                      <div>
                        <div>Preparing Label...</div>
                        <div className="font-arabic text-xs">جاري تحضير الملصق...</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>🖨️</span>
                      <div>
                        <div>Print Label</div>
                        <div className="font-arabic text-xs">طباعة الملصق</div>
                      </div>
                    </>
                  )}
                </button>
              )}
              
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