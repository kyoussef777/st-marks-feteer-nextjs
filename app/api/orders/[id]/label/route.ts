import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/database-hybrid';
import jsPDF from 'jspdf';

interface OrderWithSweets {
  id: number;
  customer_name: string;
  item_type: string;
  feteer_type?: string | null;
  sweet_type?: string | null;
  sweet_selections?: string | null;
  meat_selection?: string | null;
  cheese_selection?: string | null;
  has_cheese?: boolean;
  extra_nutella?: boolean;
  notes?: string | null;
  status: string;
  created_at: Date;
  price?: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }
    
    // Try multiple times to get the order (in case of timing issues)
    let order: OrderWithSweets | undefined;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!order && attempts < maxAttempts) {
      try {
        const orderData = await getOrderById(orderId);
        order = orderData as OrderWithSweets;
        
        if (order) {
          break;
        }
      } catch (dbError) {
        console.warn(`Database query attempt ${attempts + 1} failed:`, dbError);
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }

    if (!order) {
      console.error(`Order ${orderId} not found after ${maxAttempts} attempts`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create PDF label - 62mm x 100mm thermal label
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [62, 100] // 62mm x 100mm label
    });

    // Function to sanitize text and remove Arabic characters
    const sanitizeText = (text: string): string => {
      if (!text) return '';
      
      // First, handle common replacements
      const cleanText = text
        .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '') // Remove Arabic
        .replace(/[^\x00-\x7F]/g, '') // Remove all non-ASCII characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
      
      // If the result is empty or very short, provide fallbacks
      if (!cleanText || cleanText.length < 2) {
        if (text.includes('فطير') || text.includes('Mixed') || text.includes('Sweet')) {
          return 'Feteer Order';
        }
        if (text.includes('customer') || text.length > 5) {
          return 'Customer';
        }
        return 'Item';
      }
      
      return cleanText;
    };

    // Function to wrap text to fit within label width
    const wrapText = (text: string, maxWidth: number, pdf: jsPDF): string[] => {
      if (!text) return [];
      
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = pdf.getTextWidth(testLine);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };

    // Function to add wrapped text and return new Y position
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, pdf: jsPDF, lineHeight: number): number => {
      const lines = wrapText(text, maxWidth, pdf);
      let currentY = y;
      
      for (const line of lines) {
        pdf.text(line, x, currentY);
        currentY += lineHeight;
      }
      
      return currentY;
    };

    // Set fonts
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22); // Increased from 18

    let yPos = 15;
    const margin = 8;
    const lineHeight = 9; // Adjusted for smaller label
    const maxWidth = 46; // mm - maximum width for text (62 - 2*8 margin)

    // Customer name (main title) - with wrapping
    const customerText = `#${order.id} - ${sanitizeText(order.customer_name)}`;
    yPos = addWrappedText(customerText, margin, yPos, maxWidth, pdf, lineHeight);
    yPos += lineHeight * 0.5;

    // Item type and name - with wrapping
    pdf.setFontSize(18); // Increased from 14
    let itemText = '';
    
    if (order.item_type === 'sweet') {
      if (order.sweet_selections) {
        // Handle multiple sweets
        try {
          const sweetSelections = JSON.parse(order.sweet_selections);
          const sweetsList = Object.entries(sweetSelections as Record<string, number>)
            .filter(([, quantity]) => quantity > 0)
            .map(([sweetName, quantity]) => `${sanitizeText(sweetName)} (${quantity})`)
            .join(', ');
          itemText = `SWEETS: ${sweetsList}`;
        } catch {
          itemText = `SWEET: ${sanitizeText(order.sweet_type || 'Multiple Items')}`;
        }
      } else {
        itemText = `SWEET: ${sanitizeText(order.sweet_type || '')}`;
      }
    } else {
      itemText = `FETEER: ${sanitizeText(order.feteer_type || '')}`;
    }
    
    yPos = addWrappedText(itemText, margin, yPos, maxWidth, pdf, lineHeight);
    yPos += lineHeight * 0.5;

    // Order details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(16); // Increased from 12

    // Feteer-specific details
    if (order.item_type === 'feteer' && sanitizeText(order.feteer_type || '') === 'Feteer Lahma Meshakala' && order.meat_selection) {
      const selectedMeats = order.meat_selection.split(',').map(meat => meat.trim());
      
      // Based on UI logic: first 2 meats are "default", any additional are "extra"
      const defaultMeats = selectedMeats.slice(0, 2);
      const additionalMeats = selectedMeats.slice(2);
      
      // Display default meats (first 2 selected)
      if (defaultMeats.length > 0) {
        pdf.setFont('helvetica', 'bold');
        yPos = addWrappedText('INCLUDED MEATS:', margin, yPos, maxWidth, pdf, lineHeight);
        
        pdf.setFont('helvetica', 'normal');
        const defaultMeatText = sanitizeText(defaultMeats.join(', '));
        yPos = addWrappedText(defaultMeatText, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      }
      
      // Display additional meats (beyond first 2)
      if (additionalMeats.length > 0) {
        pdf.setFont('helvetica', 'bold');
        yPos = addWrappedText('EXTRA MEATS (+$2 each):', margin, yPos, maxWidth, pdf, lineHeight);
        
        pdf.setFont('helvetica', 'normal');
        const additionalMeatText = sanitizeText(additionalMeats.join(', '));
        yPos = addWrappedText(additionalMeatText, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      }
      
      // Cheese information
      pdf.setFont('helvetica', 'normal');
      const cheeseText = order.has_cheese ? 'WITH CHEESE' : 'NO CHEESE';
      yPos = addWrappedText(cheeseText, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      yPos += lineHeight * 0.5;
    }

    // Sweet-specific details
    if (order.item_type === 'sweet') {
      pdf.setFont('helvetica', 'bold');
      
      if (order.sweet_selections) {
        try {
          const sweetSelections = JSON.parse(order.sweet_selections);
          const selections = sweetSelections as Record<string, number>;
          const totalItems = Object.values(selections).reduce((sum: number, qty: number) => sum + qty, 0);
          yPos = addWrappedText(`DESSERT ORDER (${totalItems} items)`, margin, yPos, maxWidth, pdf, lineHeight);
          
          pdf.setFont('helvetica', 'normal');
          Object.entries(selections).forEach(([sweetName, quantity]) => {
            if (quantity > 0) {
              yPos = addWrappedText(`• ${sanitizeText(sweetName)}: ${quantity}`, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
            }
          });
        } catch {
          yPos = addWrappedText('DESSERT ORDER', margin, yPos, maxWidth, pdf, lineHeight);
          pdf.setFont('helvetica', 'normal');
        }
      } else {
        yPos = addWrappedText('DESSERT ORDER', margin, yPos, maxWidth, pdf, lineHeight);
        pdf.setFont('helvetica', 'normal');
      }
      
      yPos += lineHeight * 0.5;
    }

    // Extra toppings
    if (order.extra_nutella) {
      pdf.setFont('helvetica', 'bold');
      yPos = addWrappedText('EXTRA TOPPINGS:', margin, yPos, maxWidth, pdf, lineHeight);
      
      pdf.setFont('helvetica', 'normal');
      yPos = addWrappedText('• Extra Nutella (+$2.00)', margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
      yPos += lineHeight * 0.5;
    }

    // Notes - with proper wrapping
    if (order.notes && order.notes.trim()) {
      const sanitizedNotes = sanitizeText(order.notes);
      if (sanitizedNotes) {
        pdf.setFont('helvetica', 'bold');
        yPos = addWrappedText('SPECIAL NOTES:', margin, yPos, maxWidth, pdf, lineHeight);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(14); // Increased from 11
        yPos = addWrappedText(sanitizedNotes, margin + 5, yPos, maxWidth - 5, pdf, lineHeight);
        yPos += lineHeight * 0.5;
      }
    }

    // Ensure we don't exceed the label height
    const minBottomSpace = 20; // Reserve space for price and footer
    if (yPos > 100 - minBottomSpace) {
      yPos = 100 - minBottomSpace;
    }

    // Add a separator line before the footer
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos + 5, 62 - margin, yPos + 5);
    yPos += 15;

    // Price and status at bottom
    pdf.setFontSize(18); // Increased from 14
    pdf.setFont('helvetica', 'bold');
    yPos = addWrappedText(`TOTAL: $${(order.price ?? 0).toFixed(2)}`, margin, yPos, maxWidth, pdf, lineHeight);
    
    // Timestamp (converted to EST)
    pdf.setFontSize(12); // Increased from 10
    pdf.setFont('helvetica', 'bold');
    const date = new Date(order.created_at);
    const estDate = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const timeText = `Ordered: ${estDate.toLocaleDateString()} ${estDate.toLocaleTimeString()} EST`;
    yPos = addWrappedText(timeText, margin, yPos, maxWidth, pdf, lineHeight);
    

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="label-${id}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error generating label:', error);
    return NextResponse.json({ error: 'Failed to generate label' }, { status: 500 });
  }
}

