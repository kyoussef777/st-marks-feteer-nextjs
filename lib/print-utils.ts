/**
 * Shared utility functions for printing order labels
 * Includes Apple device detection and AirPrint compatibility
 */

/**
 * Detects if the user is on an Apple device (iPhone, iPad, Mac)
 */
const isAppleDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('iphone') || 
         userAgent.includes('ipad') || 
         userAgent.includes('macintosh') ||
         userAgent.includes('mac os');
};

/**
 * Detects if the user is on a mobile device
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Prints an order label optimized for Apple devices with AirPrint support
 * Uses the same PDF but with Apple-optimized printing behavior
 * @param orderId - The order ID to print
 * @returns Promise that resolves when print operation is initiated
 */
const printAppleOptimized = async (orderId: number): Promise<void> => {
  // Use the same PDF label format
  const labelUrl = `/api/orders/${orderId}/label`;
  
  if (isMobileDevice()) {
    // On mobile devices (iPhone/iPad), open in a new tab for better AirPrint experience
    const printWindow = window.open(labelUrl, '_blank');
    if (printWindow) {
      // Wait for PDF to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1500); // Longer delay for PDF loading on mobile
      };
    } else {
      // Fallback to direct navigation if popup blocked
      window.location.href = labelUrl;
    }
  } else {
    // On desktop Mac, use standard popup but with optimized timing for AirPrint
    const printWindow = window.open(labelUrl, '_blank', 'width=800,height=600,scrollbars=yes');
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus(); // Ensure window has focus for AirPrint
          printWindow.print();
          
          // Better cleanup for Mac - wait for print dialog to appear
          setTimeout(() => {
            try {
              printWindow.close();
            } catch {
              console.log('Auto-close blocked by browser, window will remain open');
            }
          }, 8000);
          
          // Listen for print completion
          printWindow.addEventListener('afterprint', () => {
            setTimeout(() => {
              try {
                printWindow.close();
              } catch {
                console.log('Auto-close after print blocked by browser');
              }
            }, 1000);
          });
        }, 2000); // Slightly longer delay for better Mac experience
      };
    } else {
      // Fallback: direct download if popup blocked
      window.location.href = labelUrl;
    }
  }
};

/**
 * Prints an order label with popup and auto-close functionality
 * @param orderId - The order ID to print
 * @param setLoadingState - Optional function to set loading state
 * @returns Promise that resolves when print operation is initiated
 */
export const printOrderLabel = async (
  orderId: number,
  setLoadingState?: (loading: boolean) => void
): Promise<void> => {
  try {
    if (setLoadingState) {
      setLoadingState(true);
    }
    
    // First check if the order exists
    const checkResponse = await fetch(`/api/orders/${orderId}`);
    if (!checkResponse.ok) {
      alert('Order not found. Please refresh and try again.');
      return;
    }
    
    // Use Apple-optimized printing for Apple devices
    if (isAppleDevice()) {
      await printAppleOptimized(orderId);
      return;
    }
    
    // Standard PDF printing for other devices
    const labelUrl = `/api/orders/${orderId}/label`;
    const printWindow = window.open(labelUrl, '_blank', 'width=800,height=600');
    
    if (printWindow) {
      // Wait for the PDF to load, then trigger print and auto-close
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          
          // Auto-close after printing with multiple fallback methods
          setTimeout(() => {
            try {
              printWindow.close();
            } catch {
              console.log('Auto-close blocked by browser, window will remain open');
            }
          }, 7000); // 7 seconds delay to ensure print dialog has appeared
          
          // Listen for print events to close immediately after printing
          printWindow.addEventListener('afterprint', () => {
            setTimeout(() => {
              try {
                printWindow.close();
              } catch {
                console.log('Auto-close blocked by browser');
              }
            }, 500);
          });
          
          // Fallback: Focus back to main window
          setTimeout(() => {
            window.focus();
          }, 8000);
        }, 1000);
      };
    } else {
      // Fallback: direct download if popup blocked
      window.location.href = labelUrl;
    }
  } catch (error) {
    console.error('Error printing label:', error);
    alert('Failed to print label');
  } finally {
    if (setLoadingState) {
      setLoadingState(false);
    }
  }
};