/**
 * Shared utility functions for printing order labels
 */

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
    
    // Open the PDF label in a new window
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